import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from './errors';
import { hashFile } from './hashes';
import type { DatabaseBundle } from '../db';
import type { AppPaths } from '../paths';
import type { LibraryEntry, MainEvent, Platform, PortConfig, RomRecord } from '../../shared/types';

export interface LaunchDeps {
  platform: Platform;
  paths: AppPaths;
  db: DatabaseBundle;
  emit: (event: MainEvent) => void;
}

interface RunningPort {
  child: ChildProcess;
  relaunched: boolean;
  stopInitiated: boolean;
  stderrTail: string;
  startedAt: number;
}

const FUSE_ERROR_PATTERN = /error loading libfuse\.so|libfuse\.so\.\d+: cannot open shared object/i;
const MAX_SESSION_MS = 24 * 60 * 60 * 1000;

export class LaunchManager {
  private running = new Map<string, RunningPort>();
  private watchdog: NodeJS.Timeout | null = null;

  constructor(private deps: LaunchDeps) {}

  private safeEmit(event: MainEvent): void {
    try {
      this.deps.emit(event);
    } catch {
      // the window may be gone; the renderer also polls library state
    }
  }

  private emitExit(portId: string, record: RunningPort): void {
    this.running.delete(portId);
    const elapsed = Math.min(Math.max(Date.now() - record.startedAt, 0), MAX_SESSION_MS);
    if (elapsed >= 1000) {
      try {
        this.deps.db.playtime.addSession(portId, elapsed);
      } catch {
        // playtime is best-effort; never break the exit path
      }
    }
    this.safeEmit({
      type: 'launch-exit',
      portId,
      code: record.child.exitCode,
      signal: record.child.signalCode ?? null,
      failed: !record.stopInitiated && record.child.exitCode !== 0,
    });
  }

  private descendantPids(rootPid: number): number[] {
    const pids: number[] = [];
    let entries: string[];
    try {
      entries = fs.readdirSync('/proc');
    } catch {
      return pids;
    }
    for (const name of entries) {
      if (!/^\d+$/.test(name)) {
        continue;
      }
      const pid = Number(name);
      if (pid === rootPid) {
        continue;
      }
      let stat: string;
      try {
        stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
      } catch {
        continue;
      }
      const paren = stat.lastIndexOf(')');
      if (paren === -1) {
        continue;
      }
      const ppid = Number(stat.slice(paren + 2).split(' ')[1]);
      if (ppid === rootPid) {
        pids.push(pid, ...this.descendantPids(pid));
      }
    }
    return pids;
  }

  private ensureWatchdog(): void {
    if (this.watchdog) {
      return;
    }
    this.watchdog = setInterval(() => {
      for (const [portId, record] of this.running) {
        if (record.child.exitCode !== null || record.child.signalCode !== null) {
          this.emitExit(portId, record);
        }
      }
    }, 10000);
    this.watchdog.unref?.();
  }

  isRunning(portId: string): boolean {
    return this.running.has(portId);
  }

  async launch(port: PortConfig, entry: LibraryEntry): Promise<void> {
    const stale = this.running.get(port.id);
    if (stale) {
      if (stale.child.exitCode !== null || stale.child.signalCode !== null) {
        // The process died but its exit was never propagated; reap the stale
        // record and continue with the fresh launch.
        this.emitExit(port.id, stale);
      } else {
        throw new AppError(
          'ALREADY_RUNNING',
          `${port.displayName} is already running. If its window is gone, press Stop, then Play again.`,
        );
      }
    }
    if (!entry.installed) {
      throw new AppError('LAUNCH_FAILED', `${port.displayName} is not installed`);
    }
    if (port.rom.required && !entry.romStatus.linked) {
      throw new AppError(
        'ROM_NOT_ATTACHED',
        `${port.displayName} needs a valid ROM before it can launch. Select your own dumped copy.`,
      );
    }

    const rom: RomRecord | null = entry.romStatus.linked ? entry.romStatus.rom : null;
    const installPath = entry.installed.installPath;
    const executablePath = entry.installed.executablePath;
    if (!fs.existsSync(executablePath)) {
      throw new AppError(
        'EXECUTABLE_MISSING',
        `The executable is missing: ${executablePath}. Reinstall the port to repair it.`,
      );
    }

    const exeDir = path.dirname(executablePath);
    let args: string[] = [];
    if (rom) {
      switch (port.rom.handling) {
        case 'native-wizard': {
          const romBasename = path.basename(rom.sourcePath);
          const target = path.join(exeDir, romBasename);
          await this.ensureRomCopy(rom, target);
          break;
        }
        case 'copy-to-working-dir': {
          const filename = port.rom.filename ?? rom.sha1 + rom.extension;
          const target = path.join(installPath, filename);
          await this.ensureRomCopy(rom, target);
          break;
        }
        case 'cli-arg': {
          const template = port.rom.cliArg ?? '{rom}';
          args = template.split(/\s+/).map((piece) => piece.replace('{rom}', rom.cachedPath));
          break;
        }
      }
    }

    this.ensureWatchdog();
    this.spawnChild(port, executablePath, args, exeDir, rom);
  }

  private async ensureRomCopy(rom: RomRecord, target: string): Promise<void> {
    if (fs.existsSync(target)) {
      try {
        const existing = await hashFile(target);
        if (existing.sha1 === rom.sha1) {
          return;
        }
      } catch {
        // fall through and re-copy
      }
    }
    try {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(rom.cachedPath, target);
    } catch (err) {
      throw new AppError('ROM_COPY_FAILED', 'Could not stage the ROM next to the game', (err as Error).message);
    }
  }

  private spawnChild(
    port: PortConfig,
    executablePath: string,
    args: string[],
    cwd: string,
    rom: RomRecord | null,
    relaunched = false,
  ): void {
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (relaunched) {
      env.APPIMAGE_EXTRACT_AND_RUN = '1';
    }
    const child = spawn(executablePath, args, {
      cwd,
      env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const record: RunningPort = {
      child,
      relaunched,
      stopInitiated: false,
      stderrTail: '',
      startedAt: Date.now(),
    };

    child.on('error', () => {
      this.running.delete(port.id);
      this.safeEmit({
        type: 'launch-exit',
        portId: port.id,
        code: null,
        signal: null,
        failed: true,
      });
      this.safeEmit({
        type: 'launch-output',
        portId: port.id,
        stream: 'stderr',
        data: `Failed to start: ${executablePath}\n`,
      });
    });

    child.stdout?.on('data', (data: Buffer) => {
      this.safeEmit({ type: 'launch-output', portId: port.id, stream: 'stdout', data: data.toString() });
    });
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      record.stderrTail = (record.stderrTail + text).slice(-4096);
      this.safeEmit({ type: 'launch-output', portId: port.id, stream: 'stderr', data: text });
    });

    child.on('exit', (code) => {
      const isAppImage =
        this.deps.platform === 'linux' && executablePath.toLowerCase().endsWith('.appimage');
      const fuseError = FUSE_ERROR_PATTERN.test(record.stderrTail);
      if (code !== 0 && isAppImage && fuseError && !relaunched && !record.stopInitiated) {
        this.safeEmit({
          type: 'launch-output',
          portId: port.id,
          stream: 'stderr',
          data: 'FUSE not available; relaunching the AppImage in extract-and-run mode.\n',
        });
        this.safeEmit({ type: 'launch-restarted', portId: port.id });
        this.running.delete(port.id);
        this.spawnChild(port, executablePath, args, cwd, rom, true);
        return;
      }
      this.emitExit(port.id, record);
    });
    this.running.set(port.id, record);
  }

  stop(portId: string): void {
    const running = this.running.get(portId);
    if (!running) {
      return;
    }
    running.stopInitiated = true;
    if (running.child.exitCode !== null || running.child.signalCode !== null) {
      return;
    }
    // Collect descendants before any signal lands: AppImage runtimes fork the
    // payload into a new session, and once the direct child dies its
    // descendants get reparented out of reach of a ppid walk.
    const pid = running.child.pid;
    const descendants =
      pid && this.deps.platform === 'linux' ? this.descendantPids(pid) : [];
    const signalTree = (signal: NodeJS.Signals) => {
      if (pid) {
        try {
          process.kill(-pid, signal);
        } catch {
          // group may be gone; fall through to the direct kill
        }
        for (const descendant of descendants) {
          try {
            process.kill(descendant, signal);
          } catch {
            // already gone
          }
        }
      }
      try {
        running.child.kill(signal);
      } catch {
        // already dead
      }
    };
    signalTree('SIGTERM');
    const escalation = setTimeout(() => {
      const current = this.running.get(portId);
      if (
        current &&
        current.child === running.child &&
        running.child.exitCode === null &&
        running.child.signalCode === null
      ) {
        signalTree('SIGKILL');
      }
    }, 3000);
    escalation.unref?.();
  }
}

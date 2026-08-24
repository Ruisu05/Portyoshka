import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { openDatabase } from '../src/main/db';
import { createPaths } from '../src/main/paths';
import { createSettingsStore } from '../src/main/services/settings';
import { installPort } from '../src/main/services/installer';
import { extractZip } from '../src/main/services/extractor';
import { importRomForPort } from '../src/main/services/romLibrary';
import { uninstallPort } from '../src/main/services/uninstall';
import { hashFile } from '../src/main/services/hashes';
import { LaunchManager } from '../src/main/services/launcher';
import { getPort } from '../src/main/registry';
import { AppError } from '../src/main/services/errors';
import type { InstallProgress, LibraryEntry, MainEvent } from '../src/shared/types';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function expectAppError(name: string, code: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, false, 'no error was thrown');
  } catch (err) {
    check(name, err instanceof AppError && err.code === code, `got ${String(err)}`);
  }
}

async function main() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'portyoshka-smoke-'));
  const dataDir = path.join(base, 'data');
  const installRoot = path.join(base, 'install');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(installRoot, { recursive: true });

  const paths = createPaths(dataDir);
  const db = openDatabase(paths.dbFile);
  const settings = createSettingsStore(db, installRoot);

  const emit = (progress: InstallProgress) => {
    if (
      process.stdout.isTTY &&
      progress.stage === 'downloading' &&
      progress.totalBytes > 0 &&
      progress.downloadedBytes % 4194304 < 262144
    ) {
      process.stdout.write(`  download ${((progress.downloadedBytes / progress.totalBytes) * 100).toFixed(0)}%\r`);
    }
  };

  const installDeps = {
    platform: 'linux' as const,
    paths,
    db,
    getRootInstallDir: () => settings.getRootInstallDir(),
    getPortDirOverride: () => null,
    getGithubToken: () => null,
    emit,
  };

  console.log('1. zip-slip guard');
  const evilDir = path.join(base, 'evil');
  fs.mkdirSync(evilDir, { recursive: true });
  const evilZip = path.join(base, 'evil.zip');
  const { execFileSync } = await import('node:child_process');
  execFileSync('python3', [
    '-c',
    `
import zipfile, sys
z = zipfile.ZipFile('${evilZip}', 'w')
z.writestr('../escape.txt', 'pwned')
z.close()
`,
  ]);
  await expectAppError('rejects traversal entries', 'EXTRACT_FAILED', () =>
    extractZip(evilZip, path.join(evilDir, 'out')),
  );

  console.log('2. install Shipwright from GitHub');
  try {
    const installed = await installPort(installDeps, 'shipwright');
    check('DB row recorded', db.ports.getInstalled('shipwright')?.version === installed.version);
    check('executable exists', fs.existsSync(installed.executablePath), installed.executablePath);
    const mode = fs.statSync(installed.executablePath).mode & 0o111;
    check('executable bit set', mode !== 0);
    check('install under root dir', installed.installPath.startsWith(installRoot));

    console.log('3. preserveOnUpdate');
    const marker = path.join(installed.installPath, 'shipofharkinian.json');
    fs.writeFileSync(marker, '{"user":true}');
    fs.mkdirSync(path.join(installed.installPath, 'Randomizer'), { recursive: true });
    fs.writeFileSync(path.join(installed.installPath, 'Randomizer', 'seed.json'), '{}');
    const second = await installPort(installDeps, 'shipwright');
    check('user settings preserved', fs.readFileSync(path.join(second.installPath, 'shipofharkinian.json'), 'utf8') === '{"user":true}');
    check(
      'randomizer dir preserved',
      fs.existsSync(path.join(second.installPath, 'Randomizer', 'seed.json')),
    );
    check('still executable after update', fs.existsSync(second.executablePath));
  } catch (err) {
    check('shipwright install pipeline', false, String(err));
  }

  console.log('4. uninstall keep-settings round trip');
  const shipwrightPort = getPort('shipwright');
  if (shipwrightPort) {
    const installedRow = db.ports.getInstalled('shipwright');
    const marker = path.join(installedRow!.installPath, 'shipofharkinian.json');
    fs.writeFileSync(marker, '{"user":true}');
    uninstallPort(
      {
        db,
        dataDir,
        homeDir: os.homedir(),
        getRootInstallDir: () => installRoot,
      },
      shipwrightPort,
      true,
    );
    check('install dir removed', !fs.existsSync(installedRow!.installPath));
    check('DB row removed', db.ports.getInstalled('shipwright') === null);
    const backupsDir = path.join(dataDir, 'backups', 'shipwright');
    const backups = fs.readdirSync(backupsDir);
    check(
      'settings backed up',
      backups.length > 0 && fs.existsSync(path.join(backupsDir, backups[0], 'shipofharkinian.json')),
    );

    const reinstalled = await installPort(installDeps, 'shipwright');
    check(
      'settings restored on reinstall',
      fs.readFileSync(path.join(reinstalled.installPath, 'shipofharkinian.json'), 'utf8') === '{"user":true}',
    );

    uninstallPort(
      {
        db,
        dataDir,
        homeDir: os.homedir(),
        getRootInstallDir: () => installRoot,
      },
      shipwrightPort,
      false,
    );
    check('uninstall everything clears backups', !fs.existsSync(backupsDir));
    check('uninstall everything removes dir', !fs.existsSync(reinstalled.installPath));
  } else {
    check('shipwright in registry for uninstall', false);
  }

  console.log('5. ROM validation');
  const port = getPort('shipwright');
  if (port) {
    const dummy = path.join(base, 'fake.z64');
    fs.writeFileSync(dummy, Buffer.alloc(1024, 7));
    await expectAppError('rejects bad hash', 'ROM_HASH_MISMATCH', () =>
      importRomForPort({ paths, db }, port, dummy),
    );
    const notRom = path.join(base, 'notes.txt');
    fs.writeFileSync(notRom, 'hello');
    await expectAppError('rejects bad extension', 'ROM_EXTENSION_UNSUPPORTED', () =>
      importRomForPort({ paths, db }, port, notRom),
    );
    check('no rom linked after failures', db.roms.getLinkedRom('shipwright') === null);

    const dummyHashes = await hashFile(dummy);
    db.roms.insert({
      sha1: dummyHashes.sha1,
      md5: dummyHashes.md5,
      sourcePath: dummy,
      cachedPath: dummy,
      extension: '.z64',
      size: 1024,
      validatedAt: Date.now(),
    });
    await expectAppError(
      'cached record still hash-checked against port list',
      'ROM_HASH_MISMATCH',
      () => importRomForPort({ paths, db }, port, dummy),
    );
    check('shipwright still unlinked after cached rejection', db.roms.getLinkedRom('shipwright') === null);

    const dusklightConfig = getPort('dusklight');
    if (dusklightConfig) {
      const fakeIso = path.join(base, 'fake.iso');
      fs.writeFileSync(fakeIso, Buffer.alloc(2048, 9));
      const status = await importRomForPort({ paths, db }, dusklightConfig, fakeIso);
      check('dusklight accepts iso as unverified', status.linked && status.unverified);
    } else {
      check('dusklight config present', false);
    }
  } else {
    check('shipwright in registry', false);
  }

  console.log('6. install remaining registry ports');
  const remainingPorts = ['starship', 'ghostship', 'spaghetti-kart', 'lighthouse', 'dusklight', 'gen1recomp'];
  for (const portId of remainingPorts) {
    try {
      const installed = await installPort(installDeps, portId);
      check(`${portId}: DB row recorded`, db.ports.getInstalled(portId)?.version === installed.version);
      check(`${portId}: executable exists`, fs.existsSync(installed.executablePath), installed.executablePath);
      check(`${portId}: executable bit set`, (fs.statSync(installed.executablePath).mode & 0o111) !== 0);
      const port = getPort(portId);
      if (port) {
        uninstallPort(
          {
            db,
            dataDir,
            homeDir: os.homedir(),
            getRootInstallDir: () => installRoot,
          },
          port,
          false,
        );
        check(`${portId}: cleaned up`, !fs.existsSync(installed.installPath));
      }
    } catch (err) {
      check(`${portId}: install pipeline`, false, String(err));
    }
  }

  console.log('7. 2ship2harkinian registry');
  const twoShip = getPort('2ship2harkinian');
  check('2ship configured with linux support', Boolean(twoShip?.assetPattern.linux && twoShip?.executable.linux));

  console.log('8. launcher process lifecycle');
  const shipwrightCfg = getPort('shipwright');
  if (shipwrightCfg) {
    const fakeDir = path.join(base, 'fake-port');
    fs.mkdirSync(fakeDir, { recursive: true });
    const fakeExe = path.join(fakeDir, 'fake.sh');
    const childPidFile = path.join(fakeDir, 'child.pid');
    const detachedPidFile = path.join(fakeDir, 'detached.pid');
    fs.writeFileSync(
      fakeExe,
      `#!/bin/sh\nsetsid -w sh -c 'echo $$ > ${detachedPidFile}; exec sleep 60' &\nsleep 60 &\necho $! > '${childPidFile}'\nwait\n`,
    );
    fs.chmodSync(fakeExe, 0o755);

    const events: MainEvent[] = [];
    const launchManager = new LaunchManager({
      platform: 'linux',
      paths,
      db,
      emit: (event) => events.push(event),
    });
    const noRomPort = { ...shipwrightCfg, rom: { ...shipwrightCfg.rom, required: false } };
    const fakeEntry: LibraryEntry = {
      port: noRomPort,
      installed: {
        id: shipwrightCfg.id,
        version: 'test',
        installPath: fakeDir,
        executablePath: fakeExe,
        updatedAt: Date.now(),
      },
      updateAvailable: false,
      latestVersion: null,
      romStatus: { linked: false, unverified: false, rom: null },
      running: false,
      playtimeMs: 0,
      lastPlayedAt: 0,
      inSteam: false,
    };

    await launchManager.launch(noRomPort, fakeEntry);
    check('launcher marks port running', launchManager.isRunning(shipwrightCfg.id));
    await new Promise((resolve) => setTimeout(resolve, 500));
    launchManager.stop(shipwrightCfg.id);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    check('launcher clears running after stop', !launchManager.isRunning(shipwrightCfg.id));

    const exitEvent = events.find((e) => e.type === 'launch-exit') as
      | Extract<MainEvent, { type: 'launch-exit' }>
      | undefined;
    check('exit event emitted', Boolean(exitEvent));
    check('stop exit is not marked failed', Boolean(exitEvent && !exitEvent.failed));
    check('signal recorded', Boolean(exitEvent && exitEvent.signal));

    let childAlive = false;
    try {
      const childPid = parseInt(fs.readFileSync(childPidFile, 'utf8'), 10);
      process.kill(childPid, 0);
      childAlive = true;
    } catch {
      childAlive = false;
    }
    check('forked child killed with process group', !childAlive);

    let detachedAlive = false;
    try {
      const detachedPid = parseInt(fs.readFileSync(detachedPidFile, 'utf8'), 10);
      process.kill(detachedPid, 0);
      detachedAlive = true;
    } catch {
      detachedAlive = false;
    }
    check('setsid grandchild killed with descendant walk', !detachedAlive);
  } else {
    check('shipwright config for launcher test', false);
  }

  db.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();

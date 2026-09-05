import type { PortConfig } from '../../../shared/types';

export const extremeGRecomp: PortConfig = {
  id: 'extremegrecomp',
  displayName: 'Extreme-G: Recompiled',
  repo: 'sonicdcer/ExtremeGRecomp',
  repoHost: 'gitlab',
  description: 'A PC port of Extreme-G',
  assetPattern: {
    windows: 'ExtremeGRecompiled-*-Windows-*',
    macos: 'ExtremeGRecompiled-*-macOS-*',
    linux: 'ExtremeGRecompiled-*-Linux-X64-*',
  },
  executable: {
    windows: 'ExtremeGRecompiled.exe',
    macos: 'ExtremeGRecompiled.app/Contents/MacOS/ExtremeGRecompiled',
    linux: 'ExtremeGRecompiled',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.z64', '.n64'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['mods/**'],
  noOutput: true,
  notes:
    'Verified against v1.0.0: releases are published on GitLab. The Linux and macOS zips nest another archive inside, which is unpacked automatically. The game asks for the US 1.0 Extreme-G ROM in its own menu.',
};

import type { PortConfig } from '../../../shared/types';

export const zelda64Recomp: PortConfig = {
  id: 'zelda64recomp',
  displayName: 'Zelda 64: Recompiled',
  repo: 'Zelda64Recomp/Zelda64Recomp',
  description: 'A PC port of Majora\u2019s Mask',
  assetPattern: {
    windows: 'Zelda64Recompiled-*-Windows.zip',
    macos: 'Zelda64Recompiled-*-macOS.zip',
    linux: 'Zelda64Recompiled-*-Linux-X64.zip',
  },
  executable: {
    windows: 'Zelda64Recompiled.exe',
    macos: 'Zelda64Recompiled.app/Contents/MacOS/Zelda64Recompiled',
    linux: 'Zelda64Recompiled',
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
    'Verified against v1.2.2: the Linux and macOS zips nest another archive inside, which is unpacked automatically. The game asks for the US Majora\u2019s Mask ROM in its own menu.',
};

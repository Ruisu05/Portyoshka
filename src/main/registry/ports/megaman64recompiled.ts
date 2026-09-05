import type { PortConfig } from '../../../shared/types';

export const megaMan64Recompiled: PortConfig = {
  id: 'megaman64recompiled',
  displayName: 'Mega Man 64: Recompiled',
  repo: 'MegaMan64Recomp/MegaMan64Recompiled',
  description: 'A PC port of Mega Man 64',
  assetPattern: {
    windows: 'MegaMan64Recompiled-*-Windows.zip',
    macos: 'MegaMan64Recompiled-*-macOS.zip',
    linux: 'MegaMan64Recompiled-*-Linux-X64.zip',
  },
  executable: {
    windows: 'MegaMan64Recompiled.exe',
    macos: 'MegaMan64Recompiled.app/Contents/MacOS/MegaMan64Recompiled',
    linux: 'MegaMan64Recompiled',
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
    'Verified against v0.9.1: the Linux and macOS zips nest another archive inside, which is unpacked automatically. The game asks for the US Mega Man 64 ROM in its own menu.',
};

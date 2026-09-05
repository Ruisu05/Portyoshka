import type { PortConfig } from '../../../shared/types';

export const goemon64Recomp: PortConfig = {
  id: 'goemon64recomp',
  displayName: 'Goemon 64: Recompiled',
  repo: 'klorfmorf/Goemon64Recomp',
  description: 'A PC port of Mystical Ninja Starring Goemon',
  assetPattern: {
    windows: 'Goemon64Recompiled-Windows-*.zip',
    macos: 'Goemon64Recompiled-macOS-*.zip',
    linux: 'Goemon64Recompiled-Linux-X64-*.zip',
  },
  executable: {
    windows: 'Goemon64Recompiled.exe',
    macos: 'Goemon64Recompiled.app/Contents/MacOS/Goemon64Recompiled',
    linux: 'Goemon64Recompiled',
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
    'Verified against v0.2.0-dev: the Linux and macOS zips nest another archive inside, which is unpacked automatically. The game asks for the US Mystical Ninja Starring Goemon ROM in its own menu.',
};

import type { PortConfig } from '../../../shared/types';

export const bm64Recomp: PortConfig = {
  id: 'bm64recomp',
  displayName: 'Bomberman 64: Recompiled',
  repo: 'RevoSucks/BM64Recomp',
  description: 'A PC port of Bomberman 64',
  assetPattern: {
    windows: 'BM64Recompiled-Windows-*.zip',
    macos: 'BM64Recompiled-macOS-*.zip',
    linux: 'BM64Recompiled-Linux-X64-*.zip',
  },
  executable: {
    windows: 'BM64Recompiled.exe',
    macos: 'BM64Recompiled.app/Contents/MacOS/BM64Recompiled',
    linux: 'BM64Recompiled',
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
    'Verified against v1.0.0: the Linux and macOS zips nest another archive inside, which is unpacked automatically. The game asks for the US Bomberman 64 ROM in its own menu.',
};

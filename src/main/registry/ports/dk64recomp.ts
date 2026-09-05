import type { PortConfig } from '../../../shared/types';

export const dk64Recomp: PortConfig = {
  id: 'dk64recomp',
  displayName: 'Donkey Kong 64: Recompiled',
  repo: 'Rainchus/Donkey-Kong-64-Recompiled',
  description: 'A PC port of Donkey Kong 64',
  assetPattern: {
    windows: 'DK64Recompiled-Windows-Release-*.zip',
    macos: 'DK64Recompiled-macOS-ARM64-Release-*.zip',
    linux: 'DK64Recompiled-Linux-X64-Release-*.zip',
  },
  executable: {
    windows: 'DK64Recompiled.exe',
    macos: 'DK64Recompiled.app/Contents/MacOS/DK64Recompiled',
    linux: 'DK64Recompiled',
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
    'Verified against 1.0.2: the macOS build is ARM64-only. The Linux and macOS zips nest another archive inside, which is unpacked automatically. The game asks for the US Donkey Kong 64 ROM in its own menu.',
};

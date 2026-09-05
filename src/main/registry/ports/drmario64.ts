import type { PortConfig } from '../../../shared/types';

export const drMario64: PortConfig = {
  id: 'drmario64',
  displayName: 'Dr. Mario 64 Recompiled+',
  repo: 'theboy181/drmario64_recomp_plus',
  description: 'A PC port of Dr. Mario 64 with enhancements',
  assetPattern: {
    windows: 'Dr.Mario.64.Recompiled-*-Windows.zip',
  },
  executable: {
    windows: 'Dr. Mario 64 Recompiled x64-Release/drmario64_recomp.exe',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.z64', '.n64'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['mods/**'],
  notes:
    'Verified against 1.0.0: Windows-only build; the exe sits in a "Dr. Mario 64 Recompiled x64-Release" folder. The game asks for the US Dr. Mario 64 ROM itself at runtime.',
};

import type { PortConfig } from '../../../shared/types';

export const sssvRecomp: PortConfig = {
  id: 'sssvrecomp',
  displayName: 'Space Station Silicon Valley: Recompiled',
  repo: 'Cellenseres/SSSV_Recomp',
  description: 'A PC port of Space Station Silicon Valley',
  assetPattern: {
    windows: 'SSSVRecompiled_*_Windows.zip',
    macos: 'SSSVRecompiled_*_macOS.zip',
    linux: 'SSSVRecompiled_*_Linux.tar.gz',
  },
  executable: {
    windows: 'SSSVRecompiled.exe',
    macos: 'SSSVRecompiled.app/Contents/MacOS/SSSVRecompiled',
    linux: 'SSSVRecompiled',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.z64', '.n64'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['mods/**'],
  notes:
    'Verified against v0.2.0: all three platforms publish zips/tar.gz that extract at the root. The game asks for the US 1.0 Space Station Silicon Valley ROM in its own menu.',
};

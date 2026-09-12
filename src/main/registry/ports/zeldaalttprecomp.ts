import type { PortConfig } from '../../../shared/types';

export const zeldaAlttpRecomp: PortConfig = {
  id: 'zeldaalttprecomp',
  displayName: 'The Legend of Zelda: A Link to the Past Recompiled',
  repo: 'mstan/ZeldaAlttPSNESRecomp',
  description: 'A PC port of The Legend of Zelda: A Link to the Past',
  icon: 'assets/icons/zeldaalttprecomp.png',
  assetPattern: {
    windows: 'ZeldaALttPSNESRecomp-windows-x64-v*.zip',
    linux: 'ZeldaALttPSNESRecomp-linux-*-x86_64.AppImage',
  },
  executable: {
    windows: 'ZeldaALttPSNESRecomp.exe',
    linux: 'ZeldaALttPSNESRecomp-linux-*-x86_64.AppImage',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.sfc', '.smc'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: [
    'config.ini',
    'keybinds.ini',
    'rom.cfg',
    'saves/**',
    'mods/**',
    'msu/**',
    '*.sfc',
    '*.smc',
  ],
  notes:
    'Verified against v0.6.1: Windows includes ZeldaALttPSNESRecomp.exe at the archive root and Linux publishes a standalone AppImage. The game asks for a US A Link to the Past ROM (.sfc or .smc), checks it internally, and stores its launcher settings, ROM cache, saves, mods, and optional MSU-1 music beside the executable. Both builds emit launcher diagnostics, so the Output button remains available.',
};

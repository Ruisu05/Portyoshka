import type { PortConfig } from '../../../shared/types';

export const dusklight: PortConfig = {
  id: 'dusklight',
  displayName: 'Dusklight',
  repo: 'TwilitRealm/dusklight',
  description: 'A PC port of The Legend of Zelda: Twilight Princess',
  icon: 'assets/icons/dusklight.png',
  assetPattern: {
    windows: 'Dusklight-*win32-x86_64.zip',
    macos: 'Dusklight-*macos-x86_64.zip',
    linux: 'Dusklight-*linux-x86_64.AppImage',
  },
  executable: {
    windows: 'Dusklight.exe',
    macos: 'Dusklight.app',
    linux: 'Dusklight-*linux-x86_64.AppImage',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.iso', '.rvz'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: [],
  notes:
    'Verified against v1.4.1: the Linux release is a plain AppImage (no zip). GameCube ISOs only; the project publishes no hash list, so ROMs are accepted by extension and marked unverified. The game keeps its own data outside the install folder.',
};

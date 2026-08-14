import type { PortConfig } from '../../../shared/types';

export const starship: PortConfig = {
  id: 'starship',
  displayName: 'Starship',
  repo: 'HarbourMasters/Starship',
  description: 'A PC port of Star Fox 64',
  icon: 'assets/icons/starship.png',
  assetPattern: {
    windows: 'Starship-*Windows*.zip',
    linux: 'Starship-*Linux*.zip',
  },
  executable: {
    windows: 'starship.exe',
    linux: 'starship.appimage',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.z64'],
    validHashes: {
      sha1: [
        'd8b1088520f7c5f81433292a9258c1184afa1457',
        '09f0d105f476b00efa5303a3ebc42e60a7753b7a',
      ],
    },
    handling: 'native-wizard',
  },
  preserveOnUpdate: [
    'starship.cfg.json',
    'starship.cfg.ini',
    '*.o2r',
    '*.otr',
    'mods/**',
    'Randomizer/**',
  ],
  notes:
    'Verified against v2.0.0: Linux zip contains starship.appimage. Supports US 1.0 / US 1.1 ROMs; the game runs its own O2R extraction. No macOS release is published.',
};

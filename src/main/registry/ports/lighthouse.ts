import type { PortConfig } from '../../../shared/types';

export const lighthouse: PortConfig = {
  id: 'lighthouse',
  displayName: 'Lighthouse',
  repo: 'HarbourMasters/Lighthouse',
  description: 'A PC port of Banjo-Kazooie',
  icon: 'assets/icons/lighthouse.png',
  assetPattern: {
    windows: 'Lighthouse-*Win64*.zip',
    macos: 'Lighthouse-*Mac*.zip',
    linux: 'Lighthouse-*Linux*.zip',
  },
  executable: {
    windows: 'lighthouse.exe',
    macos: 'lighthouse.app',
    linux: 'lighthouse.appimage',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.z64'],
    validHashes: {
      sha1: [
        '1fe1632098865f639e22c11b9a81ee8f29c75d7a',
        'ded6ee166e740ad1bc810fd678a84b48e245ab80',
        '90726d7e7cd5bf6cdfd38f45c9acbf4d45bd9fd8',
        'bb359a75941df74bf7290212c89fbc6e2c5601fe',
      ],
    },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['lighthouse.cfg.json', 'lighthouse.cfg.ini', '*.o2r', '*.otr', 'mods/**'],
  mods: {
    source: { kind: 'gamebanana', gameId: 25172 },
    layout: 'flat-files',
    modFileExtensions: ['.otr', '.o2r'],
  },
  notes:
    'Verified against 1.0.3: Linux zip contains lighthouse.appimage. Supports US 1.0, US 1.1, JP and PAL Banjo-Kazooie ROMs; the game runs its own O2R extraction.',
};

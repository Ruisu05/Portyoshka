import type { PortConfig } from '../../../shared/types';

export const twoShipTwoHarkinian: PortConfig = {
  id: '2ship2harkinian',
  displayName: '2 Ship 2 Harkinian',
  repo: 'HarbourMasters/2ship2harkinian',
  description: 'A PC port of Majora\u2019s Mask',
  icon: 'assets/icons/2ship2harkinian.png',
  assetPattern: {
    windows: '2Ship-*Win64*.zip',
    macos: '2Ship-*Mac*.zip',
    linux: '*Linux*.zip',
  },
  executable: {
    windows: '2ship.exe',
    macos: '2ship.app',
    linux: '2ship.appimage',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.z64', '.n64', '.v64'],
    validHashes: {
      sha1: [
        'd6133ace5afaa0882cf214cf88daba39e266c078',
        '9743aa026e9269b339eb0e3044cd5830a440c1fd',
      ],
    },
    handling: 'native-wizard',
  },
  preserveOnUpdate: [
    '2ship2harkinian.json',
    '2ship2harkinian.ini',
    '*.o2r',
    '*.otr',
    'mods/**',
    'Randomizer/**',
  ],
  notes:
    'Verified against 5.0.0: Linux zip contains 2ship.appimage. ROM is placed next to the appimage; the game runs its own asset extraction on first launch.',
};

import type { PortConfig } from '../../../shared/types';

export const shipwright: PortConfig = {
  id: 'shipwright',
  displayName: 'Ship of Harkinian',
  repo: 'HarbourMasters/Shipwright',
  description: 'A PC port of Ocarina of Time',
  icon: 'assets/icons/shipwright.png',
  assetPattern: {
    windows: '*Win64*.zip',
    macos: '*Mac*.zip',
    linux: '*Linux*.zip',
  },
  executable: {
    windows: 'soh.exe',
    macos: 'soh.app',
    linux: 'soh.appimage',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.z64', '.n64', '.v64'],
    validHashes: {
      sha1: [
        '328a1f1beba30ce5e178f031662019eb32c5f3b5',
        'cfbb98d392e4a9d39da8285d10cbef3974c2f012',
        '0227d7c0074f2d0ac935631990da8ec5914597b4',
        'f46239439f59a2a594ef83cf68ef65043b1bffe2',
        'cee6bc3c2a634b41728f2af8da54d9bf8cc14099',
        '079b855b943d6ad8bd1eb026c0ed169ecbdac7da',
        '50bebedad9e0f10746a52b07239e47fa6c284d03',
        'cfecfdc58d650e71a200c81f033de4e6d617a9f6',
        'ad69c91157f6705e8ab06c79fe08aad47bb57ba7',
        'd3ecb253776cd847a5aa63d859d8c89a2f37b364',
        '41b3bdc48d98c48529219919015a1af22f5057c2',
        'c892bbda3993e66bd0d56a10ecd30b1ee612210f',
        'dbfc81f655187dc6fefd93fa6798face770d579d',
        'fa5f5942b27480d60243c2d52c0e93e26b9e6b86',
        'b82710ba2bd3b4c6ee8aa1a7e9acf787dfc72e9b',
        '8b5d13aac69bfbf989861cfdc50b1d840945fc1d',
        '0769c84615422d60f16925cd859593cdfa597f84',
        '2ce2d1a9f0534c9cd9fa04ea5317b80da21e5e73',
        'dd14e143c4275861fe93ea79d0c02e36ae8c6c2f',
      ],
    },
    handling: 'native-wizard',
  },
  preserveOnUpdate: [
    'shipofharkinian.json',
    'shipofharkinian.ini',
    '*.o2r',
    '*.otr',
    'mods/**',
    'Randomizer/**',
  ],
  mods: {
    source: { kind: 'gamebanana', gameId: 16121 },
    layout: 'flat-files',
    modFileExtensions: ['.otr', '.o2r'],
  },
  notes:
    'Verified against 9.2.3: Linux zip contains soh.appimage. ROM is placed next to the appimage; the game runs its own asset extraction on first launch.',
};

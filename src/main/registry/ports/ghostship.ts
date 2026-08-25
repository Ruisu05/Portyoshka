import type { PortConfig } from '../../../shared/types';

export const ghostship: PortConfig = {
  id: 'ghostship',
  displayName: 'Ghostship',
  repo: 'HarbourMasters/Ghostship',
  description: 'A PC port of Super Mario 64',
  icon: 'assets/icons/ghostship.png',
  assetPattern: {
    windows: 'Mary-Celeste-*Win64*.zip',
    macos: 'Mary-Celeste-*Mac*.zip',
    linux: 'Mary-Celeste-*Linux*.zip',
  },
  executable: {
    windows: 'ghostship.exe',
    macos: 'ghostship.app',
    linux: 'ghostship.appimage',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.z64'],
    validHashes: {
      sha1: [
        '9bef1128717f958171a4afac3ed78ee2bb4e86ce',
        '8a20a5c83d6ceb0f0506cfc9fa20d8f438cafe51',
      ],
    },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['ghostship.cfg.json', 'ghostship.cfg.ini', '*.o2r', '*.otr', 'mods/**'],
  mods: {
    source: { kind: 'gamebanana', gameId: 24131 },
    layout: 'flat-files',
    modFileExtensions: ['.otr', '.o2r'],
  },
  notes:
    'Verified against 2.0.0: Linux zip contains ghostship.appimage. Supports the US and JP SM64 ROMs; the game runs its own O2R extraction.',
};

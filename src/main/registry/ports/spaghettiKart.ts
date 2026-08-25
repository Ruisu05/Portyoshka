import type { PortConfig } from '../../../shared/types';

export const spaghettiKart: PortConfig = {
  id: 'spaghetti-kart',
  displayName: 'SpaghettiKart',
  repo: 'HarbourMasters/SpaghettiKart',
  description: 'A PC port of Mario Kart 64',
  icon: 'assets/icons/spaghetti-kart.png',
  assetPattern: {
    windows: 'spaghetti-windows.zip',
    macos: 'spaghetti-mac-*.zip',
    linux: 'spaghetti-linux.zip',
  },
  executable: {
    windows: 'Spaghettify.exe',
    macos: 'Spaghettify.app',
    linux: 'spaghetti.appimage',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.z64'],
    validHashes: {
      sha1: ['579c48e211ae952530ffc8738709f078d5dd215e'],
    },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['spaghettify.cfg.json', 'spaghettify.cfg.ini', '*.o2r', '*.otr', 'mods/**'],
  mods: {
    source: { kind: 'gamebanana', gameId: 22970 },
    layout: 'flat-files',
    modFileExtensions: ['.otr', '.o2r'],
  },
  notes:
    'Verified against 1.0.0: Linux zip contains spaghetti.appimage. Supports the US MK64 ROM only. The in-game ROM picker on Linux needs zenity or kdialog installed.',
};

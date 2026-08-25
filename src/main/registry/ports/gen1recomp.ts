import type { PortConfig } from '../../../shared/types';

export const gen1recomp: PortConfig = {
  id: 'gen1recomp',
  displayName: 'Gen1Recomp',
  repo: 'bryanthaboi/gen1recomp',
  description: 'A PC port of Pokémon Red, Blue and Yellow',
  icon: 'assets/icons/gen1recomp.png',
  assetPattern: {
    windows: 'gen1recomp-*-windows.zip',
    macos: 'gen1recomp-*-macos.zip',
    linux: 'gen1recomp-*-linux.zip',
  },
  executable: {
    windows: 'gen1recomp-win64/gen1recomp.exe',
    macos: 'gen1recomp.app/Contents/MacOS/love',
    linux: 'gen1recomp-x86_64.AppImage',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.gb', '.gbc'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: [
    'portable.txt',
    'save.lua',
    'save.lua.bak',
    'options.lua',
    'data/generated/**',
    'assets/generated/**',
    'mods/**',
  ],
  noOutput: true,
  mods: {
    source: {
      kind: 'index',
      indexUrl: 'https://bryanthaboi.github.io/gen1recomp-mod-index/data/index.json',
      fallbackIndexUrl: 'https://raw.githubusercontent.com/bryanthaboi/gen1recomp-mod-index/main/site/data/index.json',
    },
    layout: 'folder-per-mod',
    appDataFolder: 'pokemon-love2d',
    portableMarker: 'portable.txt',
  },
  notes:
    'Verified against v0.2.25: the Linux zip contains gen1recomp-x86_64.AppImage; the Windows zip nests the exe in gen1recomp-win64/; the macOS zip contains gen1recomp.app. The game opens its own launcher, which handles ROM import (US Red/Blue/Yellow/Gold/Silver/Crystal, SHA-1 verified in-game) and game settings. Saves and the ROM cache live in the OS app data dir unless portable.txt is dropped next to the game. It prints nothing to stdout/stderr, hence no Output button. Windows Defender may flag the exe as a false positive (official LÖVE runtime).',
};

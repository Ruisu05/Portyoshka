import type { PortConfig } from '../../../shared/types';

export const banjoRecomp: PortConfig = {
  id: 'banjorecomp',
  displayName: 'Banjo: Recompiled',
  repo: 'BanjoRecomp/BanjoRecomp',
  description: 'A PC port of Banjo-Kazooie',
  assetPattern: {
    windows: 'BanjoRecompiled-*-Windows.zip',
    macos: 'BanjoRecompiled-*-macOS.zip',
    linux: 'BanjoRecompiled-*-Linux-X64.tar.gz',
  },
  executable: {
    windows: 'BanjoRecompiled.exe',
    macos: 'BanjoRecompiled.app/Contents/MacOS/BanjoRecompiled',
    linux: 'BanjoRecompiled',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.z64', '.n64'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['mods/**'],
  noOutput: true,
  notes:
    'Verified against v1.0.2: the Windows and macOS zips extract at the root; the Linux tar.gz contains a BanjoRecompiled executable. The game asks for the US 1.0 Banjo-Kazooie ROM in its own menu and loads assets from it directly.',
};

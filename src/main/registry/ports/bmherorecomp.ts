import type { PortConfig } from '../../../shared/types';

export const bmHeroRecomp: PortConfig = {
  id: 'bmherorecomp',
  displayName: 'Bomberman Hero: Recompiled',
  repo: 'RevoSucks/BMHeroRecomp',
  description: 'A PC port of Bomberman Hero',
  assetPattern: {
    windows: 'BMHeroRecompiled-Windows-*.zip',
    macos: 'BMHeroRecompiled-macOS-*.zip',
    linux: 'BMHeroRecompiled-Linux-X64-*.zip',
  },
  executable: {
    windows: 'BMHeroRecompiled.exe',
    macos: 'BMHeroRecompiled.app/Contents/MacOS/BMHeroRecompiled',
    linux: 'BMHeroRecompiled',
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
    'Verified against v0.7.1 (a prerelease: Portyoshka falls back to the newest release when no stable one exists). The Linux and macOS zips nest another archive inside, which is unpacked automatically. The game asks for the US Bomberman Hero ROM in its own menu.',
};

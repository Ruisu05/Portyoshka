import type { PortConfig } from '../../../shared/types';

export const dinoRecomp: PortConfig = {
  id: 'dinorecomp',
  displayName: 'Dinosaur Planet: Recompiled',
  repo: 'DinosaurPlanetRecomp/dino-recomp',
  description: 'A PC port of the Dinosaur Planet prototype',
  assetPattern: {
    windows: 'DinosaurPlanetRecompiled-*-Windows-x64.zip',
    linux: 'DinosaurPlanetRecompiled-*-Linux-x64.tar.gz',
  },
  executable: {
    windows: 'DinosaurPlanetRecompiled.exe',
    linux: 'DinosaurPlanetRecompiled',
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
    'Verified against v0.3.0: the Windows zip and Linux tar.gz extract at the root. No macOS build is published. The game asks for the December 2000 Dinosaur Planet prototype ROM in its own menu.',
};

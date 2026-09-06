import type { PortConfig } from '../../../shared/types';

export const snap64Recomp: PortConfig = {
  id: 'snap64recomp',
  displayName: 'Pokemon Snap: Recompiled',
  repo: 'JackandBeans/Snap64Recomp',
  description: 'A PC port of Pokemon Snap',
  assetPattern: {
    windows: 'Snap64Recomp-*-win64.zip',
  },
  executable: {
    windows: '**/Snap64Recomp.exe',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.z64'],
    validHashes: {
      sha1: ['edc7c49cc568c045fe48be0d18011c30f393cbaf'],
    },
    handling: 'copy-to-exe-dir',
    filename: 'pokemonsnap.z64',
  },
  preserveOnUpdate: [
    '**/pokemonsnap.z64',
    '**/snapsettings.json',
    '**/snapsettings.json.bak',
    '**/saves/**',
    '**/photos/**',
    '**/mods/**',
    '**/mod_config/**',
    '**/texture_packs/**',
    '**/stickers/**',
  ],
  preserveOnUpdateRelativeToExecutable: true,
  notes:
    'Verified against v1.0.0: the Windows ZIP extracts into a versioned folder containing Snap64Recomp.exe. Portyoshka validates the canonical US ROM SHA-1 and copies it into that folder as pokemonsnap.z64. The port writes saves, settings, photos, mods, textures, stickers, and logs beside the executable. It emits launch diagnostics, so the Output button remains available.',
};

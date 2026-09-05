import type { PortConfig } from '../../../shared/types';

export const quest64Recomp: PortConfig = {
  id: 'quest64recomp',
  displayName: 'Quest 64: Recompiled',
  repo: 'Rainchus/Quest64-Recomp',
  description: 'A PC port of Quest 64',
  assetPattern: {
    windows: 'Quest64Recompiled*.zip',
  },
  executable: {
    windows: 'Quest64Recompiled.exe',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.z64', '.n64'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['mods/**'],
  notes:
    'Verified against v0.1: Windows-only build; the release publishes a single zip without a platform suffix. The game asks for the US Quest 64 ROM in its own menu.',
};

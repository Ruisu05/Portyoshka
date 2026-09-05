import type { PortConfig } from '../../../shared/types';

export const revengeRecomp: PortConfig = {
  id: 'revengerecomp',
  displayName: 'WCW/nWo Revenge: Recompiled',
  repo: 'jessetbh/WCWnWoRevengeRecomp',
  description: 'A PC port of WCW/nWo Revenge',
  assetPattern: {
    windows: 'RevengeRecompiled-*-Windows.zip',
  },
  executable: {
    windows: 'RevengeRecompiled.exe',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.z64', '.n64'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['mods/**'],
  notes:
    'Verified against v0.1.1 (prerelease-only project: Portyoshka picks the newest release when no stable one exists). Windows-only build; the game asks for the US WCW/nWo Revenge ROM itself.',
};

import type { PortConfig } from '../../../shared/types';

export const wcwRecomp: PortConfig = {
  id: 'wcwrecomp',
  displayName: 'WCW vs. nWo World Tour: Recompiled',
  repo: 'jessetbh/WCWvsNWOWorldTourRecomp',
  description: 'A PC port of WCW vs. nWo World Tour',
  assetPattern: {
    windows: 'WCWRecompiled-*-Windows.zip',
  },
  executable: {
    windows: 'WCWRecompiled.exe',
  },
  rom: {
    required: false,
    acceptedExtensions: ['.z64', '.n64'],
    validHashes: { sha1: [] },
    handling: 'native-wizard',
  },
  preserveOnUpdate: ['mods/**'],
  notes:
    'Verified against v0.1.2 (prerelease-only project: Portyoshka picks the newest release when no stable one exists). Windows-only build; the game asks for the US WCW vs. nWo World Tour ROM itself.',
};

import type { PortConfig } from '../../../shared/types';

export const snowboardKids2Recomp: PortConfig = {
  id: 'snowboardkids2recomp',
  displayName: 'Snowboard Kids 2: Recompiled',
  repo: 'cdlewis/snowboardkids2-recomp',
  description: 'A PC port of Snowboard Kids 2',
  assetPattern: {
    windows: 'SnowboardKids2Recompiled-Windows-*.zip',
    macos: 'SnowboardKids2Recompiled-macOS-*.zip',
    linux: 'SnowboardKids2Recompiled-Linux-X64-*.tar.gz',
  },
  executable: {
    windows: 'SnowboardKids2Recompiled.exe',
    macos: 'SnowboardKids2Recompiled.app/Contents/MacOS/SnowboardKids2Recompiled',
    linux: 'SnowboardKids2Recompiled',
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
    'Verified against v1.0.5: the Linux build is a plain tar.gz, the Windows and macOS builds are zips. The game asks for the US Snowboard Kids 2 ROM in its own menu.',
};

import type { PortConfig } from '../../../shared/types';

export const harvestMoon64Recomp: PortConfig = {
  id: 'harvestmoon64recomp',
  displayName: 'Harvest Moon 64: Recompiled',
  repo: 'HarvestMoon64Recomp/HarvestMoon64Recomp',
  description: 'A PC port of Harvest Moon 64',
  assetPattern: {
    windows: 'HarvestMoon64Recompiled-*-Windows.zip',
    macos: 'HarvestMoon64Recompiled-*-macOS.zip',
    linux: 'HarvestMoon64Recompiled-*-Linux-X64.zip',
  },
  executable: {
    windows: 'HarvestMoon64Recompiled.exe',
    macos: 'HarvestMoon64Recompiled.app/Contents/MacOS/HarvestMoon64Recompiled',
    linux: 'HarvestMoon64Recompiled',
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
    'Verified against v1.2.1: the Linux and macOS zips nest another archive inside, which is unpacked automatically. The game asks for the US Harvest Moon 64 ROM in its own menu.',
};

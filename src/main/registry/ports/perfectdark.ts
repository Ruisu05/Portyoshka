import type { PortConfig } from '../../../shared/types';

export const perfectDark: PortConfig = {
  id: 'perfectdark',
  displayName: 'Perfect Dark',
  repo: 'perfect-dark-pc-port/perfect_dark',
  description: 'A PC port of Perfect Dark',
  assetPattern: {
    windows: 'pd-x86_64-windows.zip',
    linux: 'pd-x86_64-linux.tar.gz',
  },
  executable: {
    windows: 'pd-x86_64-windows/pd.x86_64.exe',
    linux: 'pd-x86_64-linux/pd.x86_64',
  },
  rom: {
    required: true,
    acceptedExtensions: ['.z64', '.n64'],
    validHashes: {
      sha1: [],
      md5: ['e03b088b6ac9e0080440efed07c1e40f', '7f4171b0c8d17815be37913f535e4e93'],
    },
    handling: 'copy-to-exe-dir',
    filename: 'data/pd.ntsc-final.z64',
  },
  preserveOnUpdate: ['**/data/**'],
  notes:
    'The release is a rolling CI build under the "ci-dev-build" tag, so version checks only change when the tag itself moves. The NTSC US ROM (v1.1 recommended, md5 e03b088b...) is copied next to the executable as data/pd.ntsc-final.z64. No macOS build is shipped (the assets are tar.xz).',
};

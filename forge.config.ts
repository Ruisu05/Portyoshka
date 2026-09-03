import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerAppImage } from '@reforged/maker-appimage';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

// Authenticode signing (optional): set WINDOWS_CERT_FILE to a .pfx path and
// WINDOWS_CERT_PASSWORD to its password to sign the app payload and the
// Squirrel installer, so Windows Smart App Control / SmartScreen stop
// blocking unsigned builds.
const certFile = process.env.WINDOWS_CERT_FILE;
const certPassword = process.env.WINDOWS_CERT_PASSWORD;

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'portyoshka',
    win32metadata: {
      CompanyName: 'Portyoshka',
      FileDescription: 'Portyoshka',
      ProductName: 'Portyoshka',
      InternalName: 'Portyoshka',
    },
    ...(certFile
      ? {
          windowsSign: {
            certificateFile: certFile,
            ...(certPassword ? { certificatePassword: certPassword } : {}),
            timestampServer: 'http://timestamp.digicert.com',
          },
        }
      : {}),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel(
      certFile
        ? {
            certificateFile: certFile,
            ...(certPassword ? { certificatePassword: certPassword } : {}),
          }
        : {},
    ),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
    new MakerAppImage({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;

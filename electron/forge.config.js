const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    // Explicit and stable, decoupled from productName ("Chematic Draw",
    // used for the window title / Finder / Start Menu display, which has a
    // space in it). maker-deb/maker-rpm look for the packaged binary using
    // this name specifically, and Linux package-manager conventions don't
    // tolerate spaces well - without this, they fail with "could not find
    // the Electron app binary" once productName stopped being a bare,
    // space-free identifier that happened to double as the executable name.
    executableName: 'chematic-draw',
    // Signing is opt-in and secret-backed. Local builds remain unsigned, while
    // release CI signs only when the corresponding credentials are present.
    ...(process.env.CSC_LINK && process.env.CSC_KEY_PASSWORD ? {
      osxSign: { identity: process.env.CSC_NAME },
      osxNotarize: process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID ? {
        appleId: process.env.APPLE_ID,
        appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
        teamId: process.env.APPLE_TEAM_ID,
      } : undefined,
    } : {}),
    ...(process.env.WIN_CSC_LINK && process.env.WIN_CSC_KEY_PASSWORD ? {
      certificateFile: process.env.WIN_CSC_LINK,
      certificatePassword: process.env.WIN_CSC_KEY_PASSWORD,
      signingHashAlgorithms: ['sha256'],
    } : {}),
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
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

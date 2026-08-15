declare module 'steam-shortcut-editor' {
  interface SteamShortcut {
    appid?: number;
    AppName?: string;
    exe?: string;
    StartDir?: string;
    icon?: string;
    ShortcutPath?: string;
    LaunchOptions?: string;
    IsHidden?: boolean;
    AllowDesktopConfig?: boolean;
    AllowOverlay?: boolean;
    OpenVR?: boolean;
    Devkit?: boolean;
    DevkitGameID?: string;
    DevkitOverrideAppID?: number;
    LastPlayTime?: number;
    FlatpakAppID?: string;
    tags?: string[];
  }

  interface SteamShortcutsData {
    shortcuts: SteamShortcut[];
  }

  export function parseFile(
    filePath: string,
    options: object,
    callback: (err: Error | null, data: SteamShortcutsData, inputBuffer?: Buffer) => void,
  ): void;
  export function parseBuffer(buffer: Buffer, options?: object): SteamShortcutsData;
  export function writeFile(
    filePath: string,
    data: SteamShortcutsData,
    callback: (err: Error | null) => void,
  ): void;
  export function writeBuffer(data: SteamShortcutsData): Buffer;
}

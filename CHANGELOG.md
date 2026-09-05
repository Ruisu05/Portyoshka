# Changelog

## 1.3.4
- Seventeen new ports: Banjo: Recompiled, Bomberman 64: Recompiled, Bomberman Hero: Recompiled, Dinosaur Planet: Recompiled, Donkey Kong 64: Recompiled, Perfect Dark, Dr. Mario 64 Recompiled+, Extreme-G: Recompiled, Goemon 64: Recompiled, Harvest Moon 64: Recompiled, Mega Man 64: Recompiled, Quest 64: Recompiled, Snowboard Kids 2: Recompiled, Space Station Silicon Valley: Recompiled, WCW vs. nWo World Tour: Recompiled, WCW/nWo Revenge: Recompiled and Zelda 64: Recompiled
- GitLab release support (Extreme-G: Recompiled publishes on GitLab)
- Installer now unpacks nested archives, detects archive type by content, and preserves symlinks inside macOS app bundles
- Releases that only have prereleases now install the newest one instead of failing
- Hidden the Output button for the recomp ports that print nothing to the console
- Fixed the version pill showing a doubled "v" (e.g. "vv0.2.56") for tags that already start with v

## 1.3.3
- Search box placeholder now just says "Search" (it filters the whole library, not only installed ports)

## 1.3.2
- Redesigned the whole UI: custom window titlebar with native window controls, new header with Library / Mods & Tools / Downloads tabs and a global library search (Ctrl+K)
- The port catalog is gone — every port now lives in the library, with filters for All / Installed / Not Installed / Needs Attention, sorting and grid/list layouts
- New Downloads page tracking active installs with progress and a completed-downloads history
- ROM-unverified ports (Gen1Recomp) no longer count as "needs attention"

## 1.3.1
- Windows: optional Authenticode signing for the app and installer so Smart App Control / SmartScreen stops blocking it (set WINDOWS_CERT_PFX / WINDOWS_CERT_PASSWORD secrets, or WINDOWS_CERT_FILE / WINDOWS_CERT_PASSWORD locally)

## 1.3.0
- Mods page: browse a mod directory with search and categories, install, update and remove mods, and open the mod's page (Gen1Recomp community index; GameBanana for Ship of Harkinian, 2 Ship 2 Harkinian, Starship, Ghostship, SpaghettiKart and Lighthouse — non-mod submissions filtered out)
- Layout now adapts to the window size

## 1.2.1
- Hid the Output button for ports that produce no console output (Gen1Recomp)

## 1.2.0
- Added Gen1Recomp (Pokémon Red, Blue & Yellow) to the catalog

## 1.1.2
- Added playtime tracking per port
- Added "Add to Steam" button (uses the port's icon, toggles to remove)

## 1.1.1
- Show the app version in Settings

## 1.1.0
- Self-updater: Portyoshka checks its own GitHub releases
- "Check for updates" also checks for Portyoshka itself

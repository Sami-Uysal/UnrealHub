# UnrealHub — Chinese Modified Edition

[简体中文](README.md) · [Türkçe](README_TR.md) · [Changelog](CHANGELOG.md)

This is a public modified fork of [Sami-Uysal/UnrealHub](https://github.com/Sami-Uysal/UnrealHub), based on upstream 1.6.1 and maintained by GoldenDragons. It preserves Sami Uysal's attribution, upstream history and the [MIT license](LICENSE). It is not an official upstream release.

Current version: **1.6.2-zh.1**. [Download Windows x64 installer or portable executable](https://github.com/GoldenDragons/UnrealHub/releases/latest).

## Changes in this fork

- 301 Simplified Chinese translation strings, persistent language selection, and English/Turkish support.
- Fix for the whole-window blank screen when opening Marketplace.
- Recursive engine/project discovery, including search roots and nested folders, with overlapping-path deduplication.
- Progressive results and visible scan progress, error messages and a rescan button. Large-directory traversal uses bounded breadth-first batches and shares in-flight scan tasks.
- Source and installed engine groups, sorted by actual numeric version. Source GUID associations are resolved when possible.
- Side-by-side project version buttons. All versions are displayed in separate version sections with project counts; search, tags, favorites and grid/list views work within these groups.

See the [detailed changelog](CHANGELOG.md) for local iteration history, validation and limitations.

## Current interface

All images below are from the actual **1.6.2-zh.1 executable**, maximized to 1920×1032, using isolated demo projects. Upstream's old screenshots have been removed.

![Projects grouped by UE version](github-assets/projects-all-fullscreen.png)

![Source and installed engine groups](github-assets/engines-fullscreen.png)

![Selecting a specific UE version](github-assets/projects-version-fullscreen.png)

## Build and verify

```powershell
npm.cmd ci --no-audit --no-fund
npm.cmd run build -- --publish never
node scripts/check-scanning.mjs
node scripts/check-versions.mjs
node scripts/check-marketplace.mjs
node scripts/capture-screenshots.mjs
```

Build output: `release/1.6.2-zh.1/`. Test/screenshot scripts require Node.js 22+. Executables do not require Node.js. Select Simplified Chinese in Settings → Language.

Existing lint findings have not been cleaned up. Installer installation, Epic login and asset downloads have not been acceptance-tested; previously identified token-storage security weaknesses are not hardened by this release. See the [Chinese guide](README_ZH.md) for scanning rules and operating details.

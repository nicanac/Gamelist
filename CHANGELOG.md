# Changelog

All notable changes to **Gamelist** are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [0.2.1] - 2026-11-11

### Fixed
- fix(modal): preserve game modal URL and surface state on Brain save (`643759e`)
## [0.2.0] - 2026-11-11

### Added
- feat(brain): sync game library and reviews with Brain catalog (`1af243e`)

### Fixed
- fix(brain): quote If-Match ETag and use 20-pip segmented rating UI (`7dd54dc`)
- fix(deps): regenerate package-lock.json for node:24-alpine (`59ab2d2`)
- fix(deps): remove @notionhq/client from package-lock.json (`dd01d1b`)

### Chores
- chore(ci): switch to Variant C zero-Actions VPS CI & release workflow (`4833624`)
## [0.1.2] - 2026-10-31

### Changed
- Deploy on nicode: Dockerfile, standalone output, /api/health (`d3ade44`)

## [0.1.1] - 2026-10-28

### Changed
- Rate and review games from the game view, saved to Notion (`eaa7016`)

## [0.1.0] - 2026-10-27

### Added
- Add a HyperFrames film presenting the app and the library (`7a01758`)

### Fixed
- Fix the hero count flash and mid-word breaks in generated cover titles (`4f37530`)

### Changed
- Build a motion-rich game library app backed by Notion (`8a238ef`)

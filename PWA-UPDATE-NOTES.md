# Fulbaria College — PWA Update Notes

This update keeps the existing HTML, CSS, JavaScript, page URLs, Supabase integration, Cloudinary integration, and admin pages in place.

## Added
- `css/pwa-enhancements.css`: additive styling for the installed-PWA bottom navigation and connectivity hint.
- `js/pwa-enhancements.js`: standalone-mode detection, bottom navigation for public pages, a working More menu, connectivity hints, and service-worker registration on public pages.
- PWA icon files under `assets/images/` referenced by the manifest.

## Updated
- `manifest.json`: added an app ID and display override while retaining the existing start URL, scope, app name, theme, and shortcuts.
- `service-worker.js`: cache version bumped to `fdc-v3.3.0`, new PWA assets precached, old-cache cleanup limited to this app's `fdc-*` caches, and an explicit offline message used for uncached HTML pages.
- Root page and public pages: linked the shared PWA assets and manifest. 

## Validation performed
- JavaScript syntax checks passed for `js/pwa-enhancements.js` and `service-worker.js`.
- `manifest.json` parses as valid JSON.
- Manifest icon files exist and match their declared dimensions.

## Deployment notes
- Deploy the files to the same site root so the existing root-relative paths continue to work.
- The site must be served over HTTPS (or localhost during development) for service workers and PWA installation.
- Browser/device-level installation and offline testing should still be performed after deployment. Push notifications and live Supabase data are not made available offline by this update.


## Navigation and loading refinement (v3.3.0)
- Removed the extra full-page `fdcPageLoader` overlay from `index.html`; the premium navy-and-gold in-page splash is retained.
- Removed the delayed opacity fade applied to all homepage top-level elements, preventing an additional fade layer from contributing to navigation-bar flashing.
- Preserved the homepage's actual content skeletons (including hero/content placeholders).
- Removed static skeleton placeholders from secondary public pages and admin content grids/tables so they no longer display artificial loading cards before real data arrives.
- Removed the full-screen skeleton overlays from the public BNCC and Scouts pages; their normal page content is no longer blocked by an overlay.
- Updated the PWA manifest's short name and description while preserving root start URL, scope, standalone display, navy theme/background, icons, and shortcuts.
- Bumped the service-worker cache version to `fdc-v3.3.0` so clients can refresh the updated manifest and page assets.

## Validation notes
- Confirmed the manifest parses as valid JSON and referenced icon files exist.
- Performed source-level checks on the changed files. A live browser/device test is still needed to verify the installed PWA launch screen and confirm the navigation-bar flash is gone on the deployed site.


## Super Premium Edition update (v3.4.0)

- Updated PWA manifest branding and shortcuts to English: Fulbaria College.
- Added shared lightweight premium design system across HTML pages.
- Added accessible global navigation drawer with keyboard Escape/Tab handling and developer credit.
- Refined homepage PWA splash styling and added “Developed by Sabbir Hosan Nirob”.
- Bumped Service Worker cache version to v3.4.0 and precached the shared CSS/JS assets.
- Preserved the existing Supabase visitor-counter RPC and app page logic.

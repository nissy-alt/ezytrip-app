# ezytrip Product Prototype V1

A mobile-first, Thai-language travel planning prototype. Search and hotel examples use synthetic content and browser-local demo state. A separate shared-trip flow is connected to the Supabase project described in `SUPABASE_SETUP.th.md`; its schema migration is applied, but Google OAuth credentials and authorization testing are still pending. This is not a production-ready travel service.

## Run locally

Use Node 24 and pnpm. In this folder:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec vite --host 127.0.0.1 --port 4173 --strictPort
```

Then open http://127.0.0.1:4173/ on this computer. The local URL is not a public share link and cannot be opened on a separate phone without additional networking/hosting setup.

This desktop session uses bundled Node at `/Users/ponyo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node`; if Node is not on PATH, prepend that directory for the command. Do not add credentials or change global configuration for this prototype.

## Checks

```sh
pnpm test
pnpm run build
pnpm exec prettier --check src/App.jsx src/domain.js src/data.js src/styles.css tests/domain.test.mjs index.html
```

## Structure

- `src/data.js`: fictional hotels and sample trip.
- `src/domain.js`: pure money/date/budget logic, integer HKD cents.
- `src/App.jsx`: screens, shared UI, dialogs and browser-local state.
- `src/sharedTrips.jsx`, `src/sharedTripDomain.js`, `src/supabase.js`: opt-in shared-trip UI, safe OAuth route handling and Supabase client setup.
- `supabase/migrations/`: schema source applied to the ezytrip Supabase project; local CLI/pgTAP verification is pending.
- `DATABASE_SECURITY.th.md`, `RELEASE_READINESS.th.md`: database/security review and deployment preparation.
- `src/styles.css`: responsive tokens/layouts.
- `public/assets/`: local photographs and source/license manifest.
- `verification/`: screenshots, measured viewport results and actual command output.
- `VERIFICATION.th.md`, `design-qa.md`: limits and verification evidence.

Source photography is free under the Unsplash License; see the manifest. Lucide icons are provided by the installed open-source library. System fonts only. There are no remote font, tracking or application API requests during ordinary local use. External links open only if clicked.

Demo state uses the `ezytrip:` prefix in this browser's local storage. It is not protected multi-user storage. Do not enter secrets or real sensitive financial records. Ratings, transit descriptions, prices and providers' sample offers are not verified real-world data.

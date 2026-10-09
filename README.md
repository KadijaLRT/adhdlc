# ADHD Life Coach

Offline-first, web-first, cross-platform (iOS/Android/Web) executive
function companion, powered by Expo, Expo Router, NativeWind, Zustand,
Supabase, SQLite, and Groq (via the OpenAI-compatible SDK).

## Architecture (restructured for scale)

The guiding rule: **adding a new feature should only ever mean adding new
files, never editing existing ones.**

```
adhd-life-coach/
├── app/                       # Expo Router: routes only, no business logic
├── src/
│   ├── core/                  # cross-cutting engine concerns
│   │   ├── storage/           # TaskRepository interface + sqlite/web impls
│   │   ├── ai/                # AvivaBrain (Groq) + groqSanitizer
│   │   └── supabase/          # client + optional profile sync
│   ├── store/
│   │   ├── slices/            # one small file per domain (task, streak,
│   │   │                      #   milestone, energy, stress, cycle,
│   │   │                      #   wellness, profile, ui, hydration)
│   │   ├── index.ts           # combines all slices into useAppStore
│   │   └── useOnboardingStore.ts  # transient, not persisted
│   ├── features/               # one folder per feature, owns its own UI
│   │   ├── home/ stuck-flow/ gamification/ energy/ wellness/ aviva/
│   ├── content/                 # static reference data (prompts,
│   │                            #   milestone tiers, meals, exercises)
│   └── shared/
│       └── components/          # ErrorBoundary, etc.
├── supabase/schema.sql
├── public/manifest.json
└── vercel.json / app.json / tailwind.config.js / metro.config.js / tsconfig.json
```

### Why this shape

- **`src/store/slices/`** — each domain (tasks, streaks, milestones,
  energy, stress, cycle tracking, wellness preferences, profile, UI
  state) is its own small file with its own type, default state, and
  actions. `store/index.ts` just combines them. Adding a new domain
  means: write `slices/xSlice.ts`, spread it into `index.ts`, add its
  storage keys to `core/storage`, and (if it should survive a restart)
  add one line to `slices/hydrationSlice.ts`. No existing slice file is
  ever touched.
- **`src/core/storage/`** — the only place that knows about SQLite vs.
  AsyncStorage. Everything else talks to the `TaskRepository` interface.
- **`src/content/`** — renamed from an earlier `src/data/` to avoid
  confusion with the storage layer. This folder is purely static
  reference content (prompt banks, milestone tier definitions, the
  exercise catalog), never persistence code.
- **`src/features/`** — each feature folder owns its own components.
  `app/` routes stay thin, importing from here.

## Local Setup

```
npm install
cp .env.example .env   # fill in Supabase + Groq values
npm run web             # primary dev target
npm run ios
npm run android
npm run typecheck
npm run lint
```

## Product Notes

- **Zero-guilt by design**: streaks never reset to zero (they freeze),
  milestones only ever unlock, never lock.
- **Account-free by default**: onboarding and all core features work
  fully offline with zero sign-in. Supabase sync is an optional,
  silent-if-absent upgrade layer, not a requirement — see
  `src/core/supabase/client.ts`.

## Not Yet Built (known open items)

- Sign-up/sign-in screens (deliberately deferred; app is account-free
  for now, per product decision).
- Multi-agent AI architecture, RPG-style gamification economy (XP/coins/
  avatars), and location/weather-aware notifications were proposed in
  planning documents but intentionally not built yet, each is a
  substantial scope decision that should be scoped and approved on its
  own before implementation.

## Deployment note: Vercel build error

If you see this error on Vercel:

```
Error: Package subpath './src/lib/TerminalReporter' is not defined by "exports" in .../node_modules/metro/package.json
```

This is a known upstream bug (see expo/expo#39337): `@expo/cli` internally
does a deep `require("metro/src/lib/TerminalReporter")`, and newer patch
versions of `metro` added a stricter `package.json` `exports` field that
blocks that kind of deep import. It's not caused by anything in this
project's own code.

Already applied in this project:
- `package.json` pins `metro` and its related packages via `"overrides"`
  to `0.80.9`, the version Expo SDK 52 actually expects.
- `"engines": { "node": "24.x" }` plus a `.nvmrc`, matching Vercel's
  current recommended Node version (Vercel deprecated 20.x; deployments
  created after 2026-10-01 require 24.x). This also happens to satisfy
  `@supabase/supabase-js`'s own `>=22.0.0` engine requirement, which
  the older 20.x pin did not.

If the error still occurs after redeploying:
1. In the Vercel project's settings, explicitly set the Node.js Version
   to 24.x (Project Settings → General → Node.js Version), since
   `package.json engines` is a hint, not a guarantee Vercel will honor it
   for the build image.
2. Clear Vercel's build cache before redeploying (Deployments → the
   failing deployment → Redeploy → uncheck "Use existing Build Cache"),
   since a stale `node_modules` cache from before the `overrides` were
   added can mask the fix.
3. If it persists, `metro`'s exact compatible version may differ from
   `0.80.9` depending on the installed Expo SDK patch version — check
   `npm ls metro` locally after `npm install` and adjust the override to
   match whatever version is listed in Expo's own `package-lock.json` for
   SDK 52.

## Deployment note: onboarding kept restarting

If completing onboarding, navigating around, then returning to the app
(closing/reopening the tab, a PWA relaunch, or any full page reload)
sent you back to onboarding even though you'd already finished it —
this was a real bug in `vercel.json`, now fixed.

**Root cause**: the old config had a blanket rewrite
(`"source": "/(.*)", "destination": "/index.html"`) that sent *every*
URL, including ones with their own real static file already generated
by Expo Router's static export (`tasks.html`, `profile.html`, etc.), to
`index.html` — which is `app/index.tsx`, the screen that decides
"onboarding or home?" based on whether a profile exists. Any full page
reload of any route re-ran that redirect logic instead of loading the
actual page, and if it ran before the app's local data had finished
loading, it could send you to onboarding.

**Fix applied**: `vercel.json` now uses `"cleanUrls": true` so Vercel
serves each route's real static file directly (e.g. `/tasks` →
`tasks.html`), and only the genuinely dynamic routes (`/task/:id`,
`/workout/session/:exerciseId`, `/school/course/:courseId`,
`/school/assignment/:assignmentId`) get an explicit rewrite to their
pattern file, since those don't have one static file per possible ID.
The root `/` route is no longer hijacking every other path.

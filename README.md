# Revived Smiles

A mobile-first patient app for at-home dental impressions, plus the staff portal
that reviews what patients send in.

**Live demo:** https://revived-smiles-eta.vercel.app

A patient orders a denture, partial or guard, receives a kit in the post, and the
app walks them through the intake questions, the four guided teeth photos and the
impression-tray photos, then tracks the order through review, fabrication and
delivery. `/admin` is the other half: the queue staff work through, the photo
grading, and the conversation with the patient.

Designed at 430px. Everything is built for a phone.

## This is a front end, on purpose

There is no backend. The app talks to exactly one thing — the `ApiClient`
interface in [`src/lib/api/contract.ts`](src/lib/api/contract.ts) — and a mock
implementation of that interface backed by `sessionStorage` makes the whole
thing clickable. Nothing under `src/app/**` imports a database client, calls
`fetch` against a data endpoint, or knows what stores the data.

To connect a real backend:

1. Write a new implementation of `ApiClient`, using `contract.ts` as the spec.
2. Change one line in [`src/lib/api/index.ts`](src/lib/api/index.ts).
3. Delete `src/lib/api/mock/`.

No screen changes in any of those steps. That is the point.

**Read [`docs/backend-contract/`](docs/backend-contract/) before building the
backend.** It carries the tuned photo-grading prompt, the prototype's schema,
and — most importantly — [`security-requirements.md`](docs/backend-contract/security-requirements.md),
nine defects the original prototype shipped with, each restated as a requirement
the new backend must meet. The application handles photographs of patients'
mouths; treat that as the bar.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm run lint
```

No environment variables are needed. The demo starts signed in as a seeded
patient, so any URL opens on a working screen; the login screens still work and
any password is accepted.

## Deploying

The live demo is deployed from this repo to Vercel:

```bash
npx vercel --prod
```

The Vercel project is not yet connected to GitHub, so pushes do not deploy on
their own. To get automatic deploys, connect this repository in the Vercel
dashboard (Project → Settings → Git).

## What's where

| Path | What it is |
| --- | --- |
| `src/lib/api/contract.ts` | The backend contract, and the specification |
| `src/lib/api/types.ts` | The domain model — the shapes that cross the boundary |
| `src/lib/api/mock/` | The stand-in backend, to be deleted |
| `src/app/` | Patient screens |
| `src/app/admin/` | Staff portal |
| `docs/backend-contract/` | The handoff package for the backend team |
| `SITE_MAP.md` | Figma file key, node ids and design tokens |
| `UI_ISSUES.md` | Logged UI defects, worst first |

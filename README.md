# Yeneta School Championship

A Next.js App Router application for Yeneta Academy's football, volleyball, chess and table tennis competitions. Public standings, team and athlete profiles, match reports and exports are separate from authenticated administration.

The original `hi.html` and all supplied root images are preserved. No demonstration identities, aggregate statistics, or browser-storage records are published. The clean initial season contains four classes and no athletes or matches. See [the original functionality audit](docs/LEGACY-AUDIT.md).

## Quick start

Use Node.js **24 LTS** and npm. Run from this folder:

```powershell
npm ci
npm run assets
npm run dev
```

Open `http://127.0.0.1:3000`. Without Sanity configuration, the public site displays the configured classes and honest empty results. Writes and administrator login require configured Sanity access and administrator credentials. There is no insecure local-storage or in-memory persistence fallback.

```powershell
Copy-Item .env.example .env.local
```

Restart Next.js after editing environment variables.

## Connect Sanity

1. Create a project in [Sanity Manage](https://www.sanity.io/manage).
2. Create a **private** dataset named `production`. Using a private dataset is essential: championship, session, and login-throttle documents share it.
3. Create a Viewer read token and an Editor write token. Restrict access to the project and dataset as your Sanity plan permits. Do not put either token in browser code.
4. Fill in the server environment variables below.
5. Run `npm run assets`, then `npm run seed`. The seed uses `createIfNotExists` and never overwrites an existing championship.
6. Start the application and sign in at `/admin` using your configured username and password.

Sanity schemas are in `src/sanity/schemas.ts`, with Studio configuration in `sanity.config.ts`. The custom admin writes directly through authenticated server routes; a hosted Studio is optional. To inspect the schema in Studio, export the nonsecret project/dataset configuration into the shell and run `npx sanity dev`. Studio requires a Sanity-account login, separate from the custom application's admin login. Studio's championship view is deliberately read-only; use `/admin` to preserve cross-record validation and concurrency protection. The Content Lake API does not enforce Studio schema rules, so server-side Zod and domain validation remain authoritative.

### Environment variables

| Variable                 | Purpose                                                                                                                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`             | Exact public origin, e.g. `http://127.0.0.1:3000` locally or your HTTPS domain in production; no trailing slash. Required in production for origin checks and canonical metadata. |
| `SANITY_PROJECT_ID`      | Sanity project identifier.                                                                                                                                                        |
| `SANITY_DATASET`         | Private dataset, normally `production`.                                                                                                                                           |
| `SANITY_API_VERSION`     | Fixed API date; example `2026-11-01`.                                                                                                                                             |
| `SANITY_API_READ_TOKEN`  | Server-only Viewer token; required for a private dataset.                                                                                                                         |
| `SANITY_API_WRITE_TOKEN` | Server-only Editor token for mutations, images, sessions and throttling.                                                                                                          |
| `ADMIN_USERNAME`         | Custom administrator username.                                                                                                                                                    |
| `ADMIN_PASSWORD_HASH`    | Salted scrypt hash generated below. Never use a plaintext password.                                                                                                               |
| `AUTH_SESSION_SECRET`    | Cryptographically random secret of at least 32 characters.                                                                                                                        |

None of these variables use `NEXT_PUBLIC_`. Set them as deployment secrets. `.env.local` is ignored by Git. The supplied example contains no credentials.

### Generate the password hash

The password helper reads stdin rather than command-line arguments. In PowerShell, securely prompt and pipe the value:

```powershell
$adminCredential = Get-Credential -UserName 'championship-admin' -Message 'Choose an administrator password (12–256 characters)'
$adminCredential.GetNetworkCredential().Password | node scripts/password.mjs
```

Copy the returned `scrypt$...` value into `.env.local` using **single quotes** to preserve the dollar signs:

```dotenv
ADMIN_PASSWORD_HASH='scrypt$<salt>$<derived-key>'
```

Generate the session secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Login credentials are verified on the server, using scrypt and constant-time comparisons. Every login creates a new random, database-backed session, signed with HS256. Cookies are HttpOnly, SameSite=Strict, and expire after eight hours. Production uses a Secure `__Host-` cookie. Logout deletes the session document, so a copied old cookie cannot be reused. Every protected page, read, mutation and upload independently checks the session. Mutations also require an exact same-origin request. Successful and failed credential attempts count toward a persistent five-attempt/15-minute account-wide rate limit, serialized with Sanity revision guards. A failed Sanity connection fails closed. Expired session documents can be removed through Sanity maintenance after their `expires` timestamp; they no longer authorize access.

## Everyday administration

### Classes and logos

Open `/admin/teams` to create or edit a class, its grade, optional class code, batch name, academic season, active status and logo. One class identity is shared across all sports and both divisions. Deactivating a class also archives its athletes; historical records remain available. Re-enable athletes individually when appropriate.

Upload or replace logos and athlete photos in their edit forms. The server decodes, rotates, resizes to at most 600 pixels, compresses to WebP, and uploads to Sanity. Supported formats are PNG, JPEG, WebP and AVIF, with an 8 MB upload limit and a decoded-pixel limit. Images retain their aspect ratio. Team badges use `object-fit: contain`; photos use a cropped avatar. Images are served through Next.js Image with explicit dimensions and responsive sizes. Photos and names displayed on this website are public championship information; only upload material approved for publication.

For supplied project assets, run `npm run assets`. It scans root image files and writes 512-pixel WebP logos, 128-pixel thumbnails, a favicon and `public/images/asset-manifest.json`. Originals are never overwritten. The manifest reports compressed sizes and unresolved mappings. Parentheses are removed from batch display names; `12A` produces grade 12 and class code `12A`, `Grade 11` produces grade 11, and the explicitly supplied `Seniors` label maps to grade 12. Matching requires the normalized batch name and any supplied class/grade identity. Unknown, ambiguous, or duplicate associations are reported rather than guessed. The configured initial team catalog is in `src/lib/initial.ts`; new classes created after setup use the admin upload workflow. Grade 9 currently has a fallback shield. The filename spelling **Invitus** is retained.

### Athletes and roster imports

Open `/admin/players`. Filter by team, sport, or boys/girls division; search, add, edit, or archive athletes. Athletes can participate in several sports. Name, class, division and sports are required; jersey and photo are optional. Grade comes from the team to avoid conflicting fields. Starting rating defaults to 1200 for individual sports; wins and losses cannot be manually inflated.

Choose **Import roster** for CSV or `.xlsx` files, maximum 2 MB and 500 rows per import. Excel uses the first worksheet. The import dialog offers a CSV template, editable CSV text, row-level validation and a preview. All rows must be valid before the entire batch is committed atomically.

Required columns: `name,team,division,sports`. Optional: `jersey,photo`. Use exact class IDs from Team Management, or an unambiguous batch name/class code. Division is `boys` or `girls`; sport IDs are `football`, `volleyball`, `chess`, `table-tennis`; separate multiple sports using `;` or `|`. A photo is an imported local `/images/` path or a Sanity image URL. Upload photos separately if needed.

Missing fields, invalid or ambiguous classes, invalid divisions/sports/images and duplicate identities within the existing roster or the upload are reported. Existing records are never overwritten by imports. Preview data is validated again on the server before saving.

Archive athletes instead of deleting their identities. Historical match references and contributions remain intact. Changes that would invalidate a recorded match (for example moving a scorer to an opposing class) are rejected. For a new season, create a new class registration and athlete registration rather than moving historical identities across seasons.

### Record and correct matches

The **Record match** action is available throughout administration:

1. Select sport, division, season and match date/time. Completed results cannot be future-dated or outside the season.
2. Choose two distinct teams or individual athletes. Individual competitors must match the sport, season and division.
3. For football or volleyball, enter scores using the large number field or +/− buttons.
4. For football, add exactly one event per goal. Select the benefiting team, scorer, goal type, minute and optional assist. Both normal scorer and assister must belong to that team's football roster and division. Self-assists are rejected. An own-goal scorer belongs to the opposing roster; own goals cannot have assists and do not count toward personal goals. Minute entry supports `24`, `45+2` and `90+4`. Event counts must exactly reconcile with the final score.
5. For volleyball, enter sets won by each team; draws are rejected. A maximum per-team set total is optional in Settings. No extra tournament format is imposed.
6. For chess/table tennis, choose first-athlete win, second-athlete win or draw.

Open `/admin/matches` to search, filter, correct or delete results. Deletion requires an explicit confirmation. All statistics are recalculated after a change. Match IDs and the shared revision guard protect against duplicate retries; concurrent stale edits are rejected with a reload instruction. No direct point increments are available.

### Seasons, rules and exports

Open `/admin/settings` to add an academic season and change the publicly selected season. Create class registrations for the new season. Old records remain stored. Football defaults to 3 points for a win, 1 for a draw, 0 for a loss; volleyball defaults to 2/0. Updating points configuration rebuilds standings. `enabledSports` pauses public competition displays without deleting records. Sport navigation remains in the required order: Football, Volleyball, Chess, Table Tennis; Football is the default.

`/admin/standings` exports each sport/division, goal scorers, assisters, active rosters and all current-season match results. CSV includes a UTF-8 BOM, escaped commas/newlines/quotes and formula-injection protection. Public downloads include only information already intended for public display, without audit records, credentials or authentication documents.

## Statistics and persistence architecture

`src/lib/statistics.ts` contains pure calculation functions. Football standings use points, goal difference, goals scored, then name and stable ID for a deterministic tie. Volleyball uses points, sets won, then name/ID. Recent form is the last five chronological results. Goal and assist rankings exclude own goals. Individual sports replay Elo from starting ratings, chronological date then stable match ID, using K=32, rounding each update and a minimum rating of 100. Draws are recorded explicitly; win percentage uses all played matches, including draws.

The private Sanity document `championship.current` holds typed season/class/athlete/match arrays, settings and the most recent 100 audit entries. This deliberate aggregate boundary allows a single revision-guarded atomic write to validate references and prevent race conditions across rosters and matches. IDs inside this aggregate are stable application references, validated against the complete state; they are not cross-document Sanity references. Sanity array `_key` and `_type` metadata is added on persistence. Session and login-throttle documents are separate. No credentials are stored in the championship payload.

This is intended for a school-scale championship. The API caps imports and validates aggregate sizes; for much larger installations, split aggregates by season with equivalent transactional integrity controls before approaching Sanity document-size limits. This implementation favors auditable consistency over independently mutable point totals.

Public reads use a 60-second server cache with tag `championship`; every successful mutation immediately expires that tag. Sanity reads bypass CDN caching, and mutations use synchronous visibility. Admin reads are uncached. Configured backend failures display an explicit unavailable state rather than fabricated results. The public site receives no audit entries, dataset tokens, session documents or throttle records.

## Historical migration

The new website never reads `SCHOOL_CHAMPIONSHIP_DATA_V3` automatically. If you possess genuine data, export the old localStorage JSON yourself and review every identity first:

```powershell
npm run migrate -- C:\path\legacy.json C:\path\review-roster.csv
```

The helper only writes a proposed individual-sport roster and a JSON warning report, refusing to overwrite output files. It never connects to Sanity. Remove fictional/demo names, correct identities, then import through the admin preview. Legacy aggregate wins, form and ratings cannot reconstruct individual matches and are not silently converted. Verified starting ratings can be entered manually; genuine historical match records must be recorded with their dates through match management. Football/volleyball demonstration standings are never migrated. Keep the source JSON as an offline archive.

## Verification

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
```

Unit tests exercise standings, tie breaks, scorer/assist attribution, own goals, chronology, individual Elo, edits/deletions, archival integrity, schema validation, import previews, CSV safety and asset mapping. Server integration tests exercise the actual route handlers against an isolated mocked Sanity client, including authentication, revocation, rate limiting, authorization, persistence, revision conflicts and invalidation. Test identities never enter the application seed.

Live Sanity integration requires your real project and tokens. After configuration, verify one class/athlete creation, image upload, roster import, result recording and correction in a nonproduction dataset, then verify public refresh, logout and rejected unauthorized requests. No live dataset was available during initial development.

## Deployment

Deploy to a Node.js-compatible Next.js host (for example a Next.js deployment on Vercel) using `npm ci` and `npm run build`. Set all environment variables using the host's encrypted secret configuration, set `APP_ORIGIN` to the exact HTTPS domain, initialize the private dataset once, and use HTTPS for Secure production cookies. `npm start` runs the production server on loopback for a reverse proxy; adjust host binding deliberately for your deployment platform if necessary. Do not deploy the original `hi.html` as an independent public management interface.

Do not run the seed against another project by mistake; it is additive only, but each dataset should be selected explicitly. Keep Sanity project access restricted, rotate leaked tokens and session secrets, and retain dataset backups. Application logout revokes a specific session; rotating `AUTH_SESSION_SECRET` invalidates all signed sessions. Changes to admin credentials should be paired with session-secret rotation when existing sessions must be invalidated.

The `sanity.config.ts` Studio view and schema are provided for inspection and maintenance, not as an unauthenticated write path. No deployment or external dataset has been created automatically.

## Project map

| Path                    | Responsibility                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `src/app`               | Server-rendered public routes, protected admin routes, metadata, APIs.                              |
| `src/components`        | Public presentation, reusable shadcn-style Radix UI components, interactive views.                  |
| `src/components/admin`  | Match recorder, class/athlete forms, imports, settings and management.                              |
| `src/lib/statistics.ts` | Deterministic, rebuildable projections.                                                             |
| `src/lib/validation.ts` | Cross-record and match integrity.                                                                   |
| `src/lib/operations.ts` | Validated state transitions and audit entries.                                                      |
| `src/lib/auth*.ts`      | Password hashing, sessions, durable throttling and authorization.                                   |
| `src/lib/sanity.ts`     | Server-only persistence and public cache boundary.                                                  |
| `src/sanity/schemas.ts` | Content schemas.                                                                                    |
| `scripts`               | Nondestructive image processing, additive initialization, password hashing and migration proposals. |
| `tests`                 | Pure unit tests and isolated server integration tests.                                              |

Primary implementation references: [Next.js App Router installation](https://nextjs.org/docs/app/getting-started/installation), [Sanity conditional mutations](https://www.sanity.io/docs/apis-and-sdks/js-client-mutations), and [Sanity transactions](https://www.sanity.io/docs/apis-and-sdks/js-client-transactions).

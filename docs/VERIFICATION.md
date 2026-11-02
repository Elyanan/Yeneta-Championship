# Verification record

Checked on 2 November 2026.

- Unit and server integration suite: 53 passing tests. The server tests run real route handlers against a mocked Sanity client; they do not write to an external dataset.
- ESLint and strict TypeScript checking pass.
- Optimized Next.js production build passes.
- Asset import generates four optimized logos, each under 100 KB, plus 128 px thumbnails and a favicon. Original files remain present. Grade 9's missing logo is explicitly reported.
- Browser review covered the public home, class profile and admin login at desktop and mobile widths. At 390 px, the standings overflow is confined to its table container; the document does not overflow horizontally.
- Sport changes, division selection, standings search, individual-sport empty states, keyboard arrow/Home navigation, light/dark selection, and saved theme behavior were exercised in the browser.
- Visiting `/admin` without a session redirects to `/admin/login`.

The suite includes correct/incorrect login, logout and revocation, expired/tampered sessions, same-origin enforcement, durable login throttling, unauthenticated admin read/write/upload rejection, server validation, roster/class/athlete operations, revision conflicts, image optimization and malformed image rejection, match correction/deletion, public cache invalidation, public exports, own goals, goals/assists, Elo replay, CSV safety, imports and deterministic asset mapping.

Live Sanity reads/writes, actual Sanity media upload, and browser administration with a real signed-in session require the user's project and credentials. They have **not** been verified against a real dataset. Authenticated admin forms were built and typechecked; their operations are exercised through the server integration suite. No application or dataset has been deployed.

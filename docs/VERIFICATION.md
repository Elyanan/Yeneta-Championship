# Verification record

Checked on 3 November 2026.

- Unit and server integration suite: 82 passing tests. The automated server tests use a mocked Sanity client. Authentication tests verify Next.js environment loading, environment-safe password hashes, legacy hash compatibility, session-secret aliases, local-origin aliases, normalized production origins, and rejection of forged or missing origins. An integrated regression covers login, a protected write, and logout when APP_ORIGIN uses `127.0.0.1` but the browser uses `localhost`.
- ESLint and strict TypeScript checking pass.
- Optimized Next.js production build passes.
- Asset import generates four optimized logos, each under 100 KB, plus 128 px thumbnails and a favicon. Original files remain present. Grade 9's missing logo is explicitly reported.
- Browser review covered the public home, class profile and admin login at desktop and mobile widths. At 390 px, the standings overflow is confined to its table container; the document does not overflow horizontally.
- Sport changes, division selection, standings search, individual-sport empty states, keyboard arrow/Home navigation, light/dark selection, and saved theme behavior were exercised in the browser.
- Visiting `/admin` without a session redirects to `/admin/login`.

The suite includes correct/incorrect login, logout and revocation, expired/tampered sessions, same-origin enforcement, durable login throttling, unauthenticated admin read/write/upload rejection, server validation, roster/class/athlete operations, revision conflicts, image optimization and malformed image rejection, match correction/deletion, public cache invalidation, public exports, own goals, goals/assists, Elo replay, CSV safety, imports and deterministic asset mapping.

The existing Yeneta Championship project is now connected and initialized with four configured classes, zero athletes and zero matches. Live password authentication, session-cookie creation, protected reads, logout, an unchanged-class save, and uploading/reassigning the existing Invitus logo have been verified. Browser testing confirmed that login opens the dashboard and that team management, the athlete form and match recorder load real class data. No invented student or match records were created.

The configured content token cannot change dataset visibility. The dataset remains public, while application records use Sanity's access-restricted non-root IDs. Live anonymous API reads of `championship.current` are denied; `npm run backend:check` also checks that session and throttle metadata are not returned anonymously. A dedicated Viewer token is optional; otherwise server reads use the existing write token. Neither token is passed to the browser.

The password hash uses colons because Next.js expands unescaped dollar signs in environment files. The underlying administrator password was preserved. No hosting deployment was performed.

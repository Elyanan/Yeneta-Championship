# Original application audit

The complete root `hi.html` is retained, unchanged, as a functional reference. The new application does not serve it from the public directory.

The legacy app keeps `sports`, `players` and `gradeTeams` in browser localStorage under `SCHOOL_CHAMPIONSHIP_DATA_V3`. Its team entities are grade numbers, duplicated across divisions and sports. Individual athletes have name, sport, gender, grade, score, wins, losses and mutable form arrays. Matches themselves are not persisted. The seed names include fictional characters and must not be treated as real students.

Preserved behavior: boys/girls divisions; all-grade and individual grade filters; search; ranking, name and wins sorting; participant registration and editing; team match recording; football 3/1/0 points and points/GD/GF ordering; volleyball 2/0 points and sets-won tie break; Elo K=32 with rounded updates and floor 100; individual draws; last-five form; CSV downloads.

Unsafe quick wins and direct increments are replaced by complete match records. Demo reset is removed. Elo starting values remain editable, but wins, losses and ratings are derived from chronological records. Changing or deleting a match rebuilds the projection. The original supplied snapshot cannot reconstruct genuine historical results from aggregate totals.

The supplied school logo is `school_logo.jpg`. `Invitus (Seniors).png` explicitly identifies the senior class (Grade 12); `Panthers (Grade 11).png` and `Rising Stars (Grade 10).png` identify their grades. The filename spelling Invitus is retained. No Grade 9 logo was supplied. Parenthetical class suffixes are metadata, not display names. Ambiguous matches are skipped and reported in the asset manifest.

The new app uses a private Sanity dataset, a revision-guarded championship document, server-only credentials and mutations, and separate session/throttle documents. Its initial seed contains classes and season configuration only. No legacy localStorage is read automatically.

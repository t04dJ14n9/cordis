# Cordis 4.0.0-rc.10 isolated bug repros
`npm i && npm run run-all` (Node 20). Each repro exits 1 when the bug is present, 2 on hang-guard (5 s). Output: RESULTS.txt.
| # | Bug | Root cause (node_modules/cordis/lib/index.js) | Upstream | Bug vs design |
|---|---|---|---|---|
| 1 | concurrent dispose doesn't join in-flight release | :888 / :893 | none | bug |
| 2 | dispose hangs on unsettled async apply | :754-756, :971 | none | arguable; hang is a defect |
| 3 | provider torn down before dependents stop | :987 (+ :748/:1184 already-stopping) | #26, PRs #110/#144/#185 | bug |
| 4 | effects released concurrently, incl. rollback | :987 | #26 / PR #144 | bug-ish |
| 5 | late ctx.effect after cancel leaks | :745 + :802-805 | PRs #96/#91 | arguable; leak is a bug |
Nothing has been posted to cordiverse/cordis.

Source mapping (packages/core/src/fiber.ts at v4.0.0-rc.10): bug1 :323/:329; bug2 :195, :422; bug3/4 :440; bug5 :180, :226. Failing vitest cases: `packages/core/tests/bug-repros.spec.ts`.

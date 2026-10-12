# 4. Effects released concurrently, not in reverse order (also on activation-failure rollback)
**Expected:** `second:start,second:end,first:start,first:end`. **Actual:** `second:start,first:start,second:end,first:end` for both dispose and rollback after apply throws.
**Root cause:** `index.js:987` `await Promise.all(this._disposables.clear().map(...))` — starts all disposers at once (order of start is reversed, completion is not serialized). Rollback goes through the same `_unload()` via :975/:981. Note that *within* one effect, children are chained serially (:852-865), so the inconsistency is between fiber level and effect level.
**Fix:** `for (const d of this._disposables.clear()) { try { await d() } catch (e) { log } }` (as PR #144).
**Upstream:** #26 / PR #144 ("Fixes #26"); rollback case possibly untested there. **Judgment:** bug-ish; arguably a design choice (parallel teardown is faster) but contradicts effect-level ordering and breaks dependent resources. Severity: medium.

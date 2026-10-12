# 2. dispose() waits for an unsettled async apply (hangs forever; no cancellation)
**What:** If `apply()` is async and never settles, `fiber.dispose()` never resolves and effects already registered by apply are never released.
**Expected:** dispose begins releasing registered effects (and signals cancellation) without waiting for apply. **Actual:** `dispose settled=false, cleanup ran=false` (bounded at 1 s).
**Root cause:** `index.js:754-756` (plugin disposer loops `while (this.inertia) await this.inertia`) where `inertia` is `_reload()` (:958) which does `await this._execute(this._runner)` (:971) with no abort path; `_unload()` (:981) only runs after apply settles. `_setEpoch` returns early while inertia is set (:955).
**Fix:** start `_unload()` immediately on dispose, expose an `AbortSignal` (e.g. `ctx.signal`) to apply, and treat a later-settling apply as stale (dispose late effects, see bug 5).
**Upstream:** no issue found. **Judgment:** arguable design choice ("wait for init then tear down" is deliberate and safe for cooperative plugins), but the unbounded hang with no cancellation hook is a real defect. Severity: high for hung plugins, low otherwise.

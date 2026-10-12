# 1. Concurrent dispose does not await the in-progress release
**What:** Calling `fiber.dispose()` (or any `ctx.effect()` disposer) a second time while the first call's async teardown is still running resolves immediately with `undefined`.
**Expected:** 2nd call returns/joins the same in-flight promise. **Actual:** resolves at once; `released=false`.
**Root cause:** `node_modules/cordis/lib/index.js:888` (`if (!runner.epoch) return;` in the effect wrapper; same at :893 `disposeAsync`). The first call flips `epoch=false` and returns `task.then(dispose)`, but that promise is not stored, so later calls return nothing. `fiber.dispose` *is* this wrapper (:735).
**Fix:** memoize: `let pending; wrapper = () => pending ??= (runner.epoch = false, task ? task.then(dispose) : Promise.resolve(dispose()))`.
**Upstream:** no existing issue found (see plans draft). **Judgment:** bug (idempotent dispose that lies about completion). Severity: medium.

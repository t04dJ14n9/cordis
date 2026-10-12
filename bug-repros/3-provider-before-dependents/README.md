# 3. Provider torn down before dependents finish stopping
Three repros: direct (`repro.mjs`), transitive leaf→mid→provider, and an already-stopping consumer.
**Expected:** consumer async cleanup sees the service still open; provider's own resources close last. **Actual:** `["provider closed","consumer cleanup saw open=false"]`; transitive: base closes first.
**Root cause:** `index.js:987` — `_unload()` runs all of the provider fiber's disposables concurrently with `Promise.all`. The `ctx.provide` disposer (:1176-1181) does await notified dependents (`fiber.await()` :1179), but the provider's sibling effect that closes the resource runs in parallel, so it doesn't wait. Already-stopping case: the consumer was removed from `runtime.fibers` at :748, so `notify()` (:1184-1198) doesn't return it and nothing waits for it.
**Fix:** serial LIFO teardown (provide registered first ⇒ released last), and track stopping fibers so provider withdrawal also awaits fibers already unloading.
**Upstream:** known — issue cordiverse/cordis#26 (open); fix PRs #110, #144, #185. Already-stopping/transitive variants not seen in those tests. **Judgment:** bug. Severity: high (use-after-close).

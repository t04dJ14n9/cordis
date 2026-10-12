# 5. Late ctx.effect after a cancelled async activation leaks
**What:** async apply acquires a resource, dispose() is requested, then apply calls `ctx.effect(...)` to register cleanup. Registration throws `INACTIVE_EFFECT`, the effect's execute/cleanup never runs and the resource leaks; the throw surfaces as an activation error.
**Expected:** `open=0`. **Actual:** `open=1`.
**Root cause:** `index.js:745` sets `this.uid = null` at dispose start; `effect()` calls `assertActive()` (:850 → :802-805) which throws before anything runs. Nothing disposes what the plugin acquired.
**Fix:** either accept and drain late effects (PR #91) or, when refused, run execute and dispose immediately; downgrade the log.
**Upstream:** related PRs #96 (refuse while UNLOADING) and #91 (drain); no issue. **Judgment:** arguable design (refusal is intentional), but silent leak is a bug in practice. Severity: medium. Depends on bug 2 fix for a clean story.

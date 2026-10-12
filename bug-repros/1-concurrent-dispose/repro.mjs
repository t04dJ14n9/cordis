import { Context } from "cordis"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const within = (p, ms) => Promise.race([p.then(() => true), sleep(ms).then(() => false)])
setTimeout(() => { console.log("FAIL timeout guard (hang)"); process.exit(2) }, 5000).unref()
let failed = false
function report(name, ok, detail) { console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`); if (!ok) failed = true }

// A: a second dispose() while the first is still releasing resolves immediately.
const root = new Context()
let released = false
const fiber = root.plugin({ name: 'p', apply(ctx) {
  ctx.effect(() => async () => { await sleep(100); released = true })
} })
await fiber
const first = fiber.dispose()
await fiber.dispose()           // expected: joins the in-flight release
report('second dispose() waits for in-progress release', released, `released=${released} when 2nd dispose resolved`)
await first
// same for an effect's own disposer called twice
const f2 = root.plugin({ name: 'q', apply() {} }); await f2
let r2 = false
const undo = f2.ctx.effect(() => async () => { await sleep(100); r2 = true })
undo(); await undo()
report('second effect disposer call waits for in-progress release', r2, `released=${r2}`)

process.exit(failed ? 1 : 0)

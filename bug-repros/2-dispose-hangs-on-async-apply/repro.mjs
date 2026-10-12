import { Context } from "cordis"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const within = (p, ms) => Promise.race([p.then(() => true), sleep(ms).then(() => false)])
setTimeout(() => { console.log("FAIL timeout guard (hang)"); process.exit(2) }, 5000).unref()
let failed = false
function report(name, ok, detail) { console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`); if (!ok) failed = true }

// B: dispose() of a fiber whose async apply() has not settled waits for it (forever if it never settles).
const root = new Context()
let cleaned = false
const fiber = root.plugin({ name: 'p', async apply(ctx) {
  ctx.effect(() => () => { cleaned = true })
  await new Promise(() => {})   // uncooperative / hung activation
} })
await sleep(10)
const settled = await within(fiber.dispose(), 1000)
report('dispose() of a stuck activation completes and runs registered cleanup', settled && cleaned, `dispose settled=${settled}, cleanup ran=${cleaned}`)

process.exit(failed ? 1 : 0)

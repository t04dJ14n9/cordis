import { Context } from "cordis"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const within = (p, ms) => Promise.race([p.then(() => true), sleep(ms).then(() => false)])
setTimeout(() => { console.log("FAIL timeout guard (hang)"); process.exit(2) }, 5000).unref()
let failed = false
function report(name, ok, detail) { console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`); if (!ok) failed = true }

// D: an async activation acquires a resource, then registers its cleanup with ctx.effect().
// If dispose() was requested meanwhile, registration throws INACTIVE_EFFECT, the cleanup is
// never run (resource leaks) and the refusal is logged as an activation error.
const root = new Context()
const errors = []
const origErr = console.error
let open = 0
const openHandle = async () => { await sleep(20); open++; return { close() { open-- } } }
const fiber = root.plugin({ name: 'p', async apply(ctx) {
  const handle = await openHandle()          // e.g. a socket / file / watcher
  ctx.effect(() => () => handle.close())
} })
await sleep(5)
await fiber.dispose()                         // requested while openHandle() is in flight
await sleep(50)
report('resource acquired during a cancelled activation is released', open === 0, `open=${open}, loggedErrors=${JSON.stringify(errors)}`)

process.exit(failed ? 1 : 0)

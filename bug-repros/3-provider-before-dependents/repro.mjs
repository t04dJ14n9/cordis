import { Context } from "cordis"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const within = (p, ms) => Promise.race([p.then(() => true), sleep(ms).then(() => false)])
setTimeout(() => { console.log("FAIL timeout guard (hang)"); process.exit(2) }, 5000).unref()
let failed = false
function report(name, ok, detail) { console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`); if (!ok) failed = true }

// C: disposing a provider releases its resources while a dependent is still stopping.
const root = new Context()
const log = []
const provider = root.plugin({ name: 'provider', apply(ctx) {
  const svc = { open: true }
  ctx.provide('svc', svc)
  ctx.effect(() => () => { svc.open = false; log.push('provider closed') })
} })
root.plugin({ name: 'consumer', inject: ['svc'], apply(ctx) {
  const svc = ctx.get('svc')
  ctx.effect(() => async () => { await sleep(50); log.push(`consumer cleanup saw open=${svc.open}`) })
} })
await sleep(20)
await provider.dispose()
await sleep(100)
if (!log.length) throw new Error('consumer never activated')
report('provider resource outlives dependent cleanup', log[0]?.includes('open=true'), JSON.stringify(log))

process.exit(failed ? 1 : 0)

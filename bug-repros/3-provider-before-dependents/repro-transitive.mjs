import { Context } from "cordis"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const within = (p, ms) => Promise.race([p.then(() => true), sleep(ms).then(() => false)])
setTimeout(() => { console.log("FAIL timeout guard (hang)"); process.exit(2) }, 5000).unref()
let failed = false
function report(name, ok, detail) { console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`); if (!ok) failed = true }

// C (transitive): leaf -> mid -> provider. Disposing provider must let leaf and mid finish stopping first.
const root = new Context()
const log = []
const provider = root.plugin({ name: 'provider', apply(ctx) {
  const svc = { open: true }; ctx.provide('base', svc)
  ctx.effect(() => () => { svc.open = false; log.push('base closed') })
} })
root.plugin({ name: 'mid', inject: ['base'], apply(ctx) {
  const base = ctx.get('base'); const mid = { open: true }; ctx.provide('mid', mid)
  ctx.effect(() => async () => { await sleep(30); mid.open = false; log.push(`mid closed (base open=${base.open})`) })
} })
root.plugin({ name: 'leaf', inject: ['mid'], apply(ctx) {
  const mid = ctx.get('mid')
  ctx.effect(() => async () => { await sleep(60); log.push(`leaf cleanup (mid open=${mid.open})`) })
} })
await sleep(20)
await provider.dispose(); await sleep(150)
report('dependents stop (leaf, then mid) before provider closes', log.join() === 'leaf cleanup (mid open=true),mid closed (base open=true),base closed', JSON.stringify(log))

process.exit(failed ? 1 : 0)

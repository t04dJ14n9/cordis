import { Context } from "cordis"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const within = (p, ms) => Promise.race([p.then(() => true), sleep(ms).then(() => false)])
setTimeout(() => { console.log("FAIL timeout guard (hang)"); process.exit(2) }, 5000).unref()
let failed = false
function report(name, ok, detail) { console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`); if (!ok) failed = true }

// E: effects of one fiber are released concurrently, not in reverse order (also on activation-failure rollback).
async function run(fail) {
  const root = new Context()
  const log = []
  const fiber = root.plugin({ name: 'p', async apply(ctx) {
    for (const n of ['first', 'second']) ctx.effect(() => async () => { log.push(`${n}:start`); await sleep(20); log.push(`${n}:end`) })
    if (fail) throw new Error('activation failed')
  } })
  await sleep(10)
  if (!fail) await fiber.dispose()
  await sleep(100)
  return log
}
const want = 'second:start,second:end,first:start,first:end'
const a = (await run(false)).join(); report('dispose releases effects LIFO, one at a time', a === want, a)
const b = (await run(true)).join(); report('rollback after failed activation releases LIFO, one at a time', b === want, b)

process.exit(failed ? 1 : 0)

import { readdirSync } from 'node:fs'; import { spawnSync } from 'node:child_process'
let any = 0
for (const d of readdirSync('.').filter((d) => /^\d-/.test(d)).sort())
  for (const f of readdirSync(d).filter((f) => /^repro.*\.mjs$/.test(f)).sort()) {
    const r = spawnSync('node', [`${d}/${f}`], { encoding: 'utf8', timeout: 10000 })
    console.log(`## ${d}/${f} -> exit ${r.status}\n${r.stdout}${r.stderr ? '[stderr]\n' + r.stderr.slice(0, 1500) : ''}`)
    if (r.status !== 0) any = 1
  }
console.log(any ? 'Bugs reproduced (nonzero exit = bug present).' : 'All pass.')
process.exit(any)

// Failing tests documenting lifecycle bugs in v4.0.0-rc.10. See /bug-repros.
import { Context } from '../src'
import { expect, describe, it } from 'vitest'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const within = (p: Promise<any>, ms: number) => Promise.race([p.then(() => true), sleep(ms).then(() => false)])

describe('rc.10 lifecycle bugs', () => {
  it('1: second dispose() joins in-flight release (fiber.ts:323)', async () => {
    const root = new Context()
    let released = false
    const fiber = await root.plugin((ctx) => {
      ctx.effect(() => async () => { await sleep(50); released = true })
    })
    const first = fiber.dispose()
    await fiber.dispose()
    expect(released).to.equal(true)
    await first
  })

  it('2: dispose() does not hang on unsettled async apply (fiber.ts:195,422)', async () => {
    const root = new Context()
    let cleaned = false
    const fiber = root.plugin(async (ctx) => {
      ctx.effect(() => () => { cleaned = true })
      await new Promise(() => {})
    })
    await sleep(10)
    expect(await within(fiber.dispose(), 500)).to.equal(true)
    expect(cleaned).to.equal(true)
  })

  it('3: provider resources outlive dependent cleanup (fiber.ts:440, #26)', async () => {
    const root = new Context()
    const log: string[] = []
    const provider = root.plugin((ctx) => {
      const svc = { open: true }
      ctx.provide('svc', svc)
      ctx.effect(() => () => { svc.open = false; log.push('provider closed') })
    })
    root.plugin({ inject: ['svc'], apply(ctx) {
      const svc = ctx.get('svc') as any
      ctx.effect(() => async () => { await sleep(30); log.push(`consumer saw open=${svc.open}`) })
    } })
    await sleep(20)
    await provider.dispose()
    await sleep(60)
    expect(log).to.deep.equal(['consumer saw open=true', 'provider closed'])
  })

  for (const fail of [false, true]) {
    it(`4: effects released LIFO one at a time${fail ? ' on rollback' : ''} (fiber.ts:440, #26/#144)`, async () => {
      const root = new Context()
      const log: string[] = []
      const fiber = root.plugin(async (ctx) => {
        for (const n of ['first', 'second']) ctx.effect(() => async () => { log.push(`${n}:start`); await sleep(10); log.push(`${n}:end`) })
        if (fail) throw new Error('activation failed')
      })
      await sleep(10)
      if (!fail) await fiber.dispose()
      await sleep(50)
      expect(log).to.deep.equal(['second:start', 'second:end', 'first:start', 'first:end'])
    })
  }

  it('5: late ctx.effect after cancelled activation does not leak (fiber.ts:180,226)', async () => {
    const root = new Context()
    let open = 0
    const fiber = root.plugin(async (ctx) => {
      await sleep(20); open++
      ctx.effect(() => () => { open-- })
    })
    await sleep(5)
    await fiber.dispose()
    await sleep(40)
    expect(open).to.equal(0)
  })
})

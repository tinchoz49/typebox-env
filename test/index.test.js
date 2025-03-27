import assert from 'node:assert'
import { describe, it } from 'node:test'

import { Type } from '@sinclair/typebox'

import { JSON, parseEnv, SplitArray } from '../src/index.js'

describe('parseEnv', () => {
  it('should work', () => {
    const schema = Type.Object({
      NUM: Type.Number(),
      FOO_BAR: Type.Optional(SplitArray(Type.String())),
      BAZ: Type.Optional(Type.String()),
      JSON: JSON(Type.Object({
        foo: Type.String(),
        bar: Type.String(),
      })),
      DEEP: Type.Object({
        NESTED: Type.Object({
          FOO: Type.String(),
        }),
        BAR: Type.String(),
      }),
      UNION: Type.Union([
        Type.Object({
          FOO: Type.String(),
        }),
        Type.Object({
          BAR: Type.String(),
        }),
      ]),
    })

    const env = {
      NUM: '123',
      FOO_BAR: 'a,b,c',
      BAZ: 'qux',
      JSON: '{"foo":"bar","bar":"baz"}',
      DEEP_NESTED_FOO: 'qux',
      DEEP_BAR: 'baz',
      UNION_FOO: 'a',
    }

    const result = parseEnv(schema, env)
    assert.deepEqual(result, {
      NUM: 123,
      FOO_BAR: ['a', 'b', 'c'],
      BAZ: 'qux',
      JSON: {
        foo: 'bar',
        bar: 'baz',
      },
      DEEP: {
        NESTED: {
          FOO: 'qux',
        },
        BAR: 'baz',
      },
      UNION: {
        FOO: 'a',
      },
    })
  })

  // it('should fail when JSON.parse fails', () => {
  //   const schema = Type.Object({
  //     JSON: JSON(Type.Object({
  //       foo: Type.String(),
  //       bar: Type.String(),
  //     })),
  //   })

  //   const env = {
  //     JSON: '{"foo":"bar","bar":"baz"',
  //   }

  //   assert.throws(() => parseEnv(schema, env))
  // })
})

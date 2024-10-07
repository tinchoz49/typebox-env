import assert from 'node:assert'
import { describe, it } from 'node:test'

import { Type } from '@sinclair/typebox'

import { JSON, parseEnv, SplitArray } from '../src/index.js'

describe('parseEnv', () => {
  it('should work', () => {
    const schema = Type.Object({
      FOO_BAR: SplitArray(Type.String()),
      BAZ: Type.String(),
      JSON: JSON({
        foo: Type.String(),
        bar: Type.String(),
      }),
      DEEP: Type.Object({
        NESTED: Type.Object({
          FOO: Type.String(),
        }),
        BAR: Type.String(),
      }),
    })

    const env = {
      FOO_BAR: 'a,b,c',
      BAZ: 'qux',
      JSON: '{"foo":"bar","bar":"baz"}',
      DEEP_NESTED_FOO: 'qux',
      DEEP_BAR: 'baz',
    }

    const result = parseEnv(schema, env)

    assert.deepEqual(result, {
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
    })
  })

  it('should fail when JSON.parse fails', () => {
    const schema = Type.Object({
      JSON: JSON({
        foo: Type.String(),
        bar: Type.String(),
      }),
    })

    const env = {
      JSON: '{"foo":"bar","bar":"baz"',
    }

    assert.throws(() => parseEnv(schema, env))
  })
})

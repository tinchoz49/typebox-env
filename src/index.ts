import type { ArrayOptions, Static, TSchema } from '@sinclair/typebox'

import { CloneType, Type, TypeGuard } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { dset } from 'dset'

function flattenEnv<T extends Record<string, unknown>>(obj: T, prefix = ''): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const newKey = prefix ? `${prefix}_${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flattenEnv(value as Record<string, unknown>, newKey))
    } else {
      acc[newKey] = value
    }

    return acc
  }, {})
}

function parseJSON<T extends TSchema>(schema: T, value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return globalThis.JSON.parse(value)
  } catch (error) {
    if (TypeGuard.IsObject(schema) || TypeGuard.IsRecord(schema)) {
      return {}
    }

    if (TypeGuard.IsArray(schema)) {
      return []
    }

    return null
  }
}

export const JSON = <T extends TSchema>(schema: T) => {
  return CloneType(schema, { $json: true })
}

export const SplitArray = <T extends TSchema>(
  schema: T,
  options: ArrayOptions & { delimiter?: string } = {}
) => {
  const { delimiter = ',', ...arrayOptions } = options
  return Type.Array(schema, { ...arrayOptions, $split: delimiter })
}

export function parseEnv<T extends TSchema>(schema: T, env: Record<string, unknown>): Static<T> {
  const prefixedEnv = flattenEnv(Value.Clone(env))

  function addPrefixes(schema: TSchema, prefix: string[] = [], envKey: string): void {
    if (TypeGuard.IsObject(schema) && !schema.$json) {
      Object.entries(schema.properties).forEach(([key, value]) => {
        const nextPrefix = [...prefix, key]
        const envKey = nextPrefix.join('_')
        addPrefixes(value, nextPrefix, envKey)
      })
      return
    } else if (schema.$json && envKey in env) {
      const value = parseJSON(schema, env[envKey])
      dset(prefixedEnv, prefix.join('.'), value)
      return
    }

    if (schema.$split && envKey in env) {
      let value = env[envKey]
      if (typeof value === 'string') {
        value = value.split(schema.$split)
      }
      dset(prefixedEnv, prefix.join('.'), value)
      return
    }

    if (TypeGuard.IsUnion(schema)) {
      schema.anyOf.forEach((item) => {
        addPrefixes(item, prefix, envKey)
      })
      return
    }

    if (TypeGuard.IsIntersect(schema)) {
      schema.allOf.forEach((item) => {
        addPrefixes(item, prefix, envKey)
      })
      return
    }

    if (envKey in prefixedEnv) {
      dset(prefixedEnv, prefix.join('.'), prefixedEnv[envKey])
    }
  }

  addPrefixes(schema, [], '')
  let result = Value.Default(schema, prefixedEnv)
  result = Value.Clean(schema, result)
  result = Value.Convert(schema, result)
  Value.Assert(schema, result)
  return result
}

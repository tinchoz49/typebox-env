import type { Static, TSchema } from 'typebox'

import { dset } from 'dset'
import { Type } from 'typebox'
import { Value } from 'typebox/value'

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
    if (Type.IsObject(schema) || Type.IsRecord(schema)) {
      return {}
    }

    if (Type.IsArray(schema)) {
      return []
    }

    return null
  }
}

export const JSON = <T extends Type.TObject>(schema: T): T => {
  return Type.Object(schema.properties, { $json: true, required: schema.required }) as T
}

export const SplitArray = <T extends TSchema>(
  schema: T,
  options: Type.TArrayOptions & { delimiter?: string } = {}
) => {
  const { delimiter = ',', ...arrayOptions } = options
  return Type.Array(schema, { ...arrayOptions, $split: delimiter })
}

export function parseEnv<T extends TSchema>(schema: T, env: Record<string, unknown>): Static<T> {
  const prefixedEnv = flattenEnv(Value.Clone(env))

  function addPrefixes(schema: TSchema, prefix: string[] = [], envKey: string): void {
    if (Type.IsObject(schema) && !('$json' in schema)) {
      Object.entries(schema.properties).forEach(([key, value]) => {
        const nextPrefix = [...prefix, key]
        const envKey = nextPrefix.join('_')
        addPrefixes(value, nextPrefix, envKey)
      })
      return
    } else if ('$json' in schema && envKey in env) {
      const value = parseJSON(schema, env[envKey])
      dset(prefixedEnv, prefix.join('.'), value)
      return
    }

    if ('$split' in schema && envKey in env) {
      let value = env[envKey]
      if (typeof value === 'string') {
        value = value.split((schema as any).$split)
      }
      dset(prefixedEnv, prefix.join('.'), value)
      return
    }

    if (Type.IsUnion(schema)) {
      schema.anyOf.forEach((item) => {
        addPrefixes(item, prefix, envKey)
      })
      return
    }

    if (Type.IsIntersect(schema)) {
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

type DeepPartialArray<T> = Array<DeepPartial<T>>

type DeepPartialObject<T> = {
  [K in keyof T]?: DeepPartial<T[K]>;
}

/**
 * Makes all properties in T optional recursively
 * @template T - The type to make partially optional
 */
type DeepPartial<T> = T extends Function
  ? T
  : T extends Array<infer InferredArrayMember>
    ? DeepPartialArray<InferredArrayMember>
    : T extends object
      ? DeepPartialObject<T>
      : T | undefined

/**
 * Converts a TypeBox schema to a type with all properties optional
 */
export type OptionalEnv<T extends TSchema> = DeepPartial<Static<T>>

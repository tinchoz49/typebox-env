/** @import { TSchema, ArrayOptions, Static } from '@sinclair/typebox' */

import { CloneType, Type, TypeGuard } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'
import { dset } from 'dset'

/**
 * @template {TSchema} T
 * @param {T} schema
 * @param {unknown} value
 * @returns {unknown}
 */
function parseJSON(schema, value) {
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

/**
 * @template {TSchema} T
 * @param {T} schema
 */
export const JSON = (schema) => {
  return CloneType(schema, { $json: true })
}

/**
 * @template {TSchema} T
 * @param {T} schema
 * @param {ArrayOptions & { delimiter?: string }} [options]
 */
export const SplitArray = (schema, options = {}) => {
  const { delimiter = ',', ...arrayOptions } = options
  return Type.Array(schema, { ...arrayOptions, $split: delimiter })
}

/**
 * @template {TSchema} T
 * @param {T} schema
 * @param {Record<string, unknown>} env
 * @returns {Static<T>}
 */
export function parseEnv(schema, env) {
  const prefixedEnv = Value.Clone(env)

  /**
   * @param {TSchema} schema
   * @param {string[]} prefix
   * @param {string} envKey
   */
  function addPrefixes(schema, prefix = [], envKey) {
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

    if (envKey in env) {
      dset(prefixedEnv, prefix.join('.'), env[envKey])
    }
  }

  addPrefixes(schema, [], '')
  let result = Value.Default(schema, prefixedEnv)
  result = Value.Clean(schema, result)
  result = Value.Convert(schema, result)
  Value.Assert(schema, result)
  return result
}

/**
 * @template T
 * @export
 * @typedef {Array<DeepPartial<T>>} DeepPartialArray
 */

/**
 * @template T
 * @export
 * @typedef {{ [K in keyof T]?: DeepPartial<T[K]> }} DeepPartialObject
 */

/**
 * Makes all properties in T optional recursively
 * @template T - The type to make partially optional
 * @typedef {T extends Function
 * ? T
 * : T extends Array<infer InferredArrayMember>
 * ? DeepPartialArray<InferredArrayMember>
 * : T extends object
 * ? DeepPartialObject<T>
 * : T | undefined
 * } DeepPartial
 */

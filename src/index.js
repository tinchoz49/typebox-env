/** @import { TSchema, ArrayOptions, Static } from '@sinclair/typebox' */

import { CloneType, Type, TypeGuard } from '@sinclair/typebox'
import { HasTransform, Value } from '@sinclair/typebox/value'

// @ts-ignore
function dset(obj, keys, val) {
  keys.split && (keys = keys.split('.'))
  let i = 0
  const l = keys.length
  let t = obj
  let x
  let k
  while (i < l) {
    k = '' + keys[i++]
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') break
    if (i === l) {
      if (!(k in t)) {
        t = t[k] = val
      }
    } else {
      t = t[k] = (typeof (x = t[k]) === typeof (keys)) ? x : (keys[i] * 0 !== 0 || !!~('' + keys[i]).indexOf('.')) ? {} : []
    }
  }
}

/**
 * @template {TSchema} T
 * @param {T} schema
 */
export const JSON = (schema) => {
  return Type.Transform(CloneType(schema, { $json: true }))
    .Decode((value) => {
      try {
        return globalThis.JSON.stringify(value)
      } catch (error) {
        return '{}'
      }
    })
    .Encode((value) => {
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
    })
}

/**
 * @template {TSchema} T
 * @param {T} schema
 * @param {ArrayOptions & { delimiter?: string }} [options]
 */
export const SplitArray = (schema, options = {}) => {
  const { delimiter = ',', ...arrayOptions } = options

  return Type.Transform(Type.Array(schema, arrayOptions))
    .Decode((value) => {
      if (Array.isArray(value)) {
        return value.join(delimiter)
      }

      return []
    })
    .Encode((value) => {
      if (Array.isArray(value)) {
        return value
      }

      if (typeof value === 'string') {
        return value.split(delimiter)
      }

      return value
    })
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
  let result = HasTransform(schema, []) ? Value.Encode(schema, prefixedEnv) : prefixedEnv
  result = Value.Default(schema, result)
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

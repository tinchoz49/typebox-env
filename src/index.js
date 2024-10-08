/** @import { TSchema, ArrayOptions, Static } from '@sinclair/typebox' */

import { Type, TypeGuard } from '@sinclair/typebox'
import { HasTransform, Value } from '@sinclair/typebox/value'
import { dset } from 'dset'

/**
 * @template {TSchema} T
 * @param {T} schema
 */
export const JSON = (schema) => {
  return Type.Transform(schema)
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
   * @param {string[]} [parentPrefix]
   */
  function addPrefixes(schema, parentPrefix = []) {
    Object.entries(schema.properties).forEach(([key, value]) => {
      const currentPrefix = parentPrefix ? [...parentPrefix, key] : [key]
      const envKey = currentPrefix.join('_')
      if (TypeGuard.IsObject(value)) {
        addPrefixes(value, currentPrefix)
      } else if (TypeGuard.IsUnion(value)) {
        value.anyOf.forEach((item) => {
          if (TypeGuard.IsObject(item)) {
            addPrefixes(/** @type {TSchema} */ (item), currentPrefix)
          } else if (envKey in env) {
            dset(prefixedEnv, currentPrefix.join('.'), env[envKey])
          }
        })
      } else if (envKey in env) {
        dset(prefixedEnv, currentPrefix.join('.'), env[envKey])
      }
    })
  }

  addPrefixes(schema)

  let result = HasTransform(schema, []) ? Value.Encode(schema, prefixedEnv) : prefixedEnv
  result = Value.Default(schema, result)
  result = Value.Clean(schema, result)
  result = Value.Convert(schema, result)
  Value.Assert(schema, result)
  return result
}

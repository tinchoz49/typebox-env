/** @import { TSchema, TObject, TString, TArray, Static } from '@sinclair/typebox' */

import { Type, TypeGuard } from '@sinclair/typebox'
import { HasTransform, Value } from '@sinclair/typebox/value'
import { dset } from 'dset'

/**
 * @template {TObject} T
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
      try {
        return globalThis.JSON.parse(value)
      } catch (error) {
        return value
      }
    })
}

/**
 * @template {TArray<TString>} T
 * @param {T} schema
 * @param {string} delimiter
 */
export const SplitArray = (schema, delimiter = ',') => {
  if (!(TypeGuard.IsArray(schema))) {
    throw new Error('SplitArray can only be used on arrays')
  }

  return Type.Transform(schema)
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

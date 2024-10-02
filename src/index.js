/** @import { TSchema, TProperties, ObjectOptions, ArrayOptions, Static } from '@sinclair/typebox' */

import { Type, TypeGuard } from '@sinclair/typebox'
import { HasTransform, Value } from '@sinclair/typebox/value'
import { dset } from 'dset'

/**
 * @template {TProperties} T
 * @param {T} properties
 * @param {ObjectOptions} [options]
 */
export const JSON = (properties, options) => {
  return Type.Transform(Type.Object(properties, options))
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

'use strict'

/* eslint-disable no-self-compare, block-spacing */

// Glossary
//
// merge   = structural join
// put     = specialised merge = use new structure, preserve old values
// patch   = specialised merge = create union structure, preserve old values
// replace = blindly replace
// extend  = blindly add/replace properties, omitting nil
//
// Exports include old words (put = replace, patch = merge) for backwards
// compability.

const {freeze, isFrozen, keys, prototype: objectProto, getPrototypeOf} = Object
const {reduce, slice} = Array.prototype

/**
 * Reading
 */

exports.read = read
function read () {
  return reduce.call(arguments, readAtKey)
}

exports.readAt = readAt
function readAt (path, value) {
  return reduce.call(path, readAtKey, value)
}

/**
 * Merging
 */

exports.put = put
function put (prev, next) {
  return replaceWith(putObject, prev, next)
}

exports.replaceAt = putAt  // backwards compat alias
exports.putAt = putAt
function putAt (path, tree, branch) {
  return replaceAt(path, tree, put(readAt(path, tree), branch))
}

exports.patch = patch
function patch (prev, next) {
  return replaceWith(patchObject, prev, next)
}

exports.mergeAt = patchAt  // backwards compat alias
exports.patchAt = patchAt
function patchAt (path, tree, branch) {
  return replaceAt(path, tree, patch(readAt(path, tree), branch))
}

function putObject (prev, next) {
  return mapNextValues(prev, next, put, nonNil)
}

function patchObject (prev, next) {
  return extend(prev, mapNextValues(prev, next, patch, nonDeepEqual))
}

function replaceAt (path, tree, branch) {
  return is(readAt(path, tree), branch)
    ? tree
    : !path.length
    ? branch
    : extend(tree, pair(path[0], replaceAt(tail(path), readAtKey(tree, path[0]), branch)))
}

function replaceWith (func, prev, next) {
  return is(prev, next)
    ? prev
    : reuseOrReplace(prev, (
      both(isPlainObject, prev, next)
      ? func(prev, next)
      : copy(next)
    ))
}

function reuseOrReplace (prev, next) {
  return deepEqual(prev, next) ? prev : next
}

function extend (prev, next) {
  return size(next) ? _extend(prev, next) : prev
}

/**
 * Value
 */

// For primitives and data objects, creates a deeply immutable copy. Reuses
// other objects as-is. See rationale in readme.
exports.immutableClone = copy  // backwards compat alias, inaccurate
exports.copy = copy
function copy (value) {
  return isPrimitive(value) || isFrozen(value)
    ? value
    : isArray(value)
    ? freeze(value.map(copy))
    : isPlainObject(value)
    ? mapValues(value, copy, nonNil)
    : value
}

function readAtKey (value, key) {
  return isObject(value) ? value[key] : undefined
}

function size (object) {return keys(object).length}

function tail (list) {return slice.call(list, 1)}

/**
 * Boolean
 */

exports.deepEqual = deepEqual
function deepEqual (one, other) {
  return is(one, other)
    ? true
    : both(isArray, one, other)
    ? arraysDeepEqual(one, other)
    : both(isPlainObject, one, other)
    ? objectsDeepEqual(one, other)
    : false
}

function arraysDeepEqual (one, other) {
  return everyArrayPair(one, other, deepEqual)
}

function objectsDeepEqual (one, other) {
  return everyObjectPair(one, other, deepEqual)
}

function nonDeepEqual (one, other) {
  return !deepEqual(one, other)
}

// SameValueZero
exports.is = is
function is (one, other) {
  return one === other || one !== one && other !== other
}

function isPrimitive (value) {
  return !isObject(value) && !isFunction(value)
}

function isArray (value) {
  return value instanceof Array
}

function isFunction (value) {
  return typeof value === 'function'
}

function isObject (value) {
  return value !== null && typeof value === 'object'
}

function isPlainObject (value) {
  return isObject(value) && isPlainObjectProto(getPrototypeOf(value))
}

function isPlainObjectProto (value) {
  return value === null || value === objectProto
}

function both (func, one, other) {
  return func(one) && func(other)
}

function nonNil (value) {
  return value != null
}

/**
 * Procedural
 */

function everyArrayPair (one, other, func) {
  if (one.length !== other.length) return false
  for (let i = -1; ++i < one.length || i < other.length;) {
    if (!func(one[i], other[i])) return false
  }
  return true
}

function everyObjectPair (one, other, func) {
  const prevKeys = keys(one)
  return (
    prevKeys.length === size(other) &&
    // Shallow breadth-first check in case a value has been added or removed.
    prevKeys.every(key => key in other) &&
    // Now do a depth-first comparison.
    prevKeys.every(key => func(one[key], other[key]))
  )
}

function mapValues (object, func, filter) {
  const out = {}
  for (const key in object) {
    const value = func(object[key])
    if (filter(value)) out[key] = value
  }
  return freeze(out)
}

function mapNextValues (prev, next, func, filter) {
  const out = {}
  for (const key in next) {
    const value = func(prev[key], next[key])
    if (filter(value, prev[key])) out[key] = value
  }
  return freeze(out)
}

function pair (key, value) {
  const out = {}
  out[key] = value
  return out
}

function _extend (object, part) {
  const out = {}
  for (const key in object) {
    if (!(key in part) || part[key] != null) out[key] = object[key]
  }
  for (const key in part) if (part[key] != null) out[key] = part[key]
  return freeze(out)
}

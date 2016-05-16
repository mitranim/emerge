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
// Exporting under old aliases for backwards compability.

const {freeze} = Object
const {reduce, slice} = Array.prototype

/**
 * Reading
 */

exports.readAt = readAt
function readAt (path, value) {
  return reduce.call(path, readAtKey, value)
}

exports.read = read
function read () {
  return reduce.call(arguments, readAtKey)
}

/**
 * Merging
 */

exports.replaceAt = putAt  // BC alias
exports.putAt = putAt
function putAt (path, tree, branch) {
  return replaceAt(path, tree, putAtRoot(readAt(path, tree), branch))
}

exports.mergeAt = patchAt  // BC alias
exports.patchAt = patchAt
function patchAt (path, tree, branch) {
  return replaceAt(path, tree, patchAtRoot(readAt(path, tree), branch))
}

/* #if TESTING
exports.putAtRoot = putAtRoot
#endif */
function putAtRoot (prev, next) {
  return setWith(putObject, prev, next)
}

function putObject (prev, next) {
  return mapNextValues(prev, next, putAtRoot, nonNil)
}

/* #if TESTING
exports.patchAtRoot = patchAtRoot
#endif */
function patchAtRoot (prev, next) {
  return setWith(patchObject, prev, next)
}

function patchObject (prev, next) {
  return extend(prev, mapNextValues(prev, next, patchAtRoot, nonDeepEqual))
}

function replaceAt (path, tree, branch) {
  return is(readAt(path, tree), branch)
    ? tree
    : !path.length
    ? branch
    : extend(tree, pair(path[0], replaceAt(tail(path), readAtKey(tree, path[0]), branch)))
}

function setWith (func, prev, next) {
  return deepEqual(prev, next)
    ? prev
    : both(isPlainObject, prev, next)
    ? func(prev, next)
    : copy(next)
}

function extend (prev, next) {
  return size(next) ? _extend(prev, next) : prev
}

/**
 * Value
 */

// For non-frozen plain objects and arrays, creates a deeply immutable copy.
// Other values remain unchanged. Reasoning:
// * Primitives are already immutable.
// * Frozen objects are expected to be deeply immutable and don't need cloning.
// * Objects that aren't arrays or plain objects are often mutable agents
//   (e.g. XMLHttpRequest) rather than data, and copying doesn't make sense.
//   Passing them through allows the user to take responsibility and store
//   anything in the tree.
exports.immutableClone = copy  // BC alias, inaccurate
exports.copy = copy
function copy (value) {
  return isPrimitive(value) || Object.isFrozen(value)
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

function size (object) {return Object.keys(object).length}

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
  return isObject(value) && (value.constructor === Object || !('constructor' in value))
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
  if (size(one) !== size(other)) return false
  for (const key in one) {
    if (!(key in other) || !func(one[key], other[key])) return false
  }
  return true
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

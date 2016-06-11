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
// Some public words are aliased for backwards compatibility.

const {freeze, isFrozen, keys, prototype: protoObject, getPrototypeOf} = Object
const {reduce, slice} = Array.prototype

const pub = exports  // for minification

/**
 * Reading
 */

pub.get = get
function get (value, key) {
  return value == null ? undefined : value[key]
}

pub.scan = scan
pub.read = scan  // BC alias
function scan () {
  return reduce.call(arguments, get)
}

pub.getIn = getIn
function getIn (value, path) {
  return reduce.call(path, get, value)
}

pub.getAt = getAt
pub.readAt = getAt  // BC alias
function getAt (path, value) {
  return reduce.call(path, get, value)
}

/**
 * Merging
 */

pub.put = put
function put (prev, next) {
  return replaceWith(putObject, prev, next)
}

pub.replaceAt = putAt  // BC alias
pub.putAt = putAt
function putAt (path, tree, branch) {
  return replaceAt(path, tree, put(getAt(path, tree), branch))
}

pub.patch = patch
function patch (prev, next) {
  return replaceWith(patchObject, prev, next)
}

pub.mergeAt = patchAt  // BC alias
pub.patchAt = patchAt
function patchAt (path, tree, branch) {
  return replaceAt(path, tree, patch(getAt(path, tree), branch))
}

function putObject (prev, next) {
  return mapNextValues(prev, next, put, nonNil)
}

function patchObject (prev, next) {
  return extend(prev, mapNextValues(prev, next, patch, nonDeepEqual))
}

function replaceAt (path, tree, branch) {
  return is(getAt(path, tree), branch)
    ? tree
    : !path.length
    ? branch
    : extend(tree, pair(path[0], replaceAt(tail(path), get(tree, path[0]), branch)))
}

function replaceWith (fun, prev, next) {
  return is(prev, next)
    ? prev
    : reuseOrReplace(prev, (
      both(isPlainObject, prev, next)
      ? fun(prev, next)
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
pub.immutableClone = copy  // BC alias, inaccurate
pub.copy = copy
function copy (value) {
  return isPrimitive(value) || isFrozen(value)
    ? value
    : isArray(value)
    ? freeze(value.map(copy))
    : isPlainObject(value)
    ? mapValues(value, copy, nonNil)
    : value
}

function size (object) {return keys(object).length}

function tail (list) {return slice.call(list, 1)}

/**
 * Boolean
 */

pub.deepEqual = deepEqual
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
pub.is = is
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
  return value === null || value === protoObject
}

function both (fun, one, other) {
  return fun(one) && fun(other)
}

function nonNil (value) {
  return value != null
}

/**
 * Procedural
 */

function everyArrayPair (one, other, fun) {
  if (one.length !== other.length) return false
  for (let i = -1; ++i < one.length || i < other.length;) {
    if (!fun(one[i], other[i])) return false
  }
  return true
}

function everyObjectPair (one, other, fun) {
  const prevKeys = keys(one)
  return (
    prevKeys.length === size(other) &&
    // Shallow breadth-first check in case a value has been added or removed.
    prevKeys.every(key => key in other) &&
    // Now do a depth-first comparison.
    prevKeys.every(key => fun(one[key], other[key]))
  )
}

function mapValues (object, fun, filter) {
  const out = {}
  for (const key in object) {
    const value = fun(object[key])
    if (filter(value)) out[key] = value
  }
  return freeze(out)
}

function mapNextValues (prev, next, fun, filter) {
  const out = {}
  for (const key in next) {
    const value = fun(prev[key], next[key])
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

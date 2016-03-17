'use strict'

const freeze = Object.freeze
const reduce = Array.prototype.reduce
const isBlob = typeof Blob === 'function' ? x => x instanceof Blob : () => false

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

exports.replaceAt = replaceAt
function replaceAt (path, prev, next) {
  return !path.length
    ? replace(prev, next)
    : deepEqual(readAt(path, prev), next)
    ? prev
    : mergeAt(path, mergeAt(path, prev, undefined), next)
}

exports.mergeAt = mergeAt
function mergeAt (path, prev, next) {
  return merge(prev, nestedValue(next, path))
}

/* #if TESTING
exports.replace = replace
#endif */
function replace (prev, next) {
  return substitute(prev, next, replaceObject)
}

function replaceObject (prev, next) {
  return mapRightPairs(prev, next, replace, nonNil)
}

/* #if TESTING
exports.merge = merge
#endif */
function merge (prev, next) {
  return substitute(prev, next, mergeObject)
}

function mergeObject (prev, next) {
  return mergePatch(prev, mapRightPairs(prev, next, merge, nonDeepEqual))
}

function substitute (prev, next, substituteObject) {
  return deepEqual(prev, next)
    ? prev
    : both(prev, next, isPlainObject)
    ? substituteObject(prev, next)
    : immutableClone(next)
}

/**
 * Values
 */

// Makes an immutable deep clone, ignoring keys with nil values.
// Acts as identity for frozen objects, trusting them to be deeply immutable
// (i.e. coming from emerge). As a special exception, considers blobs to be
// immutable (their properties usually aren't, but their contents are).
exports.immutableClone = immutableClone
function immutableClone (value) {
  return isPrimitive(value) || Object.isFrozen(value)
    ? value
    : isArray(value)
    ? freeze(value.map(immutableClone))
    : isBlob(value)
    ? value
    : mapValues(value, immutableClone, nonNil)
}

function readAtKey (value, key) {
  return isObject(value) ? value[key] : undefined
}

function nestedValue (value, path) {
  return path.reduceRight(enclose, value)
}

function mergePatch (object, patch) {
  return size(patch) ? extendObject(object, patch, nonNil) : object
}

function size (object) {
  return Object.keys(object).length
}

/**
 * Boolean
 */

exports.deepEqual = deepEqual
function deepEqual (one, other) {
  return is(one, other)
    ? true
    : either(one, other, isPrimitive) ||
      either(one, other, isFunction) ||
      xor(one, other, isArray)
    ? false
    : both(one, other, isArray)
    ? arraysDeepEqual(one, other)
    : objectsDeepEqual(one, other)
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
  return one === other || one !== one && other !== other  // eslint-disable-line
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

function both (one, other, func) {
  return func(one) && func(other)
}

function either (one, other, func) {
  return func(one) || func(other)
}

function xor (one, other, func) {
  return func(one) !== func(other)
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
  const buffer = {}
  for (const key in object) {
    const value = func(object[key])
    if (filter(value)) buffer[key] = value
  }
  return freeze(buffer)
}

function mapRightPairs (left, right, func, filter) {
  const buffer = {}
  for (const key in right) {
    const value = func(left[key], right[key])
    if (filter(value, left[key])) buffer[key] = value
  }
  return freeze(buffer)
}

function extendObject (object, patch, filter) {
  const buffer = {}
  for (const key in object) {
    if (!(key in patch) || filter(patch[key])) buffer[key] = object[key]
  }
  for (const key in patch) {
    if (filter(patch[key])) buffer[key] = patch[key]
  }
  return freeze(buffer)
}

function enclose (value, key) {
  const buffer = {}
  buffer[key] = value
  return buffer
}

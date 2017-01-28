'use strict'

// # Glossary
//
// put               = replace value, attempting to preserve old references
// patch             = merge value, attempting to preserve old references
// merge             = patch dicts together (potentially many at once)
// nil               = null or undefined
// value             = primitive | array | plain dict | frozen dict
// mutable reference = non-value
//
// # Internal glossary
//
// replace = (put | patch) value depending on provided semantics
//
// # Rules
//
// When making new values, omit nil properties.
//
// Treat mutable references atomically: include and replace them entirely,
// without cloning or attempting to reuse their properties.
//
// # API Index
//
// get
// scan          -- derived from get
// getIn         -- derived from get
// getAt         -- derived from get
//
// is            -- reference equality
// equal         -- value equality
// equalBy       -- shallow equality with custom test
//
// putIn
// putAt
//
// patchIn
// patchAt
//
// # TODO
//
// Add benchmarks with real-life data.
//
// Clean up, rewrite as much as possible in functional style without hurting
// performance.


const {freeze, keys: getKeys, prototype: protoObject, getPrototypeOf} = Object
const {reduce, slice} = Array.prototype
const pub = exports

/**
 * Boolean
 */

pub.is = is
function is (one, other) {
  return one === other || one !== one && other !== other
}

pub.equal = equal
function equal (one, other) {
  return equalBy(equal, one, other)
}

pub.equalBy = equalBy
function equalBy (test, one, other) {
  return is(one, other) || (
    isList(one) && isList(other)
    ? everyListPair(test, one, other)
    : isDict(one) && isDict(other)
    ? everyDictPair(test, one, other)
    : false
  )
}

/**
 * Reading
 */

pub.get = get
function get (value, key) {
  return value == null ? undefined : value[key]
}

pub.scan = scan
function scan () {
  return arguments.length ? reduce.call(arguments, get) : undefined
}

pub.getIn = getIn
function getIn (value, path) {
  return reduce.call(path, get, value)
}

pub.getAt = getAt
function getAt (path, value) {
  return reduce.call(path, get, value)
}

/**
 * Merging
 */

pub.putIn = putIn
function putIn (prev, path, next) {
  return replaceIn(prev, path, put(getIn(prev, path), next))
}

pub.putAt = putAt
function putAt (path, prev, next) {
  return replaceIn(prev, path, put(getIn(prev, path), next))
}

pub.putInBy = putInBy
function putInBy (prev, path, fun) {
  validate(isFunction, fun)
  return putIn(prev, path, fun(getIn(prev, path), ...slice.call(arguments, 3)))
}

pub.patchIn = patchIn
function patchIn (prev, path, next) {
  return replaceIn(prev, path, patch(getIn(prev, path), next))
}

pub.patchAt = patchAt
function patchAt (path, prev, next) {
  return replaceIn(prev, path, patch(getIn(prev, path), next))
}

pub.patchInBy = patchInBy
function patchInBy (prev, path, fun) {
  validate(isFunction, fun)
  return patchIn(prev, path, fun(getIn(prev, path), ...slice.call(arguments, 3)))
}

pub.put = put
function put (prev, next) {
  return replaceBy(put, putDict, prev, next)
}

pub.patch = patch
function patch (prev, next) {
  return replaceBy(patch, patchDict, prev, next)
}

pub.merge = merge
function merge () {
  return reduce.call(arguments, mergeTwo, {})
}

function mergeTwo (prev, next) {
  return patch(prev, toDict(next))
}

// FIXME write tests
pub.mergeBy = mergeBy
function mergeBy (fun, prev, next) {
  return mergeDictBy(fun, toDict(prev), toDict(next))
}

/**
 * Procedural Merge
 *
 * TODO convert to functional style where possible
 */

// TODO version that only needs one function rather than two
function replaceBy (replace, replaceDict, prev, next) {
  return (
    is(prev, next)
    ? prev
    : isList(prev) && isList(next)
    ? replaceListBy(replace, prev, next)
    : isDict(prev) && isDict(next)
    ? replaceDict(prev, next)
    : next
  )
}

function replaceListBy (replace, prev, next) {
  const out = Array(next.length)
  for (let i = -1; ++i < next.length;) out[i] = replace(prev[i], next[i])
  return equalBy(is, prev, out) ? prev : freeze(out)
}

function putDict (prev, next) {
  return replaceDictBy(put, prev, next)
}

function patchDict (prev, next) {
  return mergeDictBy(patch, prev, next)
}

function replaceDictBy (replace, prev, next) {
  const mutDict = {}
  const nextKeys = getKeys(next)
  for (let i = -1; ++i < nextKeys.length;) {
    const key = nextKeys[i]
    const piece = replace(prev[key], next[key], key)
    if (piece != null) mutDict[key] = piece
  }
  return equalBy(is, prev, mutDict) ? prev : freeze(mutDict)
}

function mergeDictBy (merge, prev, next) {
  const mutDict = {}
  const prevKeys = getKeys(prev)
  for (let i = -1; ++i < prevKeys.length;) {
    const key = prevKeys[i]
    if (!(key in next) && prev[key] != null) mutDict[key] = prev[key]
  }
  const nextKeys = getKeys(next)
  for (let i = -1; ++i < nextKeys.length;) {
    const key = nextKeys[i]
    const piece = merge(prev[key], next[key], key)
    if (piece != null) mutDict[key] = piece
  }
  return equalBy(is, prev, mutDict) ? prev : freeze(mutDict)
}

function replaceIn (prev, path, next) {
  return (
    !path.length
    ? next
    : replaceKey(prev, path[0], replaceIn(get(prev, path[0]), slice.call(path, 1), next))
  )
}

function replaceKey (prev, key, next) {
  return (
    get(prev, key) == null && next == null
    ? prev
    : isListWithIndex(prev, key)
    ? replaceListIndex(prev, key, next)
    : replaceDictKey((isDict(prev) ? prev : freeze({})), String(key), next)
  )
}

function replaceListIndex (list, index, value) {
  if (index < list.length && is(list[index], value)) return list
  const mut = list.slice()
  mut[index] = value
  return freeze(mut)
}

function replaceDictKey (dict, key, value) {
  if (is(dict[key], value)) return dict
  if (!(key in dict) && value == null) return dict
  const mutDict = {}
  const oldKeys = getKeys(dict)
  for (let i = -1; ++i < oldKeys.length;) {
    const oldkey = oldKeys[i]
    if (oldkey !== key && dict[oldkey] != null) mutDict[oldkey] = dict[oldkey]
  }
  if (value != null) mutDict[key] = value
  return freeze(mutDict)
}

/**
 * Utils
 */

function isList (value) {
  return value instanceof Array
}

function isObject (value) {
  return value !== null && typeof value === 'object'
}

function isDict (value) {
  return isObject(value) && isPlainObjectProto(getPrototypeOf(value))
}

function isPlainObjectProto (value) {
  return value === null || value === protoObject
}

function isNatural (value) {
  return typeof value === 'number' && value >= 0 && value % 1 === 0
}

// within bounds + 1
function isListWithIndex (value, key) {
  return isList(value) && isNatural(key) && key <= value.length
}

function isFunction (value) {
  return typeof value === 'function'
}

function everyListPair (fun, one, other) {
  return one.length === other.length && everyBy(compareByIndex, one, fun, other)
}

function compareByIndex (value, i, fun, list) {
  return fun(value, list[i])
}

function everyDictPair (fun, one, other) {
  const keys = getKeys(one)
  return (
    keys.length === getKeys(other).length &&
    // Breadth-first check in case a key has been added or removed
    everyBy(has, keys, other) &&
    // Now a depth-first comparison
    everyBy(compareByKey, keys, fun, one, other)
  )
}

function has (key, _i, dict) {
  return key in dict
}

function compareByKey (key, _i, fun, one, other) {
  return fun(one[key], other[key])
}

function everyBy (fun, list, a, b, c) {
  for (let i = -1; ++i < list.length;) if (!fun(list[i], i, a, b, c)) return false
  return true
}

function toDict (value) {
  return isDict(value) ? value : {}
}

function validate (test, value) {
  if (!test(value)) throw Error(`Expected ${value} to satisfy test ${test.name}`)
}

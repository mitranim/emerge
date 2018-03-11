// # Glossary
//
// put               = replace value, attempting to preserve old references
// patch             = same as put, but if both input values are dicts,
//                     combines their contents
// merge             = deep patch that combines dict contents at all levels
// nil               = null | undefined
// value             = primitive | list | plain dict
//
// # Internal glossary
//
// assoc = insert value at key or path, using an equality check to attempt to
//         preserve old references (weaker than put or patch)
//
// # Rules
//
// When making new values, omit nil properties.
//
// Treat non-value objects atomically: include and replace them entirely,
// without cloning or attempting to reuse their properties.
//
// # TODO
//
// Add benchmarks with real-life data.

const {keys: getKeys, prototype: protoObject, getPrototypeOf} = Object
const {hasOwnProperty} = protoObject
const {reduce, filter, slice} = Array.prototype

/**
 * Boolean
 */

export function is(one, other) {
  return one === other || (one !== one && other !== other)  // eslint-disable-line no-self-compare
}

export function equal(one, other) {
  return equalBy(equal, other, one)
}

export function equalBy(fun, other, one) {
  validate(fun, isFunction)
  return is(one, other) || (
    isList(one) && isList(other)
    ? everyListPair(one, other, fun)
    : isDict(one) && isDict(other)
    ? everyDictPair(one, other, fun)
    : false
  )
}

/**
 * Get
 */

export function get(value, key) {
  return value == null ? undefined : value[key]
}

export function scan() {
  return arguments.length ? reduce.call(arguments, get) : undefined
}

export function getIn(value, path) {
  return reduce.call(path, get, value)
}

export function getAt(path, value) {
  return reduce.call(path, get, value)
}

/**
 * Merge
 */

export function put(prev, next) {
  return putBy(put, prev, next)
}

export function patch(prev, next) {
  return patchBy(put, prev, next)
}

export function merge(prev, next) {
  return patchBy(merge, prev, next)
}

export function putIn(prev, path, next) {
  validate(path, isPath)
  return assocIn(prev, path, put(getIn(prev, path), next))
}

export function patchIn(prev, path, next) {
  validate(path, isPath)
  return assocIn(prev, path, patch(getIn(prev, path), next))
}

export function mergeIn(prev, path, next) {
  validate(path, isPath)
  return assocIn(prev, path, merge(getIn(prev, path), next))
}

export function putBy(fun, prev, next) {
  return (
    is(prev, next)
    ? prev
    : isList(prev) && isList(next)
    ? putListBy(prev, next, fun)
    : isDict(prev) && isDict(next)
    ? putDictBy(prev, next, fun)
    : next
  )
}

export function patchBy(fun, prev, next) {
  return (
    is(prev, next)
    ? prev
    : isList(prev) && isList(next)
    ? putListBy(prev, next, fun)
    : isDict(prev) && isDict(next)
    ? patchDictBy(prev, next, fun)
    : next
  )
}

export function putInBy(prev, path, fun) {
  validate(fun, isFunction)
  return putIn(prev, path, fun(getIn(prev, path), ...slice.call(arguments, 3)))
}

export function patchDicts() {
  return filter.call(arguments, isDict).reduce(patch, {})
}

export function mergeDicts() {
  return filter.call(arguments, isDict).reduce(merge, {})
}

/**
 * Merge (internal)
 */

function putListBy(prev, next, fun) {
  const out = Array(next.length)
  for (let i = -1; (i += 1) < next.length;) out[i] = fun(prev[i], next[i], i)
  return preserveBy(prev, out, is)
}

function putDictBy(prev, next, fun) {
  const out = {}
  const nextKeys = getKeys(next)
  for (let i = -1; (i += 1) < nextKeys.length;) {
    const key = nextKeys[i]
    const value = fun(prev[key], next[key], key)
    if (value != null) out[key] = value
  }
  return preserveBy(prev, out, is)
}

function patchDictBy(prev, next, fun) {
  const out = {}
  const prevKeys = getKeys(prev)
  for (let i = -1; (i += 1) < prevKeys.length;) {
    const key = prevKeys[i]
    if (prev[key] != null && !hasOwnProperty.call(next, key)) out[key] = prev[key]
  }
  const nextKeys = getKeys(next)
  for (let i = -1; (i += 1) < nextKeys.length;) {
    const key = nextKeys[i]
    const value = fun(prev[key], next[key], key)
    if (value != null) out[key] = value
  }
  return preserveBy(prev, out, is)
}

function assocIn(prev, path, next) {
  validate(path, isPath)
  if (is(getIn(prev, path), next)) return prev
  return preserveBy(prev, (
    !path.length
    ? next
    : assoc(prev, path[0], assocIn(get(prev, path[0]), slice.call(path, 1), next))
  ), is)
}

function assoc(prev, key, next) {
  return (
    get(prev, key) == null && next == null
    ? prev
    : isListWithIndex(prev, key)
    ? assocOnList(prev, key, next)
    : assocOnDict(toDict(prev), key, next)
  )
}

// Assumes isListWithIndex(list, index)
function assocOnList(list, index, value) {
  if (index < list.length && is(list[index], value)) return list
  const out = list.slice()
  out[index] = value
  return out
}

function assocOnDict(dict, maybeKey, value) {
  const key = String(maybeKey)
  if (is(dict[key], value)) return dict
  if (value == null && !hasOwnProperty.call(dict, key)) return dict
  const out = {}
  const oldKeys = getKeys(dict)
  for (let i = -1; (i += 1) < oldKeys.length;) {
    const oldkey = oldKeys[i]
    if (oldkey !== key && dict[oldkey] != null) out[oldkey] = dict[oldkey]
  }
  if (value != null) out[key] = value
  return out
}

/**
 * Utils
 */

function isPrimitive(value) {
  return !isObject(value) && !isFunction(value)
}

function isObject(value) {
  return value !== null && typeof value === 'object'
}

function isDict(value) {
  return isObject(value) && isPlainPrototype(getPrototypeOf(value))
}

function isPlainPrototype(value) {
  return value === null || value === protoObject
}

function isList(value) {
  return isObject(value) && (
    isArguments(value) ||
    (!isPlainPrototype(getPrototypeOf(value)) && isNatural(value.length))
  )
}

function isArguments(value) {
  return isObject(value) && isNatural(value.length) && hasOwnProperty.call(value, 'callee')
}

function isFunction(value) {
  return typeof value === 'function'
}

function isNatural(value) {
  return typeof value === 'number' && value >= 0 && (value % 1) === 0
}

function isPath(value) {
  return isList(value) && value.every(isPrimitive)
}

// allowed range: within bounds + 1 to allow append
function isListWithIndex(value, key) {
  return isList(value) && isNatural(key) && key <= value.length
}

function everyListPair(one, other, fun) {
  return one.length === other.length && everyBy(one, compareByIndex, fun, other)
}

function compareByIndex(value, index, fun, list) {
  return fun(value, list[index])
}

function everyDictPair(one, other, fun) {
  const keys = getKeys(one)
  return (
    keys.length === getKeys(other).length &&
    // Breadth-first check in case a key has been added or removed
    everyBy(keys, has, other) &&
    // Now a depth-first comparison
    everyBy(keys, compareByKey, fun, one, other)
  )
}

function has(key, _index, dict) {
  return hasOwnProperty.call(dict, key)
}

function compareByKey(key, _index, fun, one, other) {
  return fun(one[key], other[key])
}

function everyBy(list, fun, a, b, c) {
  for (let i = -1; (i += 1) < list.length;) if (!fun(list[i], i, a, b, c)) return false
  return true
}

function preserveBy(prev, next, fun) {
  return equalBy(fun, next, prev) ? prev : next
}

function toDict(value) {
  return isDict(value) ? value : {}
}

function validate(value, test) {
  if (!test(value)) throw Error(`Expected ${show(value)} to satisfy test ${show(test)}`)
}

function show(value) {
  return isFunction(value)
    ? (value.name || value.toString())
    : isList(value) || isDict(value)
    ? JSON.stringify(value)
    : String(value)
}

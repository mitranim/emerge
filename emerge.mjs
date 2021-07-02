// See glossary and implementation notes in `impl.md`.

/* Bool */

export function is(one, other) {
  return one === other || (isNaN(one) && isNaN(other))
}

export function equal(one, other) {
  return equalBy(other, one, equal)
}

export function equalBy(one, other, fun) {
  valid(fun, isFun)
  if (is(one, other)) return true
  if (isArr(one)) return isArr(other) && everyListPairBy(one, other, fun)
  if (isDict(one)) return isDict(other) && everyDictPairBy(one, other, fun)
  return false
}

/* Get */

export function get(val, key) {
  return isNil(val) ? undefined : val[key]
}

export function getIn(val, path) {
  valid(path, isArr)
  return fold(path, val, get)
}

export function scan() {
  return fold1(arguments, get)
}

/* Update */

export function put(prev, key, val) {
  validKey(key)
  return assoc(prev, key, putAny(get(prev, key), val))
}

export function putIn(prev, path, next) {
  validPath(path)
  return assocIn(prev, path, putAny(getIn(prev, path), next))
}

export function putBy(prev, key, fun, ...rest) {
  valid(fun, isFun)
  return put(prev, key, fun(get(prev, key), ...rest))
}

export function putInBy(prev, path, fun, ...rest) {
  valid(fun, isFun)
  return putIn(prev, path, fun(getIn(prev, path), ...rest))
}

export function patch(prev, next) {
  if (arguments.length > 2) return fold1(arguments, patchTwo)
  return patchTwo(prev, next)
}

export function merge(prev, next) {
  if (arguments.length > 2) return fold1(arguments, mergeTwo)
  return mergeTwo(prev, next)
}

export function insert(list, index, val) {
  list = onlyArray(list)
  validBounds(list, index)
  list = list.slice()
  list.splice(index, 0, val)
  return list
}

export function remove(val, key) {
  if (isArr(val)) {
    valid(key, isInt)
    return listRemove(val, key)
  }
  validKey(key)
  return dictRemove(onlyDict(val), key)
}

// Too much logic, support code, and overhead. TODO simplify.
export function removeIn(val, path) {
  validPath(path)
  if (!path.length) return undefined

  val = onlyData(val)
  if (!hasIn(val, path)) return val

  const prefix = init(path)
  return assocIn(val, prefix, remove(getIn(val, prefix), last(path)))
}

/* Update (internal) */

function putAny(prev, next) {
  return (
    is(prev, next)
    ? prev
    : isArr(prev)
    ? (isArr(next) ? listReplaceBy(prev, next, putAny) : next)
    : isDict(prev)
    ? (isDict(next) ? dictReplaceBy(prev, next, putAny) : next)
    : next
  )
}

function patchTwo(prev, next) {
  prev = onlyDict(prev)
  next = onlyDict(next)
  if (is(prev, next)) return prev
  return patchBy(prev, next, putAny)
}

function mergeTwo(prev, next) {
  return mergeTwoAny(onlyDict(prev), onlyDict(next))
}

// Unlike `mergeTwo`, doesn't require operands to be dicts; replaces non-dicts.
function mergeTwoAny(prev, next) {
  if (is(prev, next)) return prev
  return patchBy(toDict(prev), toDict(next), mergeOrPut)
}

function mergeOrPut(prev, next) {
  return isDict(next) ? mergeTwoAny(prev, next) : putAny(prev, next)
}

function assoc(prev, key, next) {
  if (isArr(prev)) return listPut(prev, key, next)
  return dictPut(onlyDict(prev), key, next)
}

function assocIn(prev, path, next) {
  return path.length ? assocInAt(prev, path, next, 0) : next
}

function assocInAt(prev, path, next, index) {
  const key = path[index]
  return index < path.length - 1
    ? assoc(prev, key, assocInAt(get(prev, key), path, next, index + 1))
    : assoc(prev, key, next)
}

function listPut(list, index, val) {
  validBounds(list, index)
  if (index < list.length && is(list[index], val)) return list
  const out = list.slice()
  out[index] = val
  return out
}

function dictPut(dict, key, val) {
  key = String(key)
  if (has(dict, key) && is(dict[key], val)) return dict
  const out = {}
  assign(out, dict)
  out[key] = val
  return out
}

function listRemove(list, index) {
  if (isNat(index) && index < list.length) {
    list = list.slice()
    list.splice(index, 1)
  }
  return list
}

function dictRemove(dict, key) {
  key = String(key)
  if (!has(dict, key)) return dict
  const out = {}
  for (const dkey in dict) {
    if (dkey === key) continue
    out[dkey] = dict[dkey]
  }
  return equalBy(dict, out, is) ? dict : out
}

function listReplaceBy(prev, next, fun) {
  const out = Array(next.length)
  for (let i = 0; i < next.length; i += 1) out[i] = fun(prev[i], next[i])
  return equalBy(prev, out, is) ? prev : out
}

function dictReplaceBy(prev, next, fun) {
  const out = {}
  for (const key in next) out[key] = fun(prev[key], next[key])
  return equalBy(prev, out, is) ? prev : out
}

function patchBy(prev, next, fun) {
  const out = {}
  assign(out, prev)
  for (const key in next) out[key] = fun(prev[key], next[key])
  return equalBy(prev, out, is) ? prev : out
}

/* Utils */

function validPath(val) {
  valid(val, isArr)
  val.forEach(validKey)
}

function validKey(val) {
  // The readme explains why we do this.
  if (isSym(val)) throw Error(`unexpected symbol key ${show(val)}`)
  valid(val, isViableAsKey)
}

// Note that when accessing a dict property, a number is converted to a string.
function isViableAsKey(val) {return isStr(val) || isFin(val)}

function isNil(val) {return val == null}
function isNum(val) {return typeof val === 'number'}
function isFin(val) {return isNum(val) && !isNaN(val) && !isInf(val)}
function isNaN(val) {return val !== val}
function isInf(val) {return val === Infinity || val === -Infinity}
function isObj(val) {return val !== null && typeof val === 'object'}
function isArr(val) {return isObj(val) && val instanceof Array}
function isFun(val) {return typeof val === 'function'}
function isInt(val) {return typeof val === 'number' && (val % 1) === 0}
function isNat(val) {return isInt(val) && val >= 0}
function isStr(val) {return typeof val === 'string'}
function isSym(val) {return typeof val === 'symbol'}

function isDict(val) {
  if (!isObj(val)) return false
  const proto = Object.getPrototypeOf(val)
  return proto === null || proto === Object.prototype
}

function everyListPairBy(one, other, fun) {
  if (one.length !== other.length) return false
  for (let i = 0; i < one.length; i += 1) {
    if (!fun(one[i], other[i])) return false
  }
  return true
}

function everyDictPairBy(one, other, fun) {
  // Breadth-first: compare key sets.
  for (const key in one)   if (!has(other, key)) return false
  for (const key in other) if (!has(one, key))   return false

  // Now a depth-first comparison.
  for (const key in one) if (!fun(one[key], other[key])) return false
  return true
}

function fold(list, acc, fun, a, b, c, d, e) {
  for (let i = 0; i < list.length; i += 1) {
    acc = fun(acc, list[i], i, a, b, c, d, e)
  }
  return acc
}

function fold1(list, fun, a, b, c, d, e) {
  let acc = list[0]
  for (let i = 1; i < list.length; i += 1) {
    acc = fun(acc, list[i], i, a, b, c, d, e)
  }
  return acc
}

// Requires extreme care: when calling this on a dict, a numeric key must be
// converted to a string first.
function has(val, key) {
  return isObj(val) && Object.prototype.hasOwnProperty.call(val, key)
}

// Suspicious. Would prefer to get rid of this.
function hasIn(val, path) {
  return fold(path, val, getOrMissing) !== missing
}

const missing = Symbol()

function getOrMissing(val, key) {
  key = String(key)
  return has(val, key) ? val[key] : missing
}

function assign(out, src) {
  for (const key in src) out[key] = src[key]
}

function onlyData(val) {
  return isArr(val) ? val : onlyDict(val)
}

function onlyArray(val) {
  if (isNil(val)) return []
  valid(val, isArr)
  return val
}

function onlyDict(val) {
  if (isNil(val)) return {}
  valid(val, isDict)
  return val
}

function toDict(val) {return isDict(val) ? val : {}}
function init(list) {return list.slice(0, list.length - 1)}
function last(list) {return list[list.length - 1]}

function validBounds(list, index) {
  valid(index, isNat)
  if (!(index <= list.length)) {
    throw Error(`index ${index} out of bounds for length ${list.length}`)
  }
}

function valid(val, test) {
  if (!test(val)) throw Error(`expected ${show(val)} to satisfy test ${show(test)}`)
}

function show(val) {
  if (isFun(val) && val.name) return val.name
  if (isStr(val) || isArr(val) || isDict(val)) {
    try {return JSON.stringify(val)}
    catch (_) {return String(val)}
  }
  return String(val)
}

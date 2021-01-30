/*
# Glossary

put    = replace property by key / path / index, preserving as many references as possible.
remove = remove property by key / path / index, preserving as many references as possible.
patch  = combine dicts, preserving as many references as possible.
merge  = deep patch that combines dicts at all levels.
nil    = null | undefined.
value  = primitive | list | plain dict.

# Internal glossary

These terms are used for some internal functions analogous to the external API
but are more specialized, don't validate inputs as rigorously, etc.

assoc = same as `put`, but checks equality only by reference; used internally
        by `put` and `putIn`.

# Special Rules

Treat non-value objects atomically: include and replace them entirely, without
cloning.

# Performance notes

Emerge seeks a balance of performance and simplicity.

`put`, `patch` and other functions tend to speculatively create a new data
structure before testing it for equality, possibly throwing it away. Should
revisit the code and avoid this where possible.

`putIn` could be defined as a recursive `put`, but would be significantly slower
due to redundant equality checks on every level. A single nested `put`, with a
single equality check, followed by multiple assoc, is much faster.

In modern V8, our simple `fold` and `fold1` seem to perform as a well as an
inline loop, and much better than `Array.prototype.reduce`.

In modern V8, native rest and spread has almost no meaningful overhead compared
to hardcoding a fixed set of additional parameters.

# TODO

Add benchmarks with large real-world data.
*/

// Minifiable aliases
const Object_ = Object;
const Array_ = Array;
const NOP = Object.prototype;

/* Bool */

export function is(one, other) {
  return one === other || (isNaN(one) && isNaN(other));
}

export function equal(one, other) {
  return equalBy(other, one, equal);
}

export function equalBy(one, other, fun) {
  validate(fun, isFunction);
  return (
    is(one, other) ||
    (isArray(one)
      ? isArray(other) && everyListPairBy(one, other, fun)
      : isDict(one)
      ? isDict(other) && everyDictPairBy(one, other, fun)
      : false)
  );
}

/* Get */

export function get(value, key) {
  return isNil(value) ? undefined : value[key];
}

export function getIn(value, path) {
  validate(path, isArray);
  return fold(path, value, get);
}

export function scan(...args) {
  return fold1(args, get);
}

/* Update */

export function put(prev, key, value) {
  validateKey(key);
  return assoc(prev, key, putAny(get(prev, key), value));
}

export function putMut(prev, key, value) {
  validateKey(key);
  return assocMut(prev, key, putAnyMut(get(prev, key), value));
}

export function putIn(prev, path, next) {
  validatePath(path);
  return assocIn(prev, path, putAny(getIn(prev, path), next));
}

export function putInMut(prev, path, next) {
  validatePath(path);
  return assocInMut(prev, path, putAnyMut(getIn(prev, path), next));
}

export function putBy(prev, key, fun, ...rest) {
  validate(fun, isFunction);
  return put(prev, key, fun(get(prev, key), ...rest));
}

export function putByMut(prev, key, fun, ...rest) {
  validate(fun, isFunction);
  return putMut(prev, key, fun(get(prev, key), ...rest));
}

export function putInBy(prev, path, fun, ...rest) {
  validate(fun, isFunction);
  return putIn(prev, path, fun(getIn(prev, path), ...rest));
}

export function putInByMut(prev, path, fun, ...rest) {
  validate(fun, isFunction);
  return putInMut(prev, path, fun(getIn(prev, path), ...rest));
}

export function patch(...args) {
  if (args.length > 2) return fold1(args, patchTwo);
  return patchTwo(...args);
}

export function patchMut(...args) {
  if (args.length > 2) return fold1(args, patchTwoMut);
  return patchTwoMut(...args);
}

export function merge(...args) {
  if (args.length > 2) return fold1(args, mergeTwo);
  return mergeTwo(...args);
}

export function mergeMut(...args) {
  if (args.length > 2) return fold1(args, mergeTwoMut);
  return mergeTwoMut(...args);
}

export function insert(list, index, value) {
  list = onlyArray(list);
  validateBounds(list, index);
  list = list.slice();
  list.splice(index, 0, value);
  return list;
}

export function insertMut(list, index, value) {
  list = onlyArray(list);
  validateBounds(list, index);
  list.splice(index, 0, value);
  return list;
}

export function remove(value, key) {
  if (isArray(value)) {
    validate(key, isInteger);
    return listRemove(value, key);
  }
  validateKey(key);
  return dictRemove(onlyDict(value), key);
}

export function removeMut(value, key) {
  if (isArray(value)) {
    validate(key, isInteger);
    return listRemoveMut(value, key);
  }
  validateKey(key);
  return dictRemoveMut(onlyDict(value), key);
}

// Too much logic, support code, and overhead. TODO simplify.
export function removeIn(value, path) {
  validatePath(path);
  if (!path.length) return undefined;

  value = onlyData(value);
  if (!hasIn(value, path)) return value;

  const prefix = init(path);
  return assocIn(value, prefix, remove(getIn(value, prefix), last(path)));
}

export function removeInMut(value, path) {
  validatePath(path);
  if (!path.length) return undefined;

  value = onlyData(value);
  if (!hasIn(value, path)) return value;

  const prefix = init(path);
  return assocInMut(value, prefix, removeMut(getIn(value, prefix), last(path)));
}

/* Update (internal) */

function putAny(prev, next) {
  return is(prev, next)
    ? prev
    : isArray(prev)
    ? isArray(next)
      ? listReplaceBy(prev, next, putAny)
      : next
    : isDict(prev)
    ? isDict(next)
      ? dictReplaceBy(prev, next, putAny)
      : next
    : next;
}

function putAnyMut(prev, next) {
  return is(prev, next)
    ? prev
    : isArray(prev)
    ? isArray(next)
      ? listReplaceByMut(prev, next, putAnyMut)
      : next
    : isDict(prev)
    ? isDict(next)
      ? dictReplaceByMut(prev, next, putAnyMut)
      : next
    : next;
}

function patchTwo(prev, next) {
  prev = onlyDict(prev);
  next = onlyDict(next);
  if (is(prev, next)) return prev;
  return patchBy(prev, next, putAny);
}

function patchTwoMut(prev, next) {
  prev = onlyDict(prev);
  next = onlyDict(next);
  if (is(prev, next)) return prev;
  return patchByMut(prev, next, putAnyMut);
}

function mergeTwo(prev, next) {
  return mergeTwoAny(onlyDict(prev), onlyDict(next));
}

function mergeTwoMut(prev, next) {
  return mergeTwoAnyMut(onlyDict(prev), onlyDict(next));
}

// Unlike `mergeTwo`, doesn't require operands to be dicts; replaces non-dicts.
function mergeTwoAny(prev, next) {
  if (is(prev, next)) return prev;
  return patchBy(toDict(prev), toDict(next), mergeOrPut);
}

function mergeTwoAnyMut(prev, next) {
  if (is(prev, next)) return prev;
  return patchByMut(toDict(prev), toDict(next), mergeOrPutMut);
}

function mergeOrPut(prev, next) {
  return isDict(next) ? mergeTwoAny(prev, next) : putAny(prev, next);
}

function mergeOrPutMut(prev, next) {
  return isDict(next) ? mergeTwoAnyMut(prev, next) : putAnyMut(prev, next);
}

function assoc(prev, key, next) {
  if (isArray(prev)) return listPut(prev, key, next);
  return dictPut(onlyDict(prev), key, next);
}

function assocMut(prev, key, next) {
  if (isArray(prev)) return listPutMut(prev, key, next);
  return dictPutMut(onlyDict(prev), key, next);
}

function assocIn(prev, path, next) {
  return path.length ? assocInAt(prev, path, next, 0) : next;
}

function assocInMut(prev, path, next) {
  return path.length ? assocInAtMut(prev, path, next, 0) : next;
}

function assocInAt(prev, path, next, index) {
  const key = path[index];
  return index < path.length - 1
    ? assoc(prev, key, assocInAt(get(prev, key), path, next, index + 1))
    : assoc(prev, key, next);
}

function assocInAtMut(prev, path, next, index) {
  const key = path[index];
  return index < path.length - 1
    ? assocMut(prev, key, assocInAtMut(get(prev, key), path, next, index + 1))
    : assocMut(prev, key, next);
}

function listPut(list, index, value) {
  validateBounds(list, index);
  if (index < list.length && is(list[index], value)) return list;
  const out = list.slice();
  out[index] = value;
  return out;
}

function listPutMut(list, index, value) {
  validateBounds(list, index);
  if (index < list.length && is(list[index], value)) return list;
  list[index] = value;
  return list;
}

function dictPut(dict, key, value) {
  key = String(key);
  if (has(dict, key) && is(dict[key], value)) return dict;
  const out = {};
  assign(out, dict);
  out[key] = value;
  return out;
}

function dictPutMut(dict, key, value) {
  key = String(key);
  if (has(dict, key) && is(dict[key], value)) return dict;
  dict[key] = value;
  return dict;
}

function listRemove(list, index) {
  if (isNatural(index) && index < list.length) {
    list = list.slice();
    list.splice(index, 1);
  }
  return list;
}

function listRemoveMut(list, index) {
  if (isNatural(index) && index < list.length) {
    list.splice(index, 1);
  }
  return list;
}

function dictRemove(dict, key) {
  key = String(key);
  if (!has(dict, key)) return dict;
  const out = {};
  for (const dkey in dict) {
    if (dkey === key) continue;
    out[dkey] = dict[dkey];
  }
  return equalBy(dict, out, is) ? dict : out;
}

function dictRemoveMut(dict, key) {
  key = String(key);
  if (!has(dict, key)) return dict;
  delete dict[key];
  return dict;
}

function listReplaceBy(prev, next, fun) {
  const out = Array_(next.length);
  for (let i = 0; i < next.length; i += 1) out[i] = fun(prev[i], next[i]);
  return equalBy(prev, out, is) ? prev : out;
}

function listReplaceByMut(prev, next, fun) {
  for (let i = 0; i < next.length; i += 1) {
    assignIfChanged(prev, i, fun(prev[i], next[i]));
  }
  if (next.length < prev.length) {
    prev.splice(next.length, prev.length - next.length);
  }
  return prev;
}

function dictReplaceBy(prev, next, fun) {
  const out = {};
  for (const key in next) out[key] = fun(prev[key], next[key]);
  return equalBy(prev, out, is) ? prev : out;
}

function dictReplaceByMut(prev, next, fun) {
  for (const key in next) {
    assignIfChanged(prev, key, fun(prev[key], next[key]));
  }
  for (const key in prev) if (!has(next, key)) delete prev[key];
  return prev;
}

function patchBy(prev, next, fun) {
  const out = {};
  assign(out, prev);
  for (const key in next) out[key] = fun(prev[key], next[key]);
  return equalBy(prev, out, is) ? prev : out;
}

function patchByMut(prev, next, fun) {
  for (const key in next) {
    assignIfChanged(prev, key, fun(prev[key], next[key]));
  }
  return prev;
}

/* Utils */

// Avoid reassignment of same value, for immer's sake
function assignIfChanged(prev, key, nextVal) {
  if (!is(prev[key], nextVal)) {
    prev[key] = nextVal;
  }
  return prev;
}

function validatePath(value) {
  validate(value, isArray);
  value.forEach(validateKey);
}

function validateKey(value) {
  // The readme explains why we do this.
  if (isSymbol(value)) throw Error(`unexpected symbol key ${show(value)}`);
  validate(value, isViableAsKey);
}

// Note that when accessing a dict property, a number is converted to a string.
function isViableAsKey(value) {
  return isString(value) || isFinite(value);
}

function isNumber(value) {
  return typeof value === "number";
}

function isFinite(value) {
  return isNumber(value) && !isNaN(value) && !isInfinity(value);
}

function isNaN(value) {
  return value !== value; // eslint-disable-line no-self-compare
}

function isInfinity(value) {
  return value === Infinity || value === -Infinity;
}

function isObject(value) {
  return value !== null && typeof value === "object";
}

function isDict(value) {
  if (!isObject(value)) return false;
  const proto = Object_.getPrototypeOf(value);
  return proto === null || proto === NOP;
}

function isArray(value) {
  return isObject(value) && value instanceof Array_;
}

function isFunction(value) {
  return typeof value === "function";
}

function isInteger(value) {
  return typeof value === "number" && value % 1 === 0;
}

function isNatural(value) {
  return isInteger(value) && value >= 0;
}

function isString(value) {
  return typeof value === "string";
}

function isSymbol(value) {
  return typeof value === "symbol";
}

function everyListPairBy(one, other, fun) {
  if (one.length !== other.length) return false;
  for (let i = 0; i < one.length; i += 1) {
    if (!fun(one[i], other[i])) return false;
  }
  return true;
}

function everyDictPairBy(one, other, fun) {
  // Breadth-first: compare key sets.
  for (const key in one) if (!has(other, key)) return false;
  for (const key in other) if (!has(one, key)) return false;

  // Now a depth-first comparison.
  for (const key in one) if (!fun(one[key], other[key])) return false;
  return true;
}

function fold(list, acc, fun, ...rest) {
  for (let i = 0; i < list.length; i += 1) {
    acc = fun(acc, list[i], i, ...rest);
  }
  return acc;
}

function fold1(list, fun, ...rest) {
  let [acc] = list;
  for (let i = 1; i < list.length; i += 1) {
    acc = fun(acc, list[i], i, ...rest);
  }
  return acc;
}

// Requires extreme care: when calling this on a dict, a numeric key must be
// converted to a string first.
function has(value, key) {
  return isObject(value) && NOP.hasOwnProperty.call(value, key);
}

// Suspicious. Would prefer to get rid of this.
function hasIn(value, path) {
  return fold(path, value, getOrMissing) !== missing;
}

const missing = Symbol("missing");

function getOrMissing(value, key) {
  key = String(key);
  return has(value, key) ? value[key] : missing;
}

function assign(out, src) {
  for (const key in src) out[key] = src[key];
}

function onlyData(value) {
  return isArray(value) ? value : onlyDict(value);
}

function onlyArray(value) {
  if (isNil(value)) return [];
  validate(value, isArray);
  return value;
}

function onlyDict(value) {
  if (isNil(value)) return {};
  validate(value, isDict);
  return value;
}

function toDict(value) {
  return isDict(value) ? value : {};
}

function isNil(value) {
  return value == null;
}

function init(list) {
  return list.slice(0, list.length - 1);
}

function last(list) {
  return list[list.length - 1];
}

function validateBounds(list, index) {
  validate(index, isNatural);
  if (!(index <= list.length)) {
    throw Error(`index ${index} out of bounds for length ${list.length}`);
  }
}

function validate(value, test) {
  if (!test(value)) {
    throw Error(`expected ${show(value)} to satisfy test ${show(test)}`);
  }
}

function show(value) {
  return isFunction(value)
    ? value.name || value.toString()
    : isArray(value) || isDict(value)
    ? JSON.stringify(value)
    : isString(value)
    ? `"${value}"`
    : String(value);
}

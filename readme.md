## Description

Utilities for using plain JavaScript dicts and lists as <a href="https://en.wikipedia.org/wiki/Immutable_object" target="_blank">immutable</a> data structures, with structural equality and memory-efficient updates using structural sharing.

JS and JSON have half-decent generic data structures, barring a few flaws:

1) Updates always mutate in-place.
2) No value equality, only reference equality.
3) Only strings and symbols as dict keys.
4) No sets, or no custom equality for ES2015 sets.
5) No ordered dicts.
6) Poor algorithmic complexity on list shift/unshift/splice.

Emerge addresses (1) and (2). It provides functions to "update" dicts and lists by creating new versions that share as much structure as possible with old versions. This is known as [#_structural sharing_](#structural-sharing). It conserves memory and allows to use identity ([#`is`](#isone-other)) on sibling values as a fast substitute for "proper" value equality ([#`equal`](#equalone-other)), which Emerge also provides.

Inspired by [Clojure's ideas](https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/AreWeThereYet.md) and the [`clojure.core`](https://clojuredocs.org/core-library) data utils.

FP-friendly: only plain JS dicts and lists, no classes, no OO, bring your own data. Faster than all alternatives that I measured. Very lightweight (≈8 KiB _un_-minified), dependency-free. Written as one file with simple ES2015 exports. A good module bundler and minifier should drop out any functions you don't use.

Compatible with native JS modules.

## TOC

* [#Description](#description)
* [#Why](#why)
* [#Installation](#installation)
* [#API](#api)
  * [#`put`](#putprev-key-value)
  * [#`putIn`](#putinprev-path-value)
  * [#`putBy`](#putbyprev-key-fun-args)
  * [#`putInBy`](#putinbyprev-path-fun-args)
  * [#`patch`](#patchdicts)
  * [#`merge`](#mergedicts)
  * [#`insert`](#insertlist-index-value)
  * [#`remove`](#removevalue-key)
  * [#`removeIn`](#removeinvalue-path)
  * [#`is`](#isone-other)
  * [#`equal`](#equalone-other)
  * [#`equalBy`](#equalbyone-other-fun)
  * [#`get`](#getvalue-key)
  * [#`getIn`](#getinvalue-path)
  * [#`scan`](#scanvalue-path)
* [#Merge Semantics](#merge-semantics)
* [#Structural Sharing](#structural-sharing)
* [#Gotchas](#gotchas)
* [#Compatibility](#compatibility)
* [#Changelog](#changelog)
* [#License](#license)

## Why

### Why not ImmutableJS or something similar?

1. Plain data. Emerge uses plain dicts and lists.

  * Uniform interface to data: read at path, set at path, merge. Just a few functions that work on all structures.
  * Easy to explore in a REPL.
  * No need for interop calls.
  * Complete compatibility with JSON.

2. Size. At the time of writing, ImmutableJS is ≈ 57 KiB minified, unacceptable.
   Emerge is just a handful of KiB minified.

3. Performance. Emerge is probably about as efficient as this kind of stuff gets.

### Why not SeamlessImmutable?

SI is a popular library for merging and patching dicts and lists. Like Emerge, it sticks with plain JS data structures, and provides similar functions to Emerge.

At the time of writing, Emerge is _way_ faster, more memory-efficient, and smaller than SI.

## Installation

### Node / Webpack

```sh
npm i -E emerge
```

Example usage:

```js
import * as e from 'emerge'

e.put({one: 10}, 'two', 20)
// {one: 10, two: 20}

e.patch({one: 10}, {two: 20})
// {one: 10, two: 20}

e.remove({one: 10, two: 20}, 'two')
// {one: 10}

/* Structural sharing */

const prev = {one: [10], two: [20]}

// Patched version, keeping as much old structure as possible,
// even in the face of redundant overrides
const next = e.patch(prev, {one: [10], two: 20})
// {one: [10], two: 20}

// Unchanged values retain their references
next.one === prev.one  // true
```

### Native Browser Modules

Emerge can be used as a native JS module in a browser:

```js
import * as e from './node_modules/emerge/emerge.mjs'
```

Can use a CDN:

```js
import * as e from 'https://cdn.jsdelivr.net/npm/emerge@0.5.1/emerge.mjs'
```

## API

All examples on this page imply an import:

```js
import * as e from 'emerge'
```

### `put(prev, key, value)`

Similar to [`clojure.core/assoc`](https://clojuredocs.org/clojure.core/assoc).

Returns a data structure with `value` set at the given `key`. Works on dicts and lists. Also accepts `null` and `undefined`, treating them as `{}`. Rejects other operands.

Uses [#structural sharing](#structural-sharing), may return the original input.

```js
/* Dicts */

e.put({}, 'one', 10)
// {one: 10}

e.put({one: 10}, 'two', 20)
// {one: 10, two: 20}

/* Lists */

e.put([], 0, 'one')
// ['one']

e.put(['one'], 10, 'two')
// ['one', 'two']

/* Structural sharing */

const prev = {one: [10], two: [20]}

e.put(prev, 'two', [20]) === prev
e.put(prev, 'two', 20).one === prev.one
```

When putting into a list, the key must be an integer index within bounds, otherwise this produces an exception.

### `putIn(prev, path, value)`

Similar to [`clojure.core/assoc-in`](https://clojuredocs.org/clojure.core/assoc-in). Like [#`put`](#putprev-key-value), but updates at a nested `path` rather than one key. Uses [#structural sharing](#structural-sharing), may return the original input.

When `path` is `[]`:

* If `prev` is a primitive, returns `value` as-is, even if `value` is not a data structure.
* If `prev` is a structure, performs a `put`-style deduplication, updating `prev` with the contents of `value` while preserving as many references as possible.

Otherwise, uses exactly the same rules as `put`:

* Works for nested dicts and lists.
* Creates nested dicts as needed.
* Accepts `null` and `undefined`, treating them as `{}`.
* When called with a non-empty path, rejects inputs other than `null`, `undefined`, a list, or a dict.

```js
/* Dicts */

e.putIn({}, ['one'], 10)
// {one: 10}

e.putIn({one: 10}, ['one', 'two'], 20)
// {one: {two: 20}}

e.putIn(undefined, ['one'], 10)
// {one: 10}

/* Lists */

e.putIn([], [0], 'one')
// ['one']

e.putIn(['one', 'two'], [10], 'three')
// ['one', 'three']

/* Mixed */

e.putIn({one: [{two: 20}]}, ['one', 0, 'three'], 30)
// {one: [{two: 20, three: 30}]}

/* Structural sharing */

const prev = {one: [10], two: [20]}

e.putIn(prev, [], {one: [10], two: [20]}) === prev
e.putIn(prev, ['one'], [10]) === prev
e.putIn(prev, ['two'], 20).one === prev.one
```

### `putBy(prev, key, fun, ...args)`

where `fun: ƒ(prevValue, ...args)`

Similar to [#`put`](#putprev-key-value), but takes a function and calls it with the previous value at the given key, passing the additional arguments, to produce the new value. Can be combined with other Emerge functions like [#`patch`](#patchdicts) for great effect.

Uses [#structural sharing](#structural-sharing), may return the original input.

```js
e.putBy({one: {two: 20}}, 'one', e.patch, {three: 30})
// {one: {two: 20, three: 30}}
```

### `putInBy(prev, path, fun, ...args)`

where `fun: ƒ(prevValue, ...args)`

Similar to [#`putIn`](#putinprev-path-value) and [#`putBy`](#putbyprev-key-fun-args). Takes a function and calls it with the previous value at the given path, passing the additional arguments, to produce the new value. Can be combined with other Emerge functions like [#`patch`](#patchdicts) for great effect. See `putIn` for the rules and examples.

Uses [#structural sharing](#structural-sharing), may return the original input.

```js
e.putInBy({one: {two: {three: 30}}}, ['one', 'two'], e.patch, {four: 4})
// {one: {two: {three: 30, four: 4}}}
```

### `patch(...dicts)`

Takes any number of dicts and combines their properties. Ignores `null` and `undefined` inputs. Always produces a dict. Rejects other non-dict inputs.

Uses [#structural sharing](#structural-sharing), may return the original input.

```js
e.patch()
// {}

e.patch({one: 10}, {two: 20}, {three: 30})
// {one: 10, two: 20, three: 30}

// Ignores null and undefined operands
e.patch({one: 10}, undefined)
// {one: 10}

// Combines only at the top level
e.patch({one: {two: 20}}, {one: {three: 30}})
// {one: {three: 30}}

/* Structural sharing */

const prev = {one: [10], two: [20]}

e.patch(prev) === prev
e.patch(prev, {}) === prev
e.patch(prev, {one: [10]}) === prev
e.patch(prev, {one: [10], two: [20]}) === prev
e.patch(prev, {two: 200}).one === prev.one
```

### `merge(...dicts)`

Same as [#`patch`](#patchdicts), but combines dicts at any depth:

Uses [#structural sharing](#structural-sharing), may return the original input.

```js
e.merge({one: {two: 20}}, {one: {three: 30}})
// {one: {two: 20, three: 30}}
```

### `insert(list, index, value)`

Returns a version of `list` with `value` inserted at the given `index`. Index must be a natural number within the list's bounds + 1, which allows to insert or append elements. Going outside these bounds or providing an invalid index produces an exception.

Accepts `null` and `undefined`, treating them as `[]`. Rejects other operands.

Uses [#structural sharing](#structural-sharing), but never returns the original input because it always adds a new element. To update an existing element, use [#`put`](#putprev-key-value).

```js
e.insert(undefined, 0, 'one')
// ['one']

e.insert([], 0, 'one')
// ['one']

e.insert(['one'], 1, 'two')
// ['one', 'two']

e.insert(['one', 'two'], 0, 'three')
// ['three', 'one', 'two']
```

### `remove(value, key)`

Returns a version of `value` with the element at `key` removed. Works on dicts and lists. Accepts `null` and `undefined`, treating them as `{}`. Rejects other operands.

When `value` is a list, `key` must be an integer. Non-natural numbers such as `1.1` or `-1` are ok and are simply ignored without removing an element.

Uses [#structural sharing](#structural-sharing), may return the original input.

```js
/* Dicts */

e.remove({one: 10, two: 20}, 'two')
// {one: 10}

e.remove({one: 10, two: 20}, 'three')
// {one: 10, two: 20}

/* Lists */

e.remove(['one', 'two', 'three'], 0)
// ['two', 'three']

e.remove(['one', 'two', 'three'], 1)
// ['one', 'three']

e.remove(['one', 'two', 'three'], -1)
// ['one', 'two', 'three']

/* Structural sharing */

const prev = {one: [10], two: [20]}

e.remove(prev, 'three') === prev
```

### `removeIn(value, path)`

Like [#`remove`](#removevalue-key), but removes at a nested `path` rather than one key.

When `path` is `[]`, returns `undefined`. Accepts `null` and `undefined`, treating them as `{}`. Rejects other operands.

Uses [#structural sharing](#structural-sharing), may return the original input.

```js
/* Dicts */

e.removeIn({one: 10, two: 20}, [])
// undefined

e.removeIn({one: 10, two: 20}, ['two'])
// {one: 10}

e.removeIn({one: 10, two: 20}, ['three'])
// {one: 10, two: 20}

/* Lists */

e.removeIn(['one', 'two', 'three'], [])
// undefined

e.removeIn(['one', 'two', 'three'], [0])
// ['two', 'three']

e.removeIn(['one', 'two', 'three'], [1])
// ['one', 'three']

e.removeIn(['one', 'two', 'three'], [-1])
// ['one', 'two', 'three']

/* Mixed */

e.removeIn({one: [10], two: [20]}, ['two', 0])
// {one: [10], two: []}

/* Structural sharing */

const prev = {one: [10], two: [20]}

e.removeIn(prev, ['three']) === prev
```

### `is(one, other)`

[_SameValueZero_](https://www.ecma-international.org/ecma-262/6.0/#sec-samevaluezero) as defined by the language spec. Same as `===`, but considers `NaN` equal to `NaN`.

Note that [`Object.is`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is) implements [_SameValue_](https://www.ecma-international.org/ecma-262/6.0/#sec-samevalue), which treats `-0` and `+0` as _distinct values_. This is typically undesirable.

`is` should be preferred over `===` or `Object.is`. Used internally in Emerge for all identity tests.

```js
e.is(NaN, NaN)  // true
e.is(10,  10)   // true
e.is(10,  '10') // false
```

### `equal(one, other)`

True if the inputs are equal by _value_ rather than by identity. Ignores prototypes and non-enumerable properties.

Edge case [#gotcha](#gotchas): ignores symbol keys.

```js
const prev = {one: NaN, two: [20]}
const next = {one: NaN, two: [20]}

e.equal(prev, next)  // true
```

### `equalBy(one, other, fun)`

where `fun: ƒ(oneValue, otherValue)`

Customisable equality. Uses `fun` to compare properties of lists and dicts, and `is` to compare other values. Not recursive by itself, but `fun` may invoke `equalBy` to implement a recursive algorithm.

Edge case [#gotcha](#gotchas): ignores symbol keys.

```js
// Shallow equality
e.equalBy({one: 10},   {one: 10},   e.is) // true
e.equalBy({list: []}, {list: []}, e.is) // false

// Deep equality: `e.equal` is just a recursive `e.equalBy`
function equal(one, other) {
  return e.equalBy(one, other, e.equal)
}

// Add support for arbitrary types
function myEqual(one, other) {
  return isDate(one)
    ? isDate(other) && one.valueOf() === other.valueOf()
    : e.equalBy(one, other, myEqual)
}

function isDate(value) {
  return value instanceof Date
}
```

### `get(value, key)`

Reads property `key` on `value`. Unlike dot or bracket notation, safe to use on `null` or `undefined` values.

```js
e.get(null, 'one')
// undefined

e.get({one: 10}, 'one')
// 10
```

### `getIn(value, path)`

Like `get`, but takes a list of keys and reads a nested property at that path. If unreachable, returns `undefined`.

```js
e.getIn({one: {two: 20}}, ['one', 'two'])
// 20
```

### `scan(value, ...path)`

Like `getIn`, but the path is formed by multiple arguments after the first.

```js
e.scan({one: {two: 20}}, 'one', 'two')
// 20
```

## Merge Semantics

When creating new structures, Emerge follows a few special rules:

* Passing `null` and `undefined` as the first operand to "update" functions is the same as passing `{}`.
* _Non-values_ (see below) are treated atomically: included or replaced wholesale.
* Uses structural sharing (see below).

Emerge differentiates between _values_ (data) and _references_ (non-data). The
following types are considered values:

* Primitives (`null`, `undefined`, numbers, strings, booleans, symbols).
* Lists (`[]` or `new Array`).
* Plain dicts (`{}`, `new Object`, `Object.create(null)`).

The rest are considered references:

* Functions.
* Non-plain objects (`new class {}`, `Object.create({})`).

References are considered outside the scope of Emerge, and treated atomically. Emerge includes and replaces them wholesale. This lets you use Emerge for data structures with non-data mixed in.

Emerge doesn't use `Object.freeze`. If you're consciously treating your data as immutable, you don't need this straight jacket. `Object.freeze` requires the library to choose between inconvenience ("mutating" the incoming data by freezing it), an inconsistent API (sometimes returning the mutable input), or a **massive** performance penalty by always copying any mutable input. Emerge rejects the false trilemma, choosing simplicity, performance, and freedom. As a nice side effect, data structures produced by Emerge are 100% vanilla and can be passed to any 3d party API, even one that mutates its inputs.

## Structural Sharing

The concept is also known as "<a href="https://en.wikipedia.org/wiki/Persistent_data_structure" target="_blank">persistent data structures</a>".

When creating data structures, Emerge attempts to preserve as many unmodified references as possible, even returning the original if the result would be [#`equal`](#equalone-other). This conserves memory and makes subsequent equality tests much cheaper.

Beware of the difference between a missing property, `null`, and `undefined`. The following structures would be considered different by Emerge:

* `{}`
* `{value: null}`
* `{value: undefined}`

To minimize gotchas, I recommend avoiding `null` in your code.

## Gotchas

[#`equal`](#equalone-other) and [#`equalBy`](#equalbyone-other-fun) ignore symbol keys in dicts. Dicts with different sets of symbol keys may be considered equal:

```js
e.equal({}, {[Symbol.for('one')]})
// true
```

Because equality is used to determine whether to replace or keep old references, Emerge currently doesn't allow symbol keys in "update" functions, rejecting them with an exception. This helps to minimize gotchas.

## Compatibility

Versions `>= 0.5.0` **require ES2015+**. Versions `<= 0.5.0` work in **ES5** (IE9+).

## Changelog

### 0.5.1

Added missing `"type": "module"` to `package.json`.

Reduced unminified size from ≈10.4 to ≈8.3 KiB (moved implementation notes to another file, shortened some function names).

### 0.5.0

Breaking changes: explicit property removal, only ES2015.

Major changes:

* Setting properties to `null` or `undefined` no longer removes them. Call `remove` or `removeIn` to explicitly remove a property.
* Renamed `insertAtIndex` → `insert`.
* Renamed `removeAtIndex` → `remove`, now supports dicts.
* Added `removeIn`.
* Only ES2015 source code.

Minor changes:

* Stricter key validation: reject keys that aren't strings or numbers to minimize gotchas. Symbol keys are rejected because Emerge's equality tests completely ignore them; allowing them in updates could have lead to gotchas.
* Relicensed under the Unlicense: https://unlicense.org.

**Warning**: Emerge no longer provides ES5 code. If you wish to use newer versions with older browsers (IE9 and its ilk), you may have to configure your build system to transpile Emerge, alongside your application's code.

### 0.4.0

Breaking change: stricter input validation.

* `patch` and `merge` now accept only `null`,  `undefined`, and dicts.

* In other update functions, the first argument must be `null`, `undefined`, a list, or a dict.

* Other inputs are rejected with an exception.

In earlier versions, the following code "worked":

```js
e.patch('not dict', {key: 'value'})
// {key: 'value'}

e.patch(['not dict'], {key: 'value'})
// {key: 'value'}
```

Starting with 0.4.0, it fails loudly rather than silently:

```js
e.patch('not dict', {key: 'value'})
// Error: Expected "not dict" to satisfy test isDict

e.patch(['not dict'], {key: 'value'})
// Error: Expected ["not dict"] to satisfy test isDict
```

This should help catch silly errors, and should not affect well-written code.

### 0.3.0

Lists now must be arrays. Other types of lists, such as `arguments` and DOM lists, don't count.

  * `getIn`, `putIn`, and `putInBy` require the path to be an array
  * `arguments` is considered a plain dict
  * other non-array lists, such as DOM lists, are considered non-data

This simplifies the code. Whether it simplifies the mental assumptions depends on how you think about `arguments`. I found that it's better to avoid mixing it with your data to prevent gotchas. This change should help catch the `arguments` gotchas early.

### 0.2.0

Performance improvements, simplified internals, and a breaking API cleanup that's been brewing for a long time. Through convergent evolution, the API is now closer than ever to the data functions in `clojure.core`.

* `put` now inserts value by key; faster and more convenient than `putIn` or `patch` for single properties
* `patch` and `merge` now operate only on dicts and always return a dict
* `patch` and `merge` now accept any number of arguments
* removed `patchDicts` and `mergeDicts`; `patch` and `merge` fully replace them and are now 2-3x faster for small dicts and argument counts
* list operations in `put` and `putIn` are stricter: attempting to update an out-of-bounds index or add a non-index property produces an exception
* added list-only operations: `insertAtIndex` and `removeAtIndex`
* because `put` now acts on a single property by key, `putBy` takes a function to be applied to that property; the old `putBy` functionality has been removed
* `patchBy` has been removed
* `putBy` and `equalBy` now accept the operator function as the _last_ argument; this is consistent with `putInBy`, easier to remember (mnemonic: operator comes last), lets us accept additional arguments, and is more convenient with lambdas
* `putInBy` is now limited to 10 additional arguments for the operator
* `putBy` now accepts up to 10 additional arguments for the operator, like `putInBy`

#### Migration guide for 0.1.2 → 0.2.0

* replace `patchDicts` → `patch`
* replace `mergeDicts` → `merge`
* make sure `patch` and `merge` are only used for dicts
* replace `patchIn(root, path, val)` → `putInBy(root, path, patch, val)` or define your own `patchIn`
* replace `mergeIn(root, path, val)` → `putInBy(root, path, merge, val)` or define your own `mergeIn`
* old `putBy` and `patchBy` functionality has been removed; `putBy` now takes a key and applies the operator to the property at that key
* `getAt` has been removed; if you actually need it, copy the one-liner from the `0.1.2` source
* change the argument order from `putBy(fun, val)` to `putBy(val, fun)`
* change the argument order from `equalBy(fun, one, other)` to `equalBy(one, other, fun)`
* make sure `putBy` and `putInBy` are called with no more than 10 additional arguments; if you need more, copy the one-liners from the source and modify them
* for `patch` calls where the next value has just one property, use `put`
* for `putIn` calls with a single-key path, use `put`
* for `putInBy` calls with a single-key path, use `putBy`

## License

https://unlicense.org

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts

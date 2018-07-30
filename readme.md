## Description

Utilities for using plain JavaScript dicts and lists as <a href="https://en.wikipedia.org/wiki/Immutable_object" target="_blank">immutable</a> data structures, with structural equality and memory-efficient updates using <a href="https://en.wikipedia.org/wiki/Persistent_data_structure" target="_blank">structural sharing</a>.

JS dicts and lists are almost usable as generic data structures, barring a few flaws:

  1) updates mutate data in-place

  2) no value equality, just reference equality

  3) only strings and symbols as dict keys

  4) no set notation, no sets in JSON

Emerge addresses (1) and (2). It provides functions to "update" dicts and lists by creating new versions that share as much structure as possible with old versions. This is known as _structural sharing_. It conserves memory and allows to use identity ([`is`](#isone-other)) on sibling values as a fast substitute for "proper" value equality ([`equal`](#equalone-other)), which Emerge also provides.

FP-friendly: only plain JS dicts and lists, no classes, no OO, bring your own
data. Extremely lightweight (≈ 3.5 KiB minified), dependency-free. Faster than the alternatives.

Inspired by [Clojure's ideas](https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/AreWeThereYet.md) and the [`clojure.core`](https://clojuredocs.org/core-library) data utils.

## TOC

* [Description](#description)
* [Why](#why)
* [Installation](#installation)
* [API](#api)
  * [`put`](#putprev-key-value)
  * [`putIn`](#putinprev-path-value)
  * [`putBy`](#putbyprev-key-fun-args)
  * [`putInBy`](#putinbyprev-path-fun-args)
  * [`patch`](#patchdicts)
  * [`merge`](#mergedicts)
  * [`insertAtIndex`](#insertatindexlist-index-value)
  * [`removeAtIndex`](#removeatindexlist-index)
  * [`is`](#isone-other)
  * [`equal`](#equalone-other)
  * [`equalBy`](#equalbyone-other-fun)
  * [`get`](#getvalue-key)
  * [`getIn`](#getinvalue-path)
  * [`scan`](#scanvalue-path)
* [Merge Semantics](#merge-semantics)
* [Compatibility](#compatibility)
* [Changelog](#changelog)

## Why

### Why not ImmutableJS or something similar?

1. Plain data. Emerge uses plain dicts and lists.

  * Uniform interface to data: read at path, set at path, merge. Just a few
    functions that work on all structures
  * Easy to explore in a REPL
  * No need for interop calls
  * Complete compatibility with JSON

2. Size. At the time of writing, ImmutableJS is ≈ 57 KiB minified, unacceptable.
   Emerge is just ≈ 3.5 KiB minified.

3. Performance. Emerge is probably about as efficient as this kind of stuff gets.

### Why not SeamlessImmutable?

SI is a popular library for merging and patching dicts and lists. Like Emerge, it sticks to plain JS data structures, and provides similar functions to Emerge.

However, Emerge is WAY faster, more memory-efficient, and smaller than SI.

## Installation

```sh
npm i -E emerge
# or
yarn add -E emerge
```

Example usage:

```js
const e = require('emerge')

e.put({one: 1}, 'two', 2)
// {one: 1, two: 2}

e.patch({one: 1}, {two: 2})
// {one: 1, two: 2}

e.patch({one: 1, two: 2}, {two: null})
// {one: 1}

// Structural sharing

const prev = {one: [1], two: [2]}

// Patched version, keeping as much old structure as possible,
// even in the face of redundant overrides
const next = e.patch(prev, {one: [1], two: 2})
// {one: [1], two: 2}

// Unchanged values retain their references
next.one === prev.one  // true
```

## API

All examples on this page imply an import:

```js
import * as e from 'emerge'
// or
const e = require('emerge')
```

### `put(prev, key, value)`

Similar to [`clojure.core/assoc`](https://clojuredocs.org/clojure.core/assoc).

Returns a data structure with `value` set at the given `key`. Works on dicts and lists. Also accepts `null` and `undefined`, treating them as `{}`. Rejects other operands.

Uses structural sharing, attempting to preserve as many old references as possible, even returning the original if the result is equal.

Setting a property to nil (`undefined` or `null`) causes it to be removed from the resulting dict. In lists, this just updates the element at the given index without removing it.

```js
// Dict

e.put({}, 'one', 1)
// {one: 1}

e.put({one: 1}, 'two', 2)
// {one: 1, two: 2}

// List

e.put([], 0, 'one')
// ['one']

e.put(['one'], 1, 'two')
// ['one', 'two']

// Delete by passing nil

e.put({one: 1, two: 2}, 'two', null)
e.put({one: 1, two: 2}, 'two', undefined)
// {one: 1}

// Structural sharing

const prev = {one: [1], two: [2]}

e.put(prev, 'two', [2]) === prev
e.put(prev, 'two', 2).one === prev.one
```

When putting into a list, the key must be an integer index within bounds, otherwise this produces an exception.

### `putIn(prev, path, value)`

Similar to [`clojure.core/assoc-in`](https://clojuredocs.org/clojure.core/assoc-in).

Like [`put`](#putprev-key-value), but updates at a nested `path` rather than one key.

Only major difference from `put`: can be called with an empty path `[]`, in which case it returns `next` even if it's a primitive, without coercing to a dict. However, when called with a dict or list and `[]`, it will still perform a `put`-style deduplication, preserving as many references from `prev` as possible.

Otherwise, this uses exactly the same rules as `put`:

  * works for nested dicts and lists
  * creates nested dicts as needed
  * accepts `null` and `undefined`, treating them as `{}`
  * when called with a non-empty path, rejects inputs other than `null`, `undefined`, a list, or a dict
  * uses structural sharing, attempts to reuse as many old references as possible when the result would be equal
  * setting a property to nil deletes it

```js
// Dict

e.putIn({}, ['one'], 1)
// {one: 1}

e.putIn({one: 1}, ['one', 'two'], 2)
// {one: {two: 2}}

e.putIn(undefined, ['one'], 1)
// {one: 1}

// List

e.putIn([], [0], 'one')
// ['one']

e.putIn(['one', 'two'], [1], 'three')
// ['one', 'three']

// Mixed

e.putIn({one: [{two: 2}]}, ['one', 0, 'three'], 3)
// {one: [{two: 2, three: 3}]}

// Structural sharing

const prev = {one: [1], two: [2]}

e.putIn(prev, [], {one: [1], two: [2]}) === prev
e.putIn(prev, ['one'], [1]) === prev
e.putIn(prev, ['two'], 20).one === prev.one
```

### `putBy(prev, key, fun, ...args)`

where `fun: ƒ(prevValue, ...args)`

Similar to [`put`](#putprev-key-value), but takes a function and calls it with the previous value at the given key, passing the additional arguments, to produce the new value. Can be combined with other Emerge functions like [`patch`](#patchdicts) for great effect.

Additional arguments are currently limited to 10 to avoid rest/spread overhead.

```js
e.putBy({one: {two: 2}}, 'one', e.patch, {three: 3})
// {one: {two: 2, three: 3}}
```

### `putInBy(prev, path, fun, ...args)`

where `fun: ƒ(prevValue, ...args)`

Similar to [`putIn`](#putinprev-path-value) and [`putBy`](#putbyprev-key-fun-args). Takes a function and calls it with the previous value at the given path, passing the additional arguments, to produce the new value. Can be combined with other Emerge functions like [`patch`](#patchdicts) for great effect. See `putIn` for the rules and examples.

Additional arguments are currently limited to 10 to avoid rest/spread overhead.

```js
e.putInBy({one: {two: {three: 3}}}, ['one', 'two'], e.patch, {four: 4})
// {one: {two: {three: 3, four: 4}}}
```

### `patch(...dicts)`

Takes any number of dicts and combines their properties. Ignores `null` and `undefined` inputs. Always produces a dict. Rejects other non-dict inputs.

Uses the same rules as [`put`](#putprev-key-value) and other derivatives:

  * uses structural sharing, attempts to reuse as many old references as possible when the result would be equal
  * setting a property to nil deletes it

```js
e.patch()
// {}

e.patch({one: 1}, {two: 2}, {three: 3})
// {one: 1, two: 2, three: 3}

e.patch({one: 1, two: 2}, {two: null})
// {one: 1}

// Ignores null and undefined
e.patch({one: 1}, undefined)
// {one: 1}

// Combines only at the top level
e.patch({one: {two: 2}}, {one: {three: 3}})
// {one: {three: 3}}

// Structural sharing

const prev = {one: [1], two: [2]}

e.patch(prev) === prev
e.patch(prev, {}) === prev
e.patch(prev, {one: [1]}) === prev
e.patch(prev, {one: [1], two: [2]}) === prev
e.patch(prev, {two: 20}).one === prev.one
```

### `merge(...dicts)`

Same as [`patch`](#patchdicts), but combines dicts at any depth:

```js
e.merge({one: {two: 2}}, {one: {three: 3}})
// {one: {two: 2, three: 3}}
```

### `insertAtIndex(list, index, value)`

Creates a version of `list` with `value` inserted at the given `index`. Index must be a natural number within the list's bounds + 1, which allows to insert or append elements. Going outside these bounds or providing an invalid index produces an exception.

Note that this _always_ adds a new element. To update an existing element, use [`put`](#putprev-key-value).

Accepts `null` and `undefined`, treating them as `[]`. Rejects other operands.

```js
e.insertAtIndex(undefined, 0, 'one')
// ['one']

e.insertAtIndex([], 0, 'one')
// ['one']

e.insertAtIndex(['one'], 1, 'two')
// ['one', 'two']

e.insertAtIndex(['one', 'two'], 0, 'three')
// ['three', 'one', 'two']
```

### `removeAtIndex(list, index)`

Creates a version of `list` with the element at `index` removed. More permissive than `insertAtIndex`: index must be an integer, but non-natural numbers such as `-1` are ok and are simply ignored without removing an element.

Accepts `null` and `undefined`, treating them as `[]`. Rejects other operands.

```js
e.removeAtIndex(undefined, 0)
// []

e.removeAtIndex(['one'], 0)
// []

e.removeAtIndex(['one', 'two'], 1)
// ['one']

e.removeAtIndex(['one', 'two'], -1)
// ['one', 'two']
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

True if the inputs are equal by _value_ rather than by identity. Ignores
prototypes and non-enumerable properties.

```js
const prev = {one: NaN, two: [2]}
const next = {one: NaN, two: [2]}

e.equal(prev, next)  // true
```

### `equalBy(one, other, fun)`

where `fun: ƒ(oneValue, otherValue)`

Customisable equality. Uses `fun` to compare properties of lists and dicts, and
`is` to compare other values. Not recursive by itself, but `fun` may invoke
`equalBy` to implement a recursive algorithm.

```js
// Shallow equality
e.equalBy({one: 1},   {one: 1},   e.is) // true
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

Reads property `key` on `value`. Unlike dot or bracket notation, safe to use on
`null` or `undefined` values.

```js
e.get(null, 'one')
// undefined

e.get({one: 1}, 'one')
// 1
```

### `getIn(value, path)`

Like `get`, but takes a list of keys and reads a nested property at that path. If unreachable, returns `undefined`.

```js
e.getIn({one: {two: 2}}, ['one', 'two'])
// 2
```

### `scan(value, ...path)`

Like `getIn`, but the path is formed by multiple arguments after the first.

```js
e.scan({one: {two: 2}}, 'one', 'two')
// 2
```

## Merge Semantics

When creating new structures, Emerge follows a few special rules:

* In dicts, `null` and `undefined` properties are considered non-existent.
  Setting a property to `null` or `undefined` is the same as deleting it.
* Patching and merging into `null` and `undefined` treats them as `{}`.
* Non-value references are treated atomically: included or replaced wholesale.

Emerge differentiates between _values_ (data) and _references_ (non-data). The
following types are considered values:

* Primitives (`null`, `undefined`, numbers, strings, booleans)
* Lists (`[]` or `new Array`)
* Plain dicts (`{}`, `new Object`, `Object.create(null)`)

The rest are considered references:

* Functions
* Non-plain objects (`new class {}`, `Object.create({})`)

Non-data references are considered outside the scope of Emerge, and treated
atomically. Emerge includes and replaces them wholesale. This lets you use
Emerge for trees of any kind, even non-data.

Emerge doesn't use `Object.freeze`. If you're consciously treating your data as immutable, you don't need this straight jacket. `Object.freeze` requires the library to choose between inconvenience ("mutating" the incoming data by freezing it), an inconsistent API (sometimes returning the mutable input), or a **massive** performance penalty by always copying any mutable input. Emerge rejects the false trilemma, choosing simplicity, performance, and freedom. As a nice side effect, data structures produced by Emerge are 100% vanilla and can be passed to any 3d party API, even one that mutates its inputs.

## Compatibility

Any ES5 environment (IE9+).

## Changelog

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

## Misc

I'm receptive to suggestions. If this library _almost_ satisfies you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts

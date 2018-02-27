## Description

Utilities for using plain JavaScript dicts and lists as <a href="https://en.wikipedia.org/wiki/Immutable_object" target="_blank">immutable</a> data structures, with memory-efficient updates using <a href="https://en.wikipedia.org/wiki/Persistent_data_structure" target="_blank">structural sharing</a>, and structural equality.

JS dicts and lists are almost usable as generic data structures, barring a few
flaws:

  1) updates mutate data in-place

  2) no value equality, just reference equality

  3) only strings as dict keys (symbols are rarely useful)

  4) no set notation, no sets in JSON

Emerge addresses (1) and (2). It provides functions to "update" dicts and lists by creating new versions that share as much structure as possible with old versions. This is known as _structural sharing_. It conserves memory and allows to use identity ([`is`](#isone-other)) on sibling values as a fast substitute for "proper" value equality ([`equal`](#equalone-other)), which Emerge also provides.

FP-friendly: only plain JS dicts and lists, no classes, no OO, bring your own
data. Extremely lightweight (3 KB minified).

Inspired by [Clojure's ideas](https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/AreWeThereYet.md) and the [`clojure.core`](https://clojuredocs.org/core-library) data utils.

## TOC

* [Description](#description)
* [Why](#why)
* [Installation](#installation)
* [API](#api)
  * [`put`](#putprev-next)
  * [`patch`](#patchprev-next)
  * [`merge`](#mergeprev-next)
  * [`putIn`](#putinprev-path-value)
  * [`patchIn`](#patchinprev-path-value)
  * [`mergeIn`](#mergeinprev-path-value)
  * [`putBy`](#putbyfun-prev-next)
  * [`patchBy`](#patchbyfun-prev-next)
  * [`putInBy`](#putinbyprev-path-fun-args)
  * [`patchDicts`](#patchdictsvalues)
  * [`mergeDicts`](#mergedictsvalues)
  * [`is`](#isone-other)
  * [`equal`](#equalone-other)
  * [`equalBy`](#equalbytest-one-other)
  * [`get`](#getvalue-key)
  * [`scan`](#scanvalue-path)
  * [`getIn`](#getinvalue-path)
  * [`getAt`](#getatpath-value)
* [Merge Semantics](#merge-semantics)
* [Compatibility](#compatibility)

## Why

Why not ImmutableJS or another alternative?

1. Plain data. Emerge uses plain dicts and lists.

  * Uniform interface to data: read at path, set at path, merge. Just a few
    functions that work on all structures.
  * Easy to explore your data in a REPL.
  * No need for interop calls.
  * Complete compatibility with JSON.

2. Size. At the time of writing, ImmutableJS is 57 KB minified, unacceptable.
   Emerge is just 3 KB minified.

3. Performance. Emerge is probably about as efficient as this kind of stuff gets.

## Installation

```sh
npm install --save --save-exact emerge
# or
npm i -SE emerge
```

Example usage:

```javascript
const {patch} = require('emerge')

const prev = {one: [1], two: {three: 3}}

// Patched version, sharing as much structure as possible with both inputs
const next = patch(prev, {two: {three: 'three'}})
// {one: [1], two: {three: 'three'}}

// Unchanged values retain their references
next.one === prev.one  // true
```

## API

### `put(prev, next)`

Minor merge utility with focus on structural sharing. Not very interesting by
itself. See [`patch`](#patchprev-next) and [`putIn`](#putinprev-path-value) for
more practical examples.

Creates a new version of `next` that reuses as much structure as possible from
`prev`. In the newly created value, all references that have the same property
path in `prev` and `next` and are structurally [`equal`](#equalone-other), are
reused from `prev`. If `prev` and `next` are equal, `prev` is returned as-is.

Following the [merge semantics](#merge-semantics), drops nil properties from the
newly created value.

Structural sharing enabled by `put` is useful for improving the performance of
change detection algorithms in reactive systems. It's used internally by all
other merge utilities in Emerge.

```js
const {put} = require('emerge')

// Works on primitives, uninteresting
put(1, 2)  // 2

const prev = {one: [1]}

const next = {one: [1]}

prev !== next             // true

// Preserves entire previous reference due to structural equality
put(prev, next) === prev  // true

// also deletes nil properties
put(prev, {one: null})    // {}
```

### `patch(prev, next)`

Merge utility with structural sharing.

Similar to [`clojure.core/merge`](https://clojuredocs.org/clojure.core/merge),
minus the rest parameters.

Similar to [`put`](#putprev-next), with just one difference: if `prev` and
`next` are both dicts, it combines their properties. Reuses as many references
as possible from `prev`.

```js
const {patch} = require('emerge')

// Works on primitives, uninteresting
patch(1, 2)  // 2

const prev = {one: [1]}

const next = {two: [2]}

const result = patch(prev, next)
// {one: [1], two: [2]}

// Preserves unaffected references
result.one === prev.one  // true
result.two === next.two  // true

// Merge is only one level deep
patch({one: {two: 2}}, {one: {three: 3}})
// {one: {three: 3}}
```

### `merge(prev, next)`

Deep patch utility.

Similar to [`patch`](#patchprev-next), but merges dicts at any depth. Reuses as
many references as possible from `prev`.

```js
const {merge} = require('emerge')

const prev = {nested: {dict: {one: 1}}}

const next = {nested: {dict: {two: 2}}}

const result = merge(prev, next)
// {nested: {dict: {one: 1, two: 2}}}
```

### `putIn(prev, path, value)`

Similar to [`clojure.core/assoc-in`](https://clojuredocs.org/clojure.core/assoc-in).

Creates a new version of `prev`, where `value` is [`put`](#putprev-next) into
the location at `path`. The path must be a list of primitive values. Reuses as
many references as possible from `prev`. Returns `prev` is the result is equal.

```javascript
const {putIn} = require('emerge')

const prev = {one: {two: 2, three: 3}, four: [4]}

const part = {two: 'two'}

const result = putIn(prev, ['one'], part)
// {one: {two: 'two'}, four: [4]}

result.one.two === part.two   // true
result.four === prev.four     // true

// List indices also work
putIn({list: ['one']}, ['list', 1], 'two')
// {list: ['one', 'two']}

// Creates missing dicts if needed
putIn(null, ['one', 'two'], 2)
// {one: {two: 2}}
```

### `patchIn(prev, path, value)`

Creates a new version of `prev`, where `value` is patched into the location at
`path`, using [`patch`](#patchprev-next). See [`putIn`](#putinprev-path-value).
Reuses as many references as possible from `prev`.

```javascript
const {patchIn} = require('emerge')

patchIn({one: {two: 2}}, ['one'], {three: 3})
// {one: {two: 2, three: 3}}
```

### `mergeIn(prev, path, value)`

Creates a new version of `prev`, where `value` is deeply patched into the
location at `path`, using [`merge`](#mergeprev-next). See
[`putIn`](#putinprev-path-value). Reuses as many references as possible from
`prev`.

```javascript
const {mergeIn} = require('emerge')

mergeIn({nested: {dict: {one: 1}}}, ['nested'], {dict: {two: 2}})
// {nested: {dict: {one: 1, two: 2}}}
```

### `putBy(fun, prev, next)`

where `fun: ƒ(prevValue, nextValue, key)`

Customisable patching utility. Uses `fun` to replace list elements and dict
properties; replaces other values automatically. Not recursive by itself, but
`fun` may invoke `putBy` to implement a recursive algorithm. Serves as a basis
for [`put`](#putprev-next).

### `patchBy(fun, prev, next)`

where `fun: ƒ(prevValue, nextValue, key)`

Customisable patching utility. Uses `fun` to replace list elements and dict
properties; replaces other values automatically. Unlike `putBy`, combines dict
properties from `prev` and `next`. Not recursive by itself, but `fun` may invoke
`patchBy` to implement a recursive algorithm. Serves as a basis for
[`patch`](#patchprev-next) and [`merge `](#mergeprev-next).

### `putInBy(prev, path, fun, ...args)`

where `fun: ƒ(prevValue, ...args)`

Similar to [`clojure.core/update-in`](https://clojuredocs.org/clojure.core/update-in).

Creates a new version of `prev`, calling `fun` to create a value for the
location at `path` and using [`putIn`](#putinprev-path-value) to update it.

```javascript
const {putInBy} = require('emerge')

const prev = [{count: 1}]

const result = putInBy(prev, [0, 'count'], x => x + 1)
// [{count: 2}]
```

### `patchDicts(...values)`

Takes any number of arguments and combines them via [`patch`](#patchprev-next),
ignoring non-dicts. Always produces a dict.

```js
patchDicts()
// {}

patchDicts({one: 1}, 'non-dict', {two: 2})
// {one: 1, two: 2}
```

### `mergeDicts(...values)`

Takes any number of arguments and combines them via [`merge`](#mergeprev-next),
ignoring non-dicts. Always produces a dict.

```js
mergeDicts()
// {}

mergeDicts({one: 1, two: {three: 3}}, 'non-dict', {two: {four: 4}})
// {one: 1, two: {three: 3, four: 4}}
```

### `is(one, other)`

Same as ES2015 `Object.is`. Equivalent to `===` but also considers `NaN` equal
to itself. Used internally for all identity checks.

### `equal(one, other)`

Renamed `deepEqual -> equal` in `0.0.25`.

True if the inputs are equal by _value_ rather than by identity. Ignores
prototypes and non-enumerable properties.

```javascript
const {equal} = require('emerge')

const prev = {one: NaN, two: [2]}
const next = {one: NaN, two: [2]}

equal(prev, next)  // true
```

### `equalBy(test, one, other)`

where `test: ƒ(oneValue, otherValue)`

Customisable equality. Uses `test` to compare properties of lists and dicts, and
`is` to compare other values. Not recursive by itself, but `test` may invoke
`equalBy` to implement a recursive algorithm.

```js
// Shallow equality
equalBy(is, {one: 1}, {one: 1})
// true
equalBy(is, {list: []}, {list: []})
// false

// Deep equality: `equal` is just a special case of `equalBy`
function equal(one, other) {
  return equalBy(equal, one, other)
}
```

### `get(value, key)`

Reads property `key` on `value`. Unlike dot or bracket notation, safe to use on
`null` or `undefined` values.

```js
get(null, 'one')
// undefined

get({one: 1}, 'one')
// 1
```

### `scan(value, ...path)`

Like `get` but takes many keys and reads a nested property at that path. If
unreachable, returns `undefined`.

```js
scan({one: {two: 2}}, 'one', 'two')
// 2
```

### `getIn(value, path)`

Like `scan` but expects the entire `path` as the second argument.

```js
getIn({one: {two: 2}}, ['one', 'two'])
// 2
```

### `getAt(path, value)`

Like `getIn` but expects the entire `path` as the _first_ argument. Useful in
function composition contexts when path is known in advance.

```js
getAt(['one', 'two'], {one: {two: 2}})
// 2
```

## Merge Semantics

When creating new structures, Emerge follows a few special rules:

* In dicts, `null` and `undefined` properties are considered non-existent.
  Setting a property to `null` or `undefined` is the same as deleting it.
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

## Compatibility

Any ES5 environment (IE9+).

## Misc

I'm receptive to suggestions. If this library _almost_ fits you but needs changes, open an issue or chat me up. Contacts: https://mitranim.com/#contacts

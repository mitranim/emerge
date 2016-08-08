## Description

Utilities for using plain JavaScript dicts and lists as
<a href="https://en.wikipedia.org/wiki/Immutable_object" target="_blank">immutable</a>,
<a href="https://en.wikipedia.org/wiki/Persistent_data_structure" target="_blank">persistent</a>
data structures.

Immutable entities can't be modified without creating a new version. They're
_values_ rather than _references_. JavaScript fails to differentiate between
these concepts. Emerge helps you to bolt this on top of the language.

"Persistent" means that new versions share as much structure as possible with
old versions. This is known as _structural sharing_. It conserves memory and
allows to use identity ([`is`](#isone-other)) as a fast substitute for value
equality ([`equal`](#equalone-other)) on sibling values.

FP-friendly: only plain JS dicts and lists, no classes, no OO, bring your own
data. Extremely lightweight (2 KB minified).

Inspired by Rich Hickey's amazing talk
<a href="https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/AreWeThereYet.md" target="_blank">"Are We There Yet"</a>
(transcript).

## TOC

* [Description](#description)
* [Why](#why)
* [Installation](#installation)
* [API](#api)
  * [`putIn`](#putinprev-path-value)
  * [`putAt`](#putatpath-prev-value)
  * [`patchIn`](#patchinprev-path-value)
  * [`patchAt`](#patchatpath-prev-value)
  * [`is`](#isone-other)
  * [`equal`](#equalone-other)
  * [`get`](#getvalue-key)
  * [`scan`](#scanvalue-path)
  * [`getIn`](#getinvalue-path)
  * [`getAt`](#getatpath-value)
* [Merge Semantics](#merge-semantics)
* [Compatibility](#compatibility)

## Why

Why not just use ImmutableJS or another existing library?

1. Plain data. Emerge uses plain dicts and lists.

  * Uniform interface to data: read at path, set at path. No methods, just functions.
  * Easy to explore data in REPL.
  * Serialise into JSON and back without losing information.

2. Size. ImmutableJS is 140+ KB minified, unacceptable. Emerge is just 2 KB
minified.

## Installation

```sh
npm i --save emerge
# or
npm i --save-dev emerge
```

Example usage:

```javascript
const {patchAt} = require('emerge')

const oldTree = {one: [1], two: {three: 3}}

const part = {two: {three: 'three'}}

// Result of deep merge, immutable.
const newTree = patchAt([], oldTree, part)

// Unchanged values retain their references.
newTree.one === oldTree.one  // true

// New parts are merged-in.
newTree.two.three === 'three'  // true
```

## API

### `putIn(prev, path, value)`

Creates a new immutable version of the given value, replaced with the given
value at the given path. The path must be an array of strings or symbols.
Preserves as many original references as possible, even inside the branch being
replaced. The original is unaffected.

Ignores/removes properties that receive nil values (`null` or `undefined`).

Returns the original reference if the result has the same value.

```javascript
const {putIn} = require('emerge')

const oldTree = {one: {two: 2, three: 3}, four: [4]}

const part = {two: 'two'}

const newTree = putIn(oldTree, ['one'], part)

// Result:
//   {one: {two: 'two'}, four: [4]}

newTree.one.two === part.two   // true
newTree.four === oldTree.four  // true
```

### `putAt(path, prev, value)`

Same as `putIn` but accepts `path` as the first argument. Useful in function
composition contexts when path is known in advance.

### `patchIn(prev, path, value)`

Creates a new immutable version of the given value, deep-patched by the given
structure starting at the given path. The path must be an array of strings or
symbols. Preserves as many original references as possible. The original is
unaffected.

Ignores/removes properties that receive nil values (`null` or `undefined`).

Returns the original reference if the result has the same value.

This is useful for updating multiple branches in one operation and preserving
other data.

```javascript
const {patchIn} = require('emerge')

const oldTree = {one: {two: {three: 3, four: 4}}, five: [5]}

const part = {two: {three: 'three'}}

const newTree = patchIn(oldTree, ['one'], part)

// Result:
//   {one: {two: {three: 'three', four: 4}}, five: [5]}

newTree.one.two.three === next.two.three   // true
newTree.one.four === oldTree.one.four      // true
newTree.five === oldTree.five              // true
```

### `patchAt(path, prev, value)`

Same as `patchIn` but accepts `path` as the first argument. Useful in function
composition contexts when path is known in advance.

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
  Setting a property to `null` is the same as deleting it.
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

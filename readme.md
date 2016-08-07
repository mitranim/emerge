## Description

Utilities for using plain JavaScript objects as
<a href="https://en.wikipedia.org/wiki/Immutable_object" target="_blank">immutable</a>,
<a href="https://en.wikipedia.org/wiki/Persistent_data_structure" target="_blank">persistent</a>
data structures.

Immutable entities can't be modified without creating a new version. In other
words, they're _values_ rather than _objects_. JavaScript fails to differentiate
between these concepts. Emerge helps you to bolt this on top of the language.

"Persistent" means that new versions share as much structure as possible with
old versions. This conserves memory and allows to use referential equality
(`===`) as a fast substitute for value equality (`deepEqual`).

FP-friendly: only plain JS objects, no classes, no OO, bring your own data.
Extremely lightweight (2 KB minified & mangled).

Helpful when building systems around immutable values. Inspired by Rich Hickey's
amazing talk
<a href="https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/AreWeThereYet.md" target="_blank">"Are We There Yet"</a>
(transcript).

## TOC

* [Description](#description)
* [Why](#why)
* [Installation](#installation)
* [API](#api)
  * [`putAt`](#putatpath-prev-value)
  * [`patchAt`](#patchatpath-prev-value)
  * [`copy`](#copyvalue)
  * [`is`](#is-one-other)
  * [`deepEqual`](#deepequalone-other)
  * [`get`](#getvalue-key)
  * [`scan`](#scanvalue-path)
  * [`getIn`](#getinvalue-path)
  * [`getAt`](#getatpath-value)
* [Merge Semantics](#merge-semantics)
* [Compatibility](#compatibility)

## Why

Why not just use ImmutableJS or another existing library?

1. Plain data. Emerge uses plain objects and lists.

  * Uniform interface to data: read at path, set at path. No methods.
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

const oldTree = {
  one: [1],
  two: {three: 3}
}

const part = {
  two: {three: 'three'}
}

// Result of deep merge, immutable.
const newTree = patchAt([], oldTree, part)

// Unchanged values retain their references.
newTree.one === oldTree.one  // true

// New parts are merged-in.
newTree.two.three === 'three'  // true
```

## API

### `putAt(path, prev, value)`

Creates a new immutable version of the given value, patched with the given value
at the given path. The path must be an array of strings or symbols. Preserves as
many original references as possible. The original is unaffected.

Ignores/removes nodes that receive nil values (`null` or `undefined`).

Returns the original reference if the result would be deep-equal.

```javascript
const {putAt} = require('emerge')

const oldTree = {
  one: {
    two: 2,
    three: 3
  },
  four: [4]
}

const part = {two: 'two'}

const newTree = putAt(['one'], oldTree, part)

// Result:
//   {
//     one: {
//       two: 'two'
//     },
//     four: [4]
//   }

newTree.one.two === part.two   // true
newTree.four === oldTree.four  // true
```

### `patchAt(path, prev, value)`

Creates a new immutable version of the given value, deep-patched by the given
structure starting at the given path. The path must be an array of strings or
symbols. Preserves as many original references as possible. The original is
unaffected.

Ignores/removes nodes that receive nil values (`null` or `undefined`).

Returns the original reference if the result would be deep-equal.

This is useful for updating multiple branches in one operation and preserving
other data.

```javascript
const {patchAt} = require('emerge')

const oldTree = {
  one: {
    two: {
      three: 3,
      four: 4
    }
  },
  five: [5]
}

const part = {two: {three: 'three'}}

const newTree = patchAt(['one'], oldTree, part)

// Result:
//   {
//     one: {
//       two: {
//         three: 'three',
//         four: 4
//       }
//     },
//     five: [5]
//   }

newTree.one.two.three === next.two.three   // true
newTree.one.four === oldTree.one.four      // true
newTree.five === oldTree.five              // true
```

### `copy(value)`

Attempts to create a deep immutable clone of the given value, following the
[merge semantics](#merge-semantics).

```javascript
const {copy} = require('emerge')

const tree = copy({one: 1})

// This will silently fail in loose mode and throw an exception in strict mode.
tree.one = 2
```

### `is(one, other)`

Same as `===` but considers `NaN` equal to itself. Used internally for all
identity checks.

### `deepEqual(one, other)`

True if the values are deeply equal. Ignores prototypes and non-enumerable
properties.

```javascript
const {deepEqual} = require('emerge')

const prev = {one: NaN, two: [2]}
const next = {one: NaN, two: [2]}

deepEqual(prev, next)  // true
```

### `get(value, key)`

Reads property `key` on `value`. Unlike dot or bracket notation, this is safe to
use on `null` or `undefined` values.

```js
get(null, 'one')
// undefined

get({one: 1}, 'one')
// 1
```

### `scan(value, ...path)`

Renamed `read -> scan` in `0.0.24`.

Like `get` but takes many keys and reads a nested property at that path. If
the path is unreachable, returns `undefined`.

```js
scan({one: {two: 2}}, 'one', 'two')
// 2
```

### `getIn(value, path)`

Added in `0.0.24`.

Like `scan` but expects the entire `path` as the second argument. Useful when
path is determined dynamically.

```js
getIn({one: {two: 2}}, ['one', 'two'])
// 2
```

### `getAt(value, path)`

Renamed `readAt -> getAt` in `0.0.24`.

Like `getIn` but expects the entire `path` as the _first_ argument. Useful in
function composition contexts when path is known in advance.

```js
getAt(['one', 'two'], {one: {two: 2}})
// 2
```

## Merge Semantics

When merging or copying, emerge follows a few special rules:

* Reuse frozen objects instead of cloning.
* In objects, `null` and `undefined` values are considered non-existent. Setting
  a value to `null` is the same as deleting it.
* Non-data objects are reused instead of cloning. See rationale below.

Emerge differentiates _data_ and _non-data_ objects. The following objects are
considered data:
* `[]` or `new Array`
* `{}` or `new Object`
* `Object.create(null)`

These examples are not considered data:
* `function () {}`
* `Object.create({})`
* `new class {}`

Non-data references are considered outside the scope of Emerge, and reused
as-is. Emerge makes no attempt to clone or freeze them. This provides an outlet
for scenarios when you're constrained by an Emerge-based API but feel the need
to include a "special" mutable object into the tree.

## Compatibility

Any ES5 environment (IE9+).

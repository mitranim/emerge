[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com)

## Description

Utilities for creating and merging immutable data trees. Friendly to functional
programming. Only plain JS objects, no custom classes, no OOP, bring your own
data. Extremely lightweight (2 KB minified & mangled).

Features efficient deep merging and referential equality. Helpful for systems
built around immutable data. Food for thought:
[[1]](https://github.com/matthiasn/talk-transcripts/blob/master/Hickey_Rich/AreWeThereYet.md).

## TOC

* [Description](#description)
* [Installation](#installation)
* [API](#api)
  * [`readAt`](#readatpath-tree)
  * [`read`](#readtree-keys)
  * [`putAt`](#putatpath-prev-value)
  * [`patchAt`](#patchatpath-prev-value)
  * [`deepEqual`](#deepequalone-other)
  * [`copy`](#copyvalue)
  * [`is`](#is-one-other)
* [Merge Semantics](#merge-semantics)
* [Compatibility](#compatibility)

## Installation

```sh
npm i --save emerge
# or
npm i --save-dev emerge
```

Example usage:

```javascript
import {patchAt} from 'emerge'

const oldTree = {
  one: [1],
  two: {three: 3}
}

const part = {
  two: {three: 'three'}
}

// Result of deep merge, immutable.
const newTree = patchAt([], oldTree, part)

// Unchanged data is referentially equal.
console.assert(newTree.one === oldTree.one)

// Changed parts.
console.assert(newTree.two.three === 'three')
```

## API

### `readAt(path, tree)`

Takes a path and a tree and reads a value at that path. If unreachable, returns
`undefined`.

```javascript
import {readAt} from 'emerge'

const tree = {
  one: {two: {three: 3}}
}

console.assert(readAt(['one', 'two', 'three'], tree) === 3)
```

### `read(tree, ...keys)`

Like `readAt`, but takes a tree as the first argument and treats the remaining
arguments as a path.

```javascript
import {read} from 'emerge'

const tree = {
  one: {two: {three: 3}}
}

console.assert(read(tree, 'one', 'two', 'three') === 3)
```

### `putAt(path, prev, value)`

Renamed `replaceAt -> putAt` in `0.0.20`.

Creates a new immutable version of the given tree, patched with the given value
at the given path. The path must be an array of strings or symbols. Preserves as
many original references as possible. The original is unaffected.

Ignores/removes tree leaves that receive nil values (`null` or `undefined`).

Returns the original reference if the result would be deep-equal.

```javascript
import {putAt} from 'emerge'

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

console.assert(newTree.one.two === part.two)
console.assert(newTree.four === oldTree.four)
```

### `patchAt(path, prev, value)`

Renamed `mergeAt -> patchAt` in `0.0.20`.

Creates a new immutable version of the given tree, deep-patched by the given
structure starting at the given path. The path must be an array of strings or
symbols. Preserves as many original references as possible. The original is
unaffected.

Ignores/removes tree leaves that receive nil values (`null` or `undefined`).

Returns the original reference if the result would be deep-equal.

This is useful for updating multiple branches in one operation and preserving
other data.

```javascript
import {patchAt} from 'emerge'

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

console.assert(newTree.one.two.three === next.two.three)
console.assert(newTree.one.four === oldTree.one.four)
console.assert(newTree.five === oldTree.five)
```

### `deepEqual(one, other)`

True if the values are deeply equal, ignoring prototypes and non-enumerable
properties.

```javascript
import {deepEqual} from 'emerge'

const prev = {one: NaN, two: [2]}
const next = {one: NaN, two: [2]}

console.assert(deepEqual(prev, next))
```

### `copy(value)`

Renamed `immutableClone -> copy` in `0.0.20`.

Attempts to create a deep immutable clone of the given value, following the
standard [merge semantics](#merge-semantics).

```javascript
import {copy} from 'emerge'

const tree = copy({one: 1})

// This will silently fail in loose mode and throw an exception in strict mode.
tree.one = 2
```

### `is(one, other)`

Same as `===` but considers `NaN` equal to itself. Used internally for all
identity checks.

## Merge Semantics

When merging or copying, emerge follows a few special rules:

* Frozen objects are reused as-is.
* In objects, `null` and `undefined` values are considered non-existent. Setting
  a value to `null` is the same as deleting it.
* Non-data objects are reused as-is. See rationale below.

Emerge differentiates _data_ and _non-data_ objects. The following objects are
considered data:
* `[]` or `new Array`
* `{}` or `new Object`
* `Object.create(null)`

These examples are not considered data:
* `function () {}`
* `Object.create({})`
* `new class {}`

Non-data references are considered outside the scope of Emerge, and included
as-is. Emerge makes no attempt to clone or freeze them. This provides an outlet
for scenarios when you're constrained by an Emerge-based API and feel the need
to include a "special" mutable object into the tree.

## Compatibility

Any ES5 environment (IE9+).

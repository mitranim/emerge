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
  * [`readAtPath`](#readatpathtree-path)
  * [`replaceAtPath`](#replaceatpathprev-value-path)
  * [`mergeAtPath`](#mergeatpathprev-value-path)
  * [`deepEqual`](#deepequalone-other)
  * [`immutableClone`](#immutableclonevalue)
* [Compatibility](#compatibility)

## Installation

```sh
npm i --save emerge
# or
npm i --save-dev emerge
```

Example usage:

```javascript
import {mergeAtRoot} from 'emerge'

const prev = {
  one: [1],
  two: {three: 3}
}

const next = {
  two: {three: 'three'}
}

// Result of deep merge, immutable.
const tree = mergeAtRoot(prev, next)

// Unchanged data is referentially equal.
console.assert(tree.one === prev.one)

// Changed parts.
console.assert(tree.two.three === 'three')
```

## API

### `readAtPath(tree, path)`

Takes a data tree and safely reads a value at the given path. If the path is
unreachable, returns `undefined`.

```javascript
import {readAtPath} from 'emerge'

const tree = {
  one: {two: {three: 3}}
}

console.assert(readAtPath(tree, ['one', 'two', 'three']) === 3)
```

### `replaceAtPath(prev, value, path)`

Creates a new immutable version of the given tree, patched with the given value
at the given path. The path must be an array of strings or symbols. Preserves as
many original references as possible. The original is unaffected.

Ignores/removes tree leaves that receive nil values (`null` or `undefined`).

Returns the original reference if the result would be deep-equal.

```javascript
import {replaceAtPath} from 'emerge'

const prev = {
  one: {
    two: 2,
    three: 3
  },
  four: [4]
}

const next = {two: 'two'}

const tree = replaceAtPath(prev, next, ['one'])

// Result:
//   {
//     one: {
//       two: 'two'
//     },
//     four: [4]
//   }

console.assert(tree.one.two === next.two)
console.assert(tree.four === prev.four)
```

### `mergeAtPath(prev, value, path)`

Creates a new immutable version of the given tree, deep-patched by the given
structure starting at the given path. The path must be an array of strings or
symbols. Preserves as many original references as possible. The original is
unaffected.

Ignores/removes tree leaves that receive nil values (`null` or `undefined`).

Returns the original reference if the result would be deep-equal.

This is useful for updating multiple branches in one operation and preserving
other data.

```javascript
import {mergeAtPath} from 'emerge'

const prev = {
  one: {
    two: {
      three: 3,
      four: 4
    }
  },
  five: [5]
}

const patch = {two: {three: 'three'}}

const tree = mergeAtPath(prev, patch, ['one'])

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

console.assert(tree.one.two.three === next.two.three)
console.assert(tree.one.four === prev.one.four)
console.assert(tree.five === prev.five)
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

### `immutableClone(value)`

Creates an immutable deep clone of the given value, ignoring keys with `null` or
`undefined` values.

```javascript
import {immutableClone} from 'emerge'

const tree = immutableClone({
  one: 1
})

// Mutation attempts throw errors in strict mode.
let error
try {
  tree.one = 2
} catch (err) {
  error = err
} finally {
  console.assert(!!error)
}
```

## TODO

Consider if we want to support symbol keys. (Note: `JSON.stringify` ignores them.)

## Compatibility

Any ES5 environment (IE9+).

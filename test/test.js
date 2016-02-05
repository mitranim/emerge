'use strict'

/**
 * Hack to enable test-only code.
 */

const fs = require('fs')

require.extensions['.js'] = (module, path) => {
  let content = fs.readFileSync(path, 'utf8')
  content = content
    .replace(/^\/\*\s*#if\s+TESTING\b.*$/gm, '')
    .replace(/^\s*#endif\s+TESTING\b.*\*\/$/gm, '')
  module._compile(content, path)
}

/**
 * Dependencies
 */

const emerge = require(require('path').join(__dirname, '..', require('../package')['jsnext:main']))

// Reading.
const readAt = emerge.readAt
const readAtPath = emerge.readAtPath

// Merging.
const merge = emerge.merge
const replace = emerge.replace
const mergeAtPath = emerge.mergeAtPath
const replaceAtPath = emerge.replaceAtPath

// Misc.
const deepEqual = emerge.deepEqual
const immutableClone = emerge.immutableClone

/**
 * Globals
 */

let prev, next, tree, error

const RESET = () => {
  prev = next = tree = error = undefined
}

/**
 * readAtPath, readAt
 */

RESET()

tree = immutableClone({
  one: 1,
  two: {three: {four: [4, 5]}}
})

if (readAtPath(tree, []) !== tree) throw Error()
if (readAtPath(tree, ['two']) !== tree.two) throw Error()
if (readAtPath(tree, ['one']) !== 1) throw Error()
if (readAtPath(tree, ['two', 'three', 'four', '0']) !== 4) throw Error()
if (readAtPath(tree, [Symbol()]) !== undefined) throw Error()

if (readAt(tree) !== tree) throw Error()
if (readAt(tree, 'two') !== tree.two) throw Error()
if (readAt(tree, 'one') !== 1) throw Error()
if (readAt(tree, 'two', 'three', 'four', '0') !== 4) throw Error()
if (readAt(tree, Symbol()) !== undefined) throw Error()

/**
 * replace
 */

RESET()

prev = immutableClone({
  one: {two: NaN},
  three: {four: 4},
  five: [5]
})

next = immutableClone({
  one: {two: NaN},
  three: {four: [4]},
  six: 6
})

tree = replace(prev, next)

// Must be a non-referential copy of the next tree.
if (tree === prev || tree === next) throw Error()
if (!deepEqual(tree, next)) throw Error()
// Referential equality: keep old references if values are deep equal.
if (tree.one !== prev.one) throw Error()
if (!deepEqual(tree.three, next.three)) throw Error()
// New values must be immutable.
try {
  tree.three.four.push(5)
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}
// The new tree must be immutable.
error = undefined
try {
  tree.mutated = true
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}

// Must ignore or unset keys with nil values.
next = immutableClone({
  one: {two: undefined},
  three: {four: null},
  six: null
})
tree = replace(prev, next)
if (!(deepEqual(tree, {one: {}, three: {}}))) throw Error()
tree = replace(undefined, next)
if (!(deepEqual(tree, {one: {}, three: {}}))) throw Error()

// Must return the same reference if the result would be deep equal.
next = immutableClone({
  one: {two: NaN},
  three: {four: 4},
  five: [5]
})
tree = replace(prev, next)
if (tree !== prev) throw Error()

/**
 * merge
 */

RESET()

prev = immutableClone({
  one: {two: NaN},
  three: {four: [4]},
  six: undefined,
  eight: {nine: 9},
  ten: {eleven: 11, twelve: [12]}
})

next = immutableClone({
  three: {five: 5},
  six: [6],
  seven: 7,
  eight: {nine: 9},
  ten: {eleven: 'eleven', twelve: [12]}
})

tree = merge(prev, next)

if (tree === prev || tree === next) throw Error()
if (deepEqual(tree, next)) throw Error()
// Keep unaffected values, with unchanged references.
if (tree.one !== prev.one) throw Error()
if (tree.three.four !== prev.three.four) throw Error()
if (tree.eight !== prev.eight) throw Error()
if (tree.ten.twelve !== prev.ten.twelve) throw Error()
// Must deep-patch new paths and values in.
if (tree.three.five !== next.three.five) throw Error()
if (!deepEqual(tree.six, next.six)) throw Error()
if (tree.seven !== next.seven) throw Error()
if (tree.ten.eleven !== next.ten.eleven) throw Error()
// New values must be immutable.
try {
  tree.six.push(7)
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}
// The new tree must be immutable.
error = undefined
try {
  tree.mutated = true
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}

// Must ignore or unset keys with nil values.
next = {
  ten: {eleven: 'eleven', twelve: undefined, thirteen: null}
}
tree = merge(prev, next)
if (!(deepEqual(tree.ten, {eleven: 'eleven'}))) throw Error()
tree = merge(undefined, next)
if (!(deepEqual(tree.ten, {eleven: 'eleven'}))) throw Error()

// Must return the same reference if the result would be deep equal.
next = immutableClone({
  one: {two: NaN}
})
tree = merge(prev, next)
if (tree !== prev) throw Error()

/**
 * replaceAtPath
 */

RESET()

prev = immutableClone({
  one: {two: NaN},
  three: {four: {six: [6]}, five: 5}
})

next = immutableClone({six: 6})

tree = replaceAtPath(prev, next, ['three', 'four'])

if (tree === prev || tree === next) throw Error()
// Must deep-patch the new value in.
if (!deepEqual(tree.three.four, next)) throw Error()
// Unaffected paths must remain untouched, with same references.
if (tree.three.five !== prev.three.five) throw Error()
// The patched value must be immutable.
try {
  tree.three.four.six = 7
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}
// The new tree must be immutable.
error = undefined
try {
  tree.mutated = true
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}

// Must ignore or unset keys with nil values.
next = immutableClone({
  four: {six: undefined, seven: null}, five: 5
})
tree = replaceAtPath(prev, next, ['three'])
if (!(deepEqual(tree.three, {four: {}, five: 5}))) throw Error()

// Must return the same reference if the result would be deep equal.
next = immutableClone({
  six: [6]
})
tree = replaceAtPath(prev, next, ['three', 'four'])

function inspect (value) {
  return require('util').inspect(value, {depth: null})
}

if (tree !== prev) throw Error()

// Must replace plain objects with arrays.
prev = immutableClone({one: {}})
next = immutableClone(['two'])
tree = replaceAtPath(prev, next, ['one'])
if (!deepEqual(tree, {one: ['two']})) throw Error()

/**
 * mergeAtPath
 */

RESET()

prev = immutableClone({
  one: {two: 2, three: [3]},
  five: NaN
})

next = immutableClone({
  two: [2],
  four: 4
})

tree = mergeAtPath(prev, next, ['one'])

if (tree === prev || tree === next) throw Error()
// Must deep-patch the new value in.
if (!deepEqual(tree.one.two, next.two)) throw Error()
if (tree.one.four !== next.four) throw Error()
// Unaffected paths must remain untouched, with same references.
if (tree.one.three !== prev.one.three) throw Error()
if (!deepEqual(tree.five, prev.five)) throw Error()
// The patched value must be immutable.
try {
  tree.one.two.push(3)
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}
// The new tree must be immutable.
error = undefined
try {
  tree.mutated = true
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}

// Must ignore or unset keys with nil values.
next = {three: undefined, six: null}
tree = mergeAtPath(prev, next, ['one'])
if (!(deepEqual(tree.one, {two: 2}))) throw Error()

// Must return the same reference if the result would be deep equal.
next = immutableClone({
  one: {three: [3]}
})
tree = mergeAtPath(prev, next, [])
if (tree !== prev) throw Error()

// Must replace plain objects with arrays.
prev = immutableClone({one: {}})
next = immutableClone(['two'])
tree = mergeAtPath(prev, next, ['one'])
if (!deepEqual(tree, {one: ['two']})) throw Error()

/**
 * deepEqual
 */

RESET()

prev = {
  one: {two: {three: NaN}},
  four: [4, 4],
  five: 'five'
}

next = {
  one: {two: {three: NaN}},
  four: [4, 4],
  five: 'five'
}

if (!deepEqual(prev, next)) throw Error()

prev = {
  one: {two: {three: NaN}},
  four: [4, 4],
  five: 'five',
  six: 6
}

if (deepEqual(prev, next)) throw Error()

/**
 * immutableClone
 */

RESET()

prev = {
  one: {two: NaN},
  three: {four: [4]}
}

tree = immutableClone(prev)

if (!deepEqual(tree, prev)) throw Error()
if (tree === prev) throw Error()

try {
  tree.one = 3
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}

error = undefined
try {
  tree.three.four.push(5)
} catch (err) {
  error = err
} finally {
  if (!error) throw Error()
}

// Must drop keys with nil values.

tree = immutableClone({
  one: 1,
  two: null,
  three: undefined
})

if (!deepEqual(tree, {one: 1})) throw Error()

// Must act as identity function for immutable objects, trusting them to be
// deep-frozen.

prev = Object.freeze({one: 1})

tree = immutableClone(prev)

if (tree !== prev) throw Error()

/**
 * Misc
 */

console.info(`[${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}] Finished test without errors.`)

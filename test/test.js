'use strict'

const emerge = require(require('path').join(__dirname, '..', require('../package').main))

// Main.
const readAtPath = emerge.readAtPath
const replaceAtRoot = emerge.replaceAtRoot
const mergeAtRoot = emerge.mergeAtRoot
const replaceAtPath = emerge.replaceAtPath
// Secondary.
const deepEqual = emerge.deepEqual
const immute = emerge.immute

let prev, next, tree, error

/**
 * readAtPath
 */

prev = next = tree = error = undefined

tree = immute({
  one: 1,
  two: {three: {four: [4, 5]}}
})

if (readAtPath(tree, []) !== tree) throw Error()
if (readAtPath(tree, ['two']) !== tree.two) throw Error()
if (readAtPath(tree, ['one']) !== 1) throw Error()
if (readAtPath(tree, ['two', 'three', 'four', '0']) !== 4) throw Error()
if (readAtPath(tree, [Symbol()]) !== undefined) throw Error()

/**
 * replaceAtRoot
 */

prev = next = tree = error = undefined

prev = immute({
  one: {two: NaN},
  three: {four: 4},
  five: [5]
})

next = immute({
  one: {two: NaN},
  three: {four: [4]},
  six: 6
})

tree = replaceAtRoot(prev, next)

// Must be a non-referential copy of the next tree.
if (tree === prev || tree === next) throw Error()
if (!deepEqual(tree, next)) throw Error()
// Referential equality: keep old references if values are deep equal.
if (tree.one !== prev.one) throw Error()
// New values must be deep cloned.
if (tree.three === next.three) throw Error()
if (tree.three.four === next.three.four) throw Error()
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

// Must return the same reference if the result would be deep equal.
next = immute({
  one: {two: NaN},
  three: {four: 4},
  five: [5]
})
tree = replaceAtRoot(prev, next)
if (tree !== prev) throw Error()

/**
 * mergeAtRoot
 */

prev = next = tree = error = undefined

prev = immute({
  one: {two: NaN},
  three: {four: [4]},
  six: undefined,
  eight: {nine: 9},
  ten: {eleven: 11, twelve: [12]},
  thirteen: 13
})

next = immute({
  three: {five: 5},
  six: [6],
  seven: 7,
  eight: {nine: 9},
  ten: {eleven: 'eleven', twelve: [12]},
  thirteen: undefined
})

tree = mergeAtRoot(prev, next)

if (tree === prev || tree === next) throw Error()
if (deepEqual(tree, next)) throw Error()
// Keep unaffected values, with unchanged references.
if (tree.one !== prev.one) throw Error()
if (tree.three.four !== prev.three.four) throw Error()
if (tree.eight !== prev.eight) throw Error()
if (tree.ten.twelve !== prev.ten.twelve) throw Error()
// Must deep-patch new paths and values in, deep-cloning them.
if (tree.three.five !== next.three.five) throw Error()
if (tree.six === next.six) throw Error()
if (!deepEqual(tree.six, next.six)) throw Error()
if (tree.seven !== next.seven) throw Error()
if (tree.ten.eleven !== next.ten.eleven) throw Error()

// Undefined values at mutation must be removed from resulted tree
if (tree.hasOwnProperty('thirteen')) throw Error()

console.log(tree)

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

// Must return the same reference if the result would be deep equal.
next = immute({
  one: {two: NaN}
})
tree = mergeAtRoot(prev, next)
if (tree !== prev) throw Error()

/**
 * replaceAtPath
 */

prev = next = tree = error = undefined

prev = immute({
  one: {two: NaN},
  three: {four: {six: [6]}, five: 5}
})

next = immute({six: 6})

tree = replaceAtPath(prev, next, ['three', 'four'])

if (tree === prev || tree === next) throw Error()
// Must deep-patch the new value in, deep-cloning it.
if (tree.three.four === next) throw Error()
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

// Must return the same reference if the result would be deep equal.
next = immute({
  six: [6]
})
tree = replaceAtPath(prev, next, ['three', 'four'])
if (tree !== prev) throw Error()

/**
 * deepEqual
 */

prev = next = tree = error = undefined

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
 * immute
 */

prev = next = tree = error = undefined

tree = immute({
  one: {two: NaN},
  three: {four: [4]}
})

if (tree.three.four[0] !== 4) throw Error()

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

console.info(`[${new Date().getHours()}:${new Date().getMinutes()}:${new Date().getSeconds()}] Finished test without errors.`)

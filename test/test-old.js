'use strict'

/**
 * TODO
 *   remove, replace by new tests
 */

/**
 * Dependencies
 */

const {eq, deq, ndeq} = require('./utils-old')

const {putAt, patchAt} = require('../lib/emerge')

/**
 * Test
 */

putAt: {
  const prev = {one: {two: NaN}, three: {four: {six: [6]}, five: 5}}

  const next = {six: [6], seven: 7}

  const tree = putAt(['three', 'four'], prev, next)

  // Must differ from both source trees.
  ndeq(tree, prev)
  ndeq(tree, next)

  // Must deep-patch the new value in.
  deq(tree.three.four, next)

  // Must retain unaffected values without changing their references.
  eq(tree.three.five, prev.three.five)

  // Must retain unchanged values inside the patch without changing their references.
  eq(tree.three.four.six, prev.three.four.six)

  // Must ignore or unset keys with nil values.
  nil: {
    const next = {
      four: {six: undefined, seven: null}, five: 5
    }
    const tree = putAt(['three'], prev, next)
    deq(tree.three, {four: {}, five: 5})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = {
      six: [6],
      twelve: null
    }
    const tree = putAt(['three', 'four'], prev, next)
    eq(tree, prev)
  }

  // Must discriminate similar-looking plain objects and arrays.
  arrays: {
    const prev = {one: {0: 'two', length: 1}}
    const next = ['two']
    const tree = putAt(['one'], prev, next)
    deq(tree, {one: ['two']})
  }
}

patchAt: {
  const prev = {one: {two: [2], three: [3]}, five: NaN}

  const next = {two: [2], four: 4}

  const tree = patchAt(['one'], prev, next)

  // Must differ from both source trees.
  ndeq(tree, prev)
  ndeq(tree, next)

  // Must deep-patch the new value in.
  deq(tree.one.two, next.two)
  eq(tree.one.four, next.four)

  // Must retain unaffected values without changing their references.
  eq(tree.one.three, prev.one.three)
  deq(tree.five, prev.five)

  // Must retain unchanged values inside the patch without changing their references.
  eq(tree.one.two, prev.one.two)

  // Must ignore or unset keys with nil values.
  nil: {
    const next = {three: undefined, six: null}
    const tree = patchAt(['one'], prev, next)
    deq(tree.one, {two: [2]})
  }

  // Must return the same reference if the result would be deep equal.
  equal: {
    const next = {
      one: {three: [3]},
      twelve: null
    }
    const tree = patchAt([], prev, next)
    eq(tree, prev)
  }

  // Must discriminate similar-looking plain objects and arrays.
  arrays: {
    const prev = {one: {0: 'two', length: 1}}
    const next = ['two']
    const tree = patchAt(['one'], prev, next)
    deq(tree, {one: ['two']})
  }
}

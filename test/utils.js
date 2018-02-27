'use strict'

const {AssertionError} = require('assert')
// This becomes meaningful after passing the boolean tests, but no sooner.
// Therefore boolean tests must run first.
const e = require('../')

exports.is = is
function is(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    if (message) throw new AssertionError({message})
    throw new AssertionError({
      actual,
      expected,
      operator: `is`, stackStartFunction: is,
    })
  }
}

exports.equal = equal
function equal(actual, expected, message) {
  if (!e.equal(actual, expected)) {
    if (message) throw new AssertionError({message})
    throw new AssertionError({
      actual,
      expected,
      operator: `equals`, stackStartFunction: equal,
    })
  }
}

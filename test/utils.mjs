import {AssertionError} from 'assert'
import {inspect} from 'util'

// This becomes meaningful only after passing the boolean tests. Therefore
// boolean tests must run first, and must not use `equal` from this file.
import * as e from '../emerge.mjs'

export function is(actual, expected, message) {
  if (!Object.is(actual, expected)) {
    if (message) throw new AssertionError({message, stackStartFunction: is})
    throw new AssertionError({actual, expected, operator: `is`, stackStartFunction: is})
  }
}

export function equal(actual, expected, message) {
  if (!e.equal(actual, expected)) {
    if (message) throw new AssertionError({message, stackStartFunction: equal})
    throw new AssertionError({actual, expected, operator: `equal`, stackStartFunction: equal})
  }
}

export function throws(fun, messageOrClass) {
  if (!isFunction(fun)) {
    throw new AssertionError({message: `expected a function, got ${show(fun)}`})
  }
  if (!messageOrClass) {
    throw new AssertionError({
      message: `expected an error message or class, got ${show(messageOrClass)}`,
    })
  }
  try {
    fun()
  }
  catch (err) {
    if (isFunction(messageOrClass)) {
      if (!(err instanceof messageOrClass)) {
        throw new AssertionError({
          message: `expected ${show(fun)} to throw an instance of ${show(messageOrClass)}, got ${show(err)}`,
          stackStartFunction: throws,
        })
      }
    }
    else if (!err || !(err instanceof Error) || !err.message.match(messageOrClass)) {
      throw new AssertionError({
        message: (
          `expected ${show(fun)} to throw an error with a message matching ` +
          `${show(messageOrClass)}, got ${show(err)}`
        ),
        stackStartFunction: throws,
      })
    }
    return
  }
  throw new AssertionError({
    message: `expected ${show(fun)} to throw`,
    stackStartFunction: throws,
  })
}

function show(value) {
  return isFunction(value) && !value.name
    ? value.toString()
    : inspect(value, {breakLength: Infinity})
}

function isFunction(value) {
  return typeof value === 'function'
}

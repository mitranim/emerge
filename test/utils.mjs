// This becomes meaningful only after passing the boolean tests. Therefore
// boolean tests must run first, and must not use `equal` from this file.
import * as e from '../emerge.mjs'

export function is(actual, expected) {
  if (Object.is(actual, expected)) return

  throw new AssertionError(`
expected: ${show(expected)}
actual:   ${show(actual)}
`)
}

export function equal(actual, expected) {
  if (e.equal(actual, expected)) return

  throw new AssertionError(`
expected: ${show(expected)}
actual:   ${show(actual)}
`)
}

export function throws(fun, msgOrCls) {
  if (!isFun(fun)) {
    throw TypeError(`expected a function, got ${show(fun)}`)
  }

  if (!msgOrCls) {
    throw new AssertionError(`expected an error message or class, got ${show(msgOrCls)}`)
  }

  try {
    fun()
  }
  catch (err) {
    if (isFun(msgOrCls)) {
      if (!(err instanceof msgOrCls)) {
        throw new AssertionError(`expected ${show(fun)} to throw an instance of ${show(msgOrCls)}, got ${show(err)}`)
      }
    }
    else if (!err || !(err instanceof Error) || !err.message.match(msgOrCls)) {
      throw new AssertionError(
        `expected ${show(fun)} to throw an error with a message matching ` +
        `${show(msgOrCls)}, got ${show(err)}`
      )
    }
    return
  }

  throw new AssertionError(`expected ${show(fun)} to throw`)
}

function isFun(val) {return typeof val === 'function'}
function isObj(val) {return val !== null && typeof val === 'object'}
function isArr(val) {return Array.isArray(val)}
function isStr(val) {return typeof val === 'string'}
function isDict(val) {return isObj(val) && Object.getPrototypeOf(val) === Object.prototype}

function show(val) {
  if (isFun(val) && val.name) return val.name
  if (isStr(val) || isArr(val) || isDict(val)) {
    try {return JSON.stringify(val)}
    catch (_) {return String(val)}
  }
  return String(val)
}

class AssertionError extends Error {
  get name() {return this.constructor.name}
}

'use strict'

const {is} = Object
const pt = require('path')
const {isFunction} = require('util')
const {getMeta, report, blue, red, show, formatMeta} = require('./utils')

// NOTE: tests relying on `equal` have meaning only after './test-bool' passes.
const {equal} = require(pt.join(__dirname, '../lib/emerge'))

exports.expectIs = expectIs
function expectIs (fun, args, expected) {
  return runBy(fun, args, expected, is)
}

exports.expectEq = expectEq
function expectEq (fun, args, expected) {
  return runBy(fun, args, expected, equal)
}

function runBy (fun, args, expected, test) {
  const meta = getMeta({stackOffset: 2})

  if (!isFunction(fun)) return nofunReport(fun, meta)

  const value = fun(...args)
  return report(test(value, expected), {error:
`Function   ${red(show(fun))} failed test ${blue(test.name ? show(test) : test)}
Arguments: ${blue(show(args))}
Expected:  ${blue(show(expected))}
Got:       ${red(show(value))}
File:      ${formatMeta(meta)}`})
}

exports.testBy = testBy
function testBy (fun, args, test) {
  const meta = getMeta({stackOffset: 1})

  if (!isFunction(fun)) return nofunReport(fun, meta)
  if (!isFunction(test)) return nofunReport(test, meta)

  const value = fun(...args)
  return report(test(value), {error:
`Result of  ${red(show(fun))} failed test ${blue(test.name ? show(test) : test)}
Arguments: ${blue(show(args))}
Result:    ${red(show(value))}
File:      ${formatMeta(meta)}`})
}

function nofunReport (nofun, meta) {
  return report(false, {error:
`Expected a ${blue('function')}, got: ${red(show(nofun))}
File: ${formatMeta(meta)}`})
}

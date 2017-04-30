'use strict'

const {inspect} = require('util')
const {test, isFunction, isBoolean, isList, isArray, isString} = require('fpx')
const chalk = require('chalk')

// This becomes meaningful after passing the boolean tests, but no sooner.
// Therefore they must run first.
const {equal} = require('./lib/emerge')

/**
 * Setup
 */

exports.call = call
function call (fun, ...args) {
  if (!isFunction(fun)) {
    return {
      fun,
      args,
      ok: false,
      returned: undefined,
      thrown: Error(`Expected to receive a function, got ${show(fun)}`),
    }
  }
  try {
    return {
      fun,
      args,
      ok: true,
      returned: fun(...args),
      thrown: undefined,
    }
  }
  catch (thrown) {
    return {
      fun,
      args,
      ok: false,
      returned: undefined,
      thrown,
    }
  }
}

/**
 * Expectations
 */

const to = exports.to = {}

to.eq = expectEq
function expectEq (value) {
  return ({ok, returned}) => ({
    ok: ok && Object.is(returned, value),
    comment: `expecting ${chalk.blue(show(value))}`,
  })
}

to.equal = expectEqual
function expectEqual (value) {
  return ({ok, returned}) => ({
    ok: ok && equal(returned, value),
    comment: `should be deeply equal to ${chalk.blue(show(value))}`,
  })
}

to.throw = expectThrow
function expectThrow ({ok}) {
  return {ok: !ok, comment: 'should throw'}
}

to.preserveReference = expectSameReference
function expectSameReference ({ok, args: [arg], returned}) {
  return {
    ok: ok && Object.is(arg, returned),
    comment: chalk.blue(`should return the first argument unchanged`),
  }
}

/**
 * Finalisers
 */

// User-facing shorthand
exports.fail = fail
function fail (comment) {
  failWithComment(formatComment(comment, getStackInfo({stackOffset: 1})))
}

exports.expect = expect
function expect (result, getExpectation) {
  if (!isResult(result)) {
    failWithComment(formatComment(
      `Expected a 'call' result, got ${show(result)}`,
      getStackInfo({stackOffset: 1})
    ))
    return
  }

  if (!isFunction(getExpectation)) {
    failWithComment(formatComment(
      `Expected ƒ(result)->expectation, got ${show(getExpectation)}`,
      getStackInfo({stackOffset: 1})
    ))
    return
  }

  const expectation = getExpectation(result)

  if (!isExpectation(expectation)) {
    failWithComment(formatComment(
      `Expected a description of expectations, got ${show(expectation)}`,
      getStackInfo({stackOffset: 1})
    ))
    return
  }

  if (!expectation.ok) {
    failWithComment(formatReport(makeReport(
      result,
      expectation,
      getStackInfo({stackOffset: 1})
    )))
  }
}

function formatComment (comment, stackInfo = getStackInfo({stackOffset: 1})) {
  return `
Location:  ${formatStackInfo(stackInfo)}
Message:   ${chalk.red(show(comment))}
`.trim()
}

/**
 * Internal
 */

function failWithComment (comment) {
  console.error(comment)
  process.exit(1)
}

function getStackInfo ({stackOffset} = {stackOffset: 0}) {
  const {stack} = Error()
  const lines = stack.split(/\n/g)
  const line = lines[lines.findIndex(str => /at getStackInfo /.test(str)) + stackOffset + 1]
  const [, name, filename, row, col] = line.match(/at (\S+).*?([^/(]+):(\d+):(\d+)/)
  return {name, filename, row, col}
}

function formatStackInfo ({filename, row, col}) {
  return `${chalk.blue(filename)}, row ${chalk.blue(row)}, column ${chalk.blue(col)}`
}

function makeReport (result, expectation, stackInfo = getStackInfo({stackOffset: 1})) {
  if (!isResult(result)) {
    return [{
      title: 'Internal',
      body: `Expected a call result, received ${chalk.red(show(result))}`,
    }]
  }

  if (!isExpectation(expectation)) {
    return [{
      title: 'Internal',
      body: `Expected a description of expectations, got ${chalk.red(show(expectation))}`,
    }]
  }

  if (!isStackInfo(stackInfo)) {
    return [{
      title: 'Internal',
      body: `Expected stack info, received ${chalk.red(show(stackInfo))}`,
    }]
  }

  const {fun, args, ok, returned, thrown} = result

  return [
    {title: 'Location',  body: formatStackInfo(stackInfo)},
    {title: 'Function',  body: chalk.blue(show(fun))},
    {title: 'Arguments', body: chalk.blue(args.map(show).join(' '))},

    ok ?
    {title: 'Returned', body: (expectation.ok ? chalk.blue : chalk.red)(show(returned))} :
    {title: 'Thrown',   body: (expectation.ok ? chalk.blue : chalk.red)(show(thrown))},

    {title: 'Comment', body: expectation.comment},
  ]
}

function formatReport (report) {
  if (!isReport(report)) {
    return `Malformed report: ${chalk.red(show(report))}`
  }

  const titleLength = Math.max(...report.map(row => row.title.length))

  return joinLines(report.map(({title, body}) => (
    `${title}:${spaces(titleLength - title.length)} ${body}`
  )))
}

function show (value) {
  return isFunction(value) ? showFun(value) : inspect(value, {depth: null})
}

function showFun (fun) {
  return fun.name ? inspect(fun) : fun.toString()
}

function joinLines (list) {
  return list.filter(Boolean).join('\n')
}

function spaces (count) {
  return Array(count).fill(' ').join('')
}

const isStackInfo = test({name: isString, filename: isString, row: isString, col: isString})

const isResult = test({fun: isFunction, args: isList, ok: isBoolean, returned: any, thrown: any})

const isExpectation = test({ok: isBoolean, comment: isString})

function isReport (report) {
  return isArray(report) && report.every(isReportRow)
}

const isReportRow = test({title: isString, body: isString})

function any () {return true}

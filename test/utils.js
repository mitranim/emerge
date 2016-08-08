'use strict'

/**
 * Testing Microframework
 */

const {inspect} = require('util')

// type Details = {error}
// type Context = [Details]
// type Report  = [[Context], Bool]
// type Test a  = a -> Report

exports.report = report
function report (ok, context) {
  return [ok ? [] : [context], !!ok]
}

exports.runReports = runReports
function runReports (reports) {
  const [contexts, ok] = reports.reduce(mplus)
  if (!ok) {
    process.stderr.write(format(contexts))
    process.exitCode = 1
  }
}

exports.mplus = mplus
function mplus ([c0, v0], [c1, v1]) {
  return [mappendC(c0, c1), mappendV(v0, v1)]
}

function mappendC (a, b) {
  return a.concat(b)
}

function mappendV (a, b) {
  return a && b
}

exports.getMeta = getMeta
function getMeta ({stackOffset = 0} = {}) {
  const {stack} = Error()
  const lines = stack.split(/\n/g)
  const line = lines[lines.findIndex(x => /at getMeta /.test(x)) + stackOffset + 1]
  const [, name, filename, row, col] = line.match(/at (\S+).*?([^/(]+):(\d+):(\d+)/)
  return {name, filename, row, col}
}

function getError ({error}) {return error}

exports.format = format
function format (contexts) {
  return '\n' + contexts.map(getError).filter(Boolean).join('\n\n') + '\n\n'
}

exports.formatMeta = formatMeta
function formatMeta ({filename, row, col}) {
  return `${blue(filename)}, row ${blue(row)}, column ${blue(col)}`
}

const BLUE = '\x1b[34m'
const RED = '\x1b[31m'
const RESET = '\x1b[39m'

exports.blue = blue
function blue (msg) {
  return `${BLUE}${msg}${RESET}`
}

exports.red = red
function red (msg) {
  return `${RED}${msg}${RESET}`
}

exports.show = show
function show (value) {
  return inspect(value, {depth: null})
}

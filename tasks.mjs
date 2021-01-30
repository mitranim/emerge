import * as cp from 'child_process'
import * as fs from 'fs'
import * as ut from 'util'
import * as pt from 'path'
import el from 'eslint'

/* Globals */

const MAIN_FILE             = './emerge.mjs'
const TEST_DIR              = './test'
const TEST_FILE             = pt.join(TEST_DIR, 'test.mjs')
const ESC                   = '\x1b'
const TERM_CLEAR_SOFT       = `${ESC}c`
const TERM_CLEAR_SCROLLBACK = `${ESC}[3J`
const TERM_CLEAR_HARD       = TERM_CLEAR_SOFT + TERM_CLEAR_SCROLLBACK

let testProc = undefined
const linter = new el.ESLint()

/* Args */

const args = new Set(process.argv.slice(2))
const TEST = pop(args, 'test')
const LINT = pop(args, 'lint')
const WATCH = pop(args, 'watch')
if (args.size) throw Error(`unknown args: ${ut.inspect(args)}`)

const tasks = trim(TEST && test, LINT && lint)

if (WATCH) {
  runTasksNonFatal(tasks)
  watch(tasks)
}
else {
  runTasksFatal(tasks)
}

/* Commands */

async function test() {
  testProc = rerunFork(testProc, TEST_FILE, [])
  const exitCode = await waitForSubproc(testProc)

  if (exitCode == null) throw Error(`[test] failed to wait until completion`)
  if (exitCode) throw Error(`[test] exited with ${exitCode}`)
  console.log(`[test] ok`)
}

async function lint() {
  const results = await linter.lintFiles(MAIN_FILE)
  const failCount = eslintResultsFailCount(results)

  if (failCount) {
    const fmt = await linter.loadFormatter('stylish')
    console.log(fmt.format(results))
    throw Error(`[lint] ${failCount} failures`)
  }

  console.log('[lint] ok')
}

function watch(tasks) {
  tasks = tasks.filter(Boolean)

  function rerun() {
    console.log(TERM_CLEAR_HARD)
    runTasksNonFatal(tasks)
  }

  fs.watch(MAIN_FILE, {}, rerun)
  fs.watch(TEST_DIR, {recursive: true}, rerun)
}

/* Utils */

function pop(set, val) {
  const had = set.has(val)
  set.delete(val)
  return had
}

function fail(err) {
  console.error(err)
  process.exit(1)
}

function eslintResultsFailCount(results) {
  return results.reduce(addFailCount, 0)
}

function addFailCount(acc, res) {
  return acc + (res.errorCount || 0) + (res.warningCount || 0)
}

function runTasksNonFatal() {
  for (const task of tasks) task().catch(console.error)
}

function runTasksFatal() {
  for (const task of tasks) task().catch(fail)
}

function rerunFork(proc, path, args) {
  if (proc) proc.kill()
  return cp.fork(path, args, {shell: true, stdio: 'inherit'})
}

function waitForSubproc(proc) {
  return new Promise(res => proc.on('exit', res))
}

function trim(...args) {
  return args.filter(Boolean)
}

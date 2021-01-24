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

const tasks = [TEST && test, LINT && lint].filter(Boolean)

if (WATCH) {
  for (const task of tasks) task().catch(console.error)
  watch(tasks)
}
else {
  for (const task of tasks) task().catch(fail)
}

/* Commands */

async function test() {
  if (testProc) testProc.kill()
  testProc = cp.fork(TEST_FILE, [], {shell: true, stdio: 'inherit'})
  const code = await new Promise(res => testProc.on('exit', res))

  if (code) throw Error(`[test] exited with ${code}`)
  console.log(`[test] ok`)
}

async function lint() {
  const results = await linter.lintFiles(MAIN_FILE)
  const failCount = results.reduce((acc, res) => (res.errorCount || 0) + (res.warningCount || 0), 0)

  if (failCount) {
    const fmt = await linter.loadFormatter('stylish')
    console.log(fmt.format(results))
    throw Error(`[lint] ${failCount} failures`)
  }

  console.log('[lint] ok')
}

/* Utils */

function watch(tasks) {
  tasks = tasks.filter(Boolean)

  function rerun() {
    console.log(TERM_CLEAR_HARD)
    for (const task of tasks) task().catch(console.error)
  }

  fs.watch(MAIN_FILE, {}, rerun)
  fs.watch(TEST_DIR, {recursive: true}, rerun)
}

function pop(set, val) {
  const had = set.has(val)
  set.delete(val)
  return had
}

function fail(err) {
  console.error(err)
  process.exit(1)
}

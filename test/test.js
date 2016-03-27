'use strict'

const fs = require('fs')

// Hack to enable test-only code.
require.extensions['.js'] = (module, path) => {
  module._compile(
    fs.readFileSync(path, 'utf8')
      .replace(/^\s*\/\*\s*#if\s+TESTING\b.*$/gm, '')
      .replace(/^\s*#endif.*\*\/$/gm, ''),
    path
  )
}

require('./test-emerge')

console.log(`[${pad(new Date().getHours())}:${pad(new Date().getMinutes())}:${pad(new Date().getSeconds())}] Finished test without errors.`)

function pad (val) {
  return typeof val !== 'string'
    ? pad(String(val))
    : val.length < 2 ? ('0' + val) : val
}

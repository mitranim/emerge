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

const {runReports} = require('./utils')

runReports([
  ...require('./test-bool'),
  ...require('./test-read'),
  ...require('./test-merge')
])

require('./test-old')

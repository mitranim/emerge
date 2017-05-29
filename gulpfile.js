'use strict'

/* ***************************** Dependencies ********************************/

const $ = require('gulp-load-plugins')()
const del = require('del')
const gulp = require('gulp')
const {exec} = require('child_process')
const chalk = require('chalk')

/* ******************************** Globals **********************************/

const src = {
  lib: 'lib/**/*.js',
  dist: 'dist/**/*.js',
  test: 'test/**/*.js',
}

const out = {
  lib: 'dist',
}

const testCommand = require('./package').scripts.test

let testProc = null

/* ********************************* Tasks ***********************************/

gulp.task('clear', () => (
  del(out.lib).catch(console.error.bind(console))
))

gulp.task('compile', () => (
  gulp.src(src.lib)
    .pipe($.babel())
    .pipe(gulp.dest(out.lib))
))

// For evaluating minified size
gulp.task('minify', () => (
  gulp.src(src.dist, {ignore: '**/*.min.js'})
    .pipe($.uglify({
      mangle: {toplevel: true},
      compress: {warnings: false},
    }))
    .pipe($.rename(path => {
      path.extname = '.min.js'
    }))
    .pipe(gulp.dest(out.lib))
))

gulp.task('test', done => {
  // Just started, let it finish
  if (testProc && testProc.exitCode == null) return

  if (testProc) testProc.kill()

  testProc = exec(
    testCommand,
    {env: {FORCE_COLOR: true}},
    (err, stdout, stderr) => {
      process.stdout.write(stdout)
      if (err) {
        done({
          showStack: false,
          toString () {
            return `${chalk.red('Error')} in plugin '${chalk.cyan('lib:test')}':\n${stderr}`
          },
        })
      }
      else {
        process.stderr.write(stderr)
        done(null)
      }
    }
  )
})

gulp.task('watch', () => {
  $.watch(src.lib, gulp.series('build', 'test'))
  $.watch([src.test, './test-utils.js'], gulp.series('test'))
})

gulp.task('build', gulp.series('clear', 'compile', 'minify'))

gulp.task('default', gulp.series('test', 'build', 'watch'))

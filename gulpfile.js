'use strict'

/* ***************************** Dependencies ********************************/

const $ = require('gulp-load-plugins')()
const del = require('del')
const gulp = require('gulp')
const {exec} = require('child_process')

/* ******************************** Globals **********************************/

const src = {
  lib: 'lib/**/*.js',
  dist: 'dist/**/*.js'
}

const out = 'dist'

const test = 'test/**/*.js'

const testCommand = require('./package').scripts.test

function noop () {}

let testProc

/* ********************************* Tasks ***********************************/

gulp.task('clear', () => (
  del(out).catch(noop)
))

gulp.task('compile', () => (
  gulp.src(src.lib)
    .pipe($.babel())
    .pipe(gulp.dest(out))
))

// Purely for evaluating minified code size.
gulp.task('minify', () => (
  gulp.src(src.dist, {ignore: '**/*.min.js'})
    .pipe($.uglify({
      mangle: true,
      compress: {warnings: false, screw_ie8: true},
      wrap: true
    }))
    .pipe($.rename(path => {
      path.extname = '.min.js'
    }))
    .pipe(gulp.dest(out))
))

gulp.task('test', done => {
  if (testProc) {
    // Just started, let it finish
    if (testProc.exitCode == null) return
    testProc.kill()
  }

  $.util.log('Test started')

  testProc = exec(testCommand, (err, stdout, stderr) => {
    process.stdout.write(stdout)
    process.stderr.write(stderr)

    if (err) {
      throw new $.util.PluginError('lib:test', 'Test failed', {showProperties: false})
    } else {
      $.util.log('Test finished')
      done()
    }
  })
})

gulp.task('watch', () => {
  $.watch(src.lib, gulp.parallel('test', 'build'))
  $.watch(test, gulp.series('test'))
})

gulp.task('build', gulp.series('clear', 'compile', 'minify'))

gulp.task('default', gulp.series('test', 'build', 'watch'))

'use strict'

/**
 * Requires gulp 4.0:
 *   "gulp": "gulpjs/gulp#4.0"
 *
 * Requires Node.js 4.0+
 */

/** **************************** Dependencies ********************************/

const $ = require('gulp-load-plugins')()
const del = require('del')
const gulp = require('gulp')
const exec = require('child_process').exec

/** ******************************* Globals **********************************/

const src = {
  lib: 'lib/**/*.js',
  dist: 'dist/**/*.js'
}

const out = 'dist'

const test = 'test/**/*.js'

const testCommand = require('./package').scripts.test

/** ******************************** Tasks ***********************************/

gulp.task('clear', function (done) {
  del(out).then(() => {done()})
})

gulp.task('compile', function () {
  return gulp.src(src.lib)
    .pipe($.babel())
    .pipe(gulp.dest(out))
})

gulp.task('minify', function () {
  return gulp.src(src.dist)
    .pipe($.uglify({mangle: true, compress: {warnings: false}}))
    .pipe($.rename(path => {
      path.extname = '.min.js'
    }))
    .pipe(gulp.dest(out))
})

gulp.task('test', function (done) {
  exec(testCommand, (err, stdout) => {
    process.stdout.write(stdout)
    done(err)
  })
})

gulp.task('watch', function () {
  $.watch(src.lib, gulp.series('build', 'test'))
  $.watch(test, gulp.series('test'))
})

gulp.task('build', gulp.series('clear', 'compile', 'minify'))

gulp.task('default', gulp.series('build', 'test', 'watch'))

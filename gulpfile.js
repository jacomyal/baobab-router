var gulp = require('gulp'),
    rename = require('gulp-rename'),
    jshint = require('gulp-jshint'),
    gjslint = require('gulp-gjslint'),
    browserify = require('browserify'),
    transform = require('vinyl-transform'),
    mochaPhantomJS = require('gulp-mocha-phantomjs');



/**
 * ********
 * LINTING:
 * ********
 */
gulp.task('lint', function() {
  // Linting configurations
  var jshintConfig = {
        '-W040': true,
        node: true,
        browser: true
      },
      gjslintConfig = {
        flags: ['--nojsdoc', '--disable 211,212']
      };

  return gulp.src('./baobab-router.js')
    .pipe(jshint(jshintConfig))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'))
    .pipe(gjslint(gjslintConfig))
    .pipe(gjslint.reporter('console'), { fail: true });
});



/**
 * ********
 * TESTING:
 * ********
 */
gulp.task('test-build', function() {
  var bundle = transform(function(path) {
    return browserify({
        entries: path
      })
      .bundle();
  });

  return gulp.src('./test/collection.js')
    .pipe(bundle)
    .pipe(rename('test.js'))
    .pipe(gulp.dest('./test/build'));
});

gulp.task('test', ['test-build'], function() {
  return gulp.src('./test/test.html')
    .pipe(mochaPhantomJS({ reporter: 'spec' }));
});



gulp.task('default', ['test']);

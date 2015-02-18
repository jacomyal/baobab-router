var gulp = require('gulp'),
    rename = require('gulp-rename'),
    browserify = require('browserify'),
    transform = require('vinyl-transform'),
    mochaPhantomJS = require('gulp-mocha-phantomjs');


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

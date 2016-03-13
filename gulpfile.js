var gulp = require('gulp');

var jade = require('gulp-jade');
var sass = require('gulp-sass');
var remember = require('gulp-remember');
var cache = require('gulp-cached');
var concat = require('gulp-concat');
var merge = require('merge-stream');
var browserSync = require('browser-sync').create();
var fallback = require('connect-history-api-fallback');
var plumb = require('gulp-plumber');
//var babel = require('gulp-babel');
var debug = require('gulp-debug');
var prepend = require('gulp-insert').prepend;
var series = require('stream-series');
var rename = require('gulp-rename');
var autoprefixer = require('gulp-autoprefixer');

var bower = require('main-bower-files');

gulp.task('styles', function() {
  var appCss = gulp.src([
    'lib/pages/**/*.scss',
    'lib/site-wide/styles/app.scss'
  ])
    .pipe(plumber())
    .pipe(cache('styles'))
    .pipe(sass({
      includePaths: ['./lib/site-wide/styles/']
    }))
    .pipe(autoprefixer({
      browsers: 'last 2 versions',
      cascade: false
    }))
    .pipe(remember('styles'));

  var bowerCss = gulp.src(bower('**/*.css'));

  return merge(appCss, bowerCss)
    .pipe(concat('app.css'))
    .pipe(gulp.dest('dist/'))
    .pipe(browserSync.stream());
});

gulp.task('scripts', function() {
  var bowerJs = gulp.src(bower('**/*.js'));

  var appJs = gulp.src(['lib/**/*.js'])
    .pipe(plumber())
    .pipe(cache('scripts'))
    //.pipe(babel())
    .pipe(remember('scripts'));


  return series(bowerJs, appJs)
    .pipe(concat('app.js'))
    .pipe(gulp.dest('dist/'))
    .pipe(browserSync.stream());
});

gulp.task('jade', function() {
  var jadeFiles = gulp.src(['lib/**/*.jade', '!lib/site-wide/layout.jade'])
    .pipe(plumber())
    .pipe(cache('jade'))
    .pipe(jade())
    .pipe(remember('jade'))

  var indexFile = gulp.src('lib/site-wide/layout.jade')
    .pipe(plumber())
    .pipe(jade())
    .pipe(rename({
      dirname: '',
      basename: 'index'
    }));

  return series(jadeFiles, indexFile)
    .pipe(gulp.dest('dist/'))
    .pipe(browserSync.stream());
});

gulp.task('assets', function() {
  gulp.src([
    'vendor/**', '!vendor/**.css', '!vendor/**.js', 'lib/assets/**'
  ])
  .pipe(gulp.dest('dist/'));
});

gulp.task('build', ['styles', 'scripts', 'jade', 'assets']);

gulp.task('serve', function() {
  browserSync.init({
    notify: false,
    open: false,
    server: {
      baseDir: 'dist/',
      middleware: [ fallback({ index: './index.html' }) ]
    }
  });
});

gulp.task('default', ['watch']);

gulp.task('watch', ['serve', 'build'], function() {
  gulp.watch(['lib/site-wide/styles/**.scss', '!lib/site-wide/styles/app.scss'], ['styles'])
    .on('change', burstCache('styles'));

  var sassWatch = gulp.watch('lib/**/*.scss', ['styles'])
    .on('change', uncacheRemoved('styles'));


  var jadeWatch = gulp.watch('lib/**/*.jade', ['jade'])
    .on('change', uncacheRemoved('jade'));

  var jsWatch = gulp.watch('lib/**/*.js', ['scripts'])
    .on('change', uncacheRemoved('scripts'));

  var bowerWatch = gulp.watch(['bower.json', 'bower_components/**.js', 'bower_components/**.css'], { debounceDelay: 1000 }, ['scripts', 'styles']);

  function burstCache(name) {
    return function(event) {
      cache.caches[name] = {};
    };
  }

  function uncacheRemoved(name) {
    return function(event) {
      if (event.type === 'deleted') {
        if (cache.caches[name]) {
          delete cache.caches[name][event.path];
          remember.forget(name, event.path);
        }
      }
    };
  }
});

function plumber() {
  return plumb({
    errorHandler: function(err) {
      console.log(err);
      this.emit('end');
    }
  });
}

var awspublish = require('gulp-awspublish');
var config = require('./config');
gulp.task('deploy', function() {
  var publisher = awspublish.create(config.aws);
  var headers = {};
  return gulp.src('./dist/**')
    .pipe(publisher.publish(headers))
    .pipe(publisher.cache())
    .pipe(awspublish.reporter());
});


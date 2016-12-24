
var gulp = require('gulp');
var babelify = require('babelify');
var browserify = require("browserify");
var source = require("vinyl-source-stream");
var uglify = require("gulp-uglify");
var streamify = require("gulp-streamify");
var minify = require('gulp-minify');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var ngAnnotate = require('browserify-ngannotate');
var jetpack = require('fs-jetpack');
var watchify = require('watchify');
var gutil = require('gulp-util');
var notify = require("gulp-notify");
var browserSync = require('browser-sync').create();

var srcDir = jetpack.cwd('src');
var distDir = jetpack.cwd('dist');

gulp.task('build', ['copy', 'concat-css'], function () {
    return buildScript('main.js', false);
});

function handleErrors() {
    var args = Array.prototype.slice.call(arguments);
    notify.onError({
        title: "Compile Error",
        message: "<%= error.message %>"
    }).apply(this, args);
    this.emit('end'); // Keep gulp from hanging on this task
}

/*
 * Watches files and updates the build on change
 * 
 * Based on: http://blog.avisi.nl/2014/04/25/how-to-keep-a-fast-build-with-browserify-and-reactjs/
 */
function buildScript(file, watch) {

    var props = { entries: [srcDir.path() + '/' + file], debug: true, cache: {}, packageCache: {} };
    var bundler = watch ? watchify(browserify(props)) : browserify(props);
    bundler.transform('babelify', {'presets': ['es2015']});
    bundler.transform(ngAnnotate);
    function rebundle() {
        var stream = bundler.bundle();

        return stream.on('error', handleErrors)
            .pipe(source(file))
            .pipe(streamify(uglify().on('error', gutil.log)))
            .pipe(gulp.dest(distDir.path() + '/'));

    }

    bundler.on('update', function () {
        rebundle();
        gutil.log('Rebundle...');
    });

    return rebundle();
}

gulp.task('copy', ['clean'], function () {

    return srcDir.copy('.', distDir.path(), {
        matching: ['partial/**/*.html'
            , 'index.html'
            , 'svg/**/*.svg'
            , 'img/**/*.png'
        ]
    });

});

gulp.task('clean', function () {

    return distDir.remove();

});

gulp.task('default', ['build'], function () {

    browserSync.init({
        server: {
            baseDir: distDir.path()
        }
    });
    gulp.watch("dist/*.js").on('change', browserSync.reload);


    return buildScript('main.js', true);
});

gulp.task('app-css', function () {

    return gulp.src(srcDir.path('styles/**/*.sass'))
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(distDir.path('css')));

});

gulp.task('vendor-css', function () {

    return gulp.src(['node_modules/angular-material/angular-material.min.css'])
        .pipe(gulp.dest(distDir.path('css')))

});

gulp.task('concat-css', ['vendor-css', 'app-css'], function () {

    gulp.src([
        'dist/css/*.css',
        'dist/css/angular-material.min.css'
    ])
        .pipe(concat('css/style.css'))
        .pipe(gulp.dest(distDir.path()));

});

gulp.task('debug', ['copy', 'concat-css'], function () {

    return browserify('./src/main')
        .transform(ngAnnotate)
        .bundle()
        .pipe(source('main.js'))
        .pipe(gulp.dest('./dist'));

});

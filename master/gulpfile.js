const gulp = require('gulp');
const prettify = require('gulp-html-prettify');
const args      = require('yargs').argv,
    path        = require('path'),
    $           = require('gulp-load-plugins')(),
    flipper     = require('gulp-css-flipper');

// production mode (see build task)
var isProduction = false;
// styles sourcemaps
var useSourceMaps = true;

// Switch to sass mode. 
// Example:
//    gulp --usesass
var useSass = args.usesass;

// ignore everything that begins with underscore
var hidden_files = '**/_*.*';
var ignored_files = '!'+hidden_files;

// MAIN PATHS
var paths = {
  app:     '../app/',
  markup:  'jade/',
  styles:  'less/',
  scripts: 'js/'
}

// if sass -> switch to sass folder
if(useSass) {
  log('Using SASS stylesheets...');
  paths.styles = 'sass/';
}


// VENDOR CONFIG
var vendor = {
  // vendor scripts required to start the app
  base: {
    source: require('./vendor.base.json'),
    dest: '../app/js',
    name: 'base.js'
  },
  // vendor scripts to make the app work. Usually via lazy loading
  app: {
    source: require('./vendor.json'),
    dest: '../vendor'
  }
};


// SOURCES CONFIG 
var source = {
  scripts: [paths.scripts + 'app.init.js',
            paths.scripts + 'modules/*.js',
            paths.scripts + 'modules/controllers/*.js',
            paths.scripts + 'modules/directives/*.js',
            paths.scripts + 'modules/services/*.js',
            paths.scripts + 'modules/filters/*.js',
            paths.scripts + 'custom/**/*.js'
  ],
  templates: {
    index: [paths.markup + 'index.*'],
    views: [paths.markup + '**/*.*', '!' + paths.markup + 'index.*']
  },
  styles: {
    app:    [ paths.styles + '*.*'],
    themes: [ paths.styles + 'themes/*'],
    watch:  [ paths.styles + '**/*', '!'+paths.styles+'themes/*']
  }
};

// BUILD TARGET CONFIG 
var build = {
  scripts: paths.app + 'js',
  styles:  paths.app + 'css',
  templates: {
    index: '../',
    views: paths.app
  }
};

// PLUGINS OPTIONS

var prettifyOpts = {
  indent_char: ' ',
  indent_size: 4,
  unformatted: ['a', 'sub', 'sup', 'b', 'i', 'u']
};

var vendorUglifyOpts = {
  mangle: {
    except: ['$super'] // rickshaw requires this
  }
};

var compassOpts = {
  project: path.join(__dirname, '../'),
  css: 'app/css',
  sass: 'master/sass/',
  image: 'app/img'
};

var compassOptsThemes = {
  project: path.join(__dirname, '../'),
  css: 'app/css',
  sass: 'master/sass/themes/', // themes in a subfolders
  image: 'app/img'
};

// Error handler
function handleError(err) {
  log(err.toString());
  this.emit('end');
}

// log to console using 
function log(msg) {
  $.util.log( $.util.colors.blue( msg ) );  
}

//---------------
// TASKS
//---------------


// JS APP
function scripts_app() {
  log('Building scripts app..');
  // Minify and copy all JavaScript (except vendor scripts)
  return gulp.src(source.scripts)
    .pipe($.if( useSourceMaps, $.sourcemaps.init() ))
    .pipe($.concat( 'app.js' ))
    .pipe($.ngAnnotate())
    .on('error', handleError)
    .pipe($.if(isProduction, $.uglify({ mangle: true, output: {
          beautify: true,
          comments: "all"
      }})))
    .on('error', handleError)
    .pipe($.if( useSourceMaps, $.sourcemaps.write() ))
    .pipe(gulp.dest(build.scripts));
};

// Build the base script to start the application from vendor assets
function vendor_base() {
  log('Copying base vendor assets..');
  return gulp.src(vendor.base.source)
    .pipe($.expectFile(vendor.base.source))
    .pipe($.if( isProduction, $.uglify({ mangle: false }) ))
    .pipe($.concat(vendor.base.name))
    .pipe(gulp.dest(vendor.base.dest));
};

// copy file from bower folder into the app vendor folder
function vendor_app() {
  log('Copying vendor assets..');
  var jsFilter = $.filter('**/*.js', { restore: true });
  var cssFilter = $.filter('**/*.css', { restore: true });
  
  return gulp.src(vendor.app.source, {base: 'bower_components'})
    .pipe($.expectFile(vendor.app.source))
    .pipe(jsFilter)
    .pipe($.if( isProduction, $.uglify({ mangle: false })))
    .pipe(jsFilter.restore)
    .pipe(cssFilter)
    .pipe($.if( isProduction, $.minifyCss() ))
    .pipe(cssFilter.restore)
    .pipe(gulp.dest(vendor.app.dest));
};

// APP LESS
function styles_app() {
  log('Building application styles..');
  return gulp.src(source.styles.app)
    .pipe( $.if( useSourceMaps, $.sourcemaps.init() ))
    .pipe( useSass ? $.compass(compassOpts) : $.less() )
    .on('error', handleError)
    .pipe( $.if( isProduction, $.minifyCss() ))
    .pipe( $.if( useSourceMaps, $.sourcemaps.write() ))
    .pipe(gulp.dest(build.styles));
};

// APP RTL
function styles_app_rtl() {
  log('Building application RTL styles..');
  return gulp.src(source.styles.app)
    .pipe( $.if( useSourceMaps, $.sourcemaps.init() ))
    .pipe( useSass ? $.compass(compassOpts) : $.less() )
    .on('error', handleError)
    .pipe(flipper())
    .pipe( $.if( isProduction, $.minifyCss() ))
    .pipe( $.if( useSourceMaps, $.sourcemaps.write() ))
    .pipe($.rename(function(path) {
        path.basename += "-rtl";
        return path;
    }))
    .pipe(gulp.dest(build.styles));
};

// LESS THEMES
function styles_themes() {
  log('Building application theme styles..');
  return gulp.src(source.styles.themes)
    .pipe( useSass ? $.compass(compassOptsThemes) : $.less() )
    .on('error', handleError)
    .pipe(gulp.dest(build.styles));
};

// JADE
function templates_index() {
  log('Building index..');
  return gulp.src(source.templates.index)
    .pipe($.changed(build.templates.index, { extension: '.html' }))
    .pipe( $.jade() )
    .on('error', handleError)
    .pipe(prettify( prettifyOpts ))
    .pipe(gulp.dest(build.templates.index));
};

// JADE
function templates_views() {
  log('Building views..');
  return gulp.src(source.templates.views)
    .pipe($.if( !isProduction, $.changed(build.templates.views, { extension: '.html' }) ))
    .pipe($.jade())
    .on('error', handleError)
    .pipe(prettify( prettifyOpts ))
    .pipe(gulp.dest(build.templates.views));
};



exports.default = scripts_app,
exports.default = styles_app,
exports.default = styles_app_rtl,
exports.default = styles_themes,
exports.default = templates_index,
exports.default = templates_views 

//---------------
// WATCH
//---------------

// Rerun the task when a file changes
function watching() {
  log('Starting watch and LiveReload..');

  $.livereload.listen();

  gulp.watch(source.scripts,         gulp.series(scripts_app));
  gulp.watch(source.styles.watch,    gulp.series(styles_app, styles_app_rtl));
  gulp.watch(source.styles.themes,   gulp.series(styles_themes));
  gulp.watch(source.templates.views, gulp.series(templates_views));
  gulp.watch(source.templates.index, gulp.series(templates_index));

  // a delay before triggering browser reload to ensure everything is compiled
  var livereloadDelay = 1500;
  // list of source file to watch for live reload
  var watchSource = [].concat(
      source.scripts,
      source.styles.watch,
      source.styles.themes,
      source.templates.views,
      source.templates.index
    );

  gulp
    .watch(watchSource)
    .on('change', function(event) {
      setTimeout(function() {
        $.livereload.changed( event.path );
      }, livereloadDelay);
    });
};

exports.default = prod;
exports.default = vendor_base;
exports.default = vendor_app;

//---------------
// MAIN TASKS
//---------------

function prod(done) { 
  log('Starting production build...');
  isProduction = true; 
  done();
};

// VENDOR BUILD
var vendorTask = gulp.series(vendor_base, vendor_app);

var assets = gulp.series(
  scripts_app,
  styles_app,
  styles_app_rtl,
  styles_themes,
  templates_index,
  templates_views 
);

// build for production (minify)
var building = gulp.series(
  prod,
  vendorTask,
  assets
)

// default (no minify)
var _default = gulp.series(
  vendorTask,
  assets,
  watching, 
  function (done){
    log('************');
    log('* All Done * You can start editing your code, LiveReload will update your browser after any change..');
    log('************');
    done();
  }
)

function usesources (done) { 
  useSourceMaps = true; 
  done();
};

// build with sourcemaps (no minify)
gulp.task("sourcemaps", gulp.series(usesources, _default));
// build
gulp.task("build", building);
gulp.task("default", _default);
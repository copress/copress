/**
 * lib/generators/app_generator.js
 *
 * @defines {AppGenerator}
 * @since {1.1.4}
 * @creator {Sascha Gehlich <sascha@gehlich.us>}
 * @description {
 *   Generates an entirely new CompoundJS application
 * }
 */

/**
 * Module dependencies
 */
var util = require('util')
    , BaseGenerator = require('./base_generator')
    , path = require('path');

/**
 * Generates an entirely new CompoundJS application
 *
 * @constructor
 */
function AppGenerator() {
    AppGenerator.super_.call(this);
}
util.inherits(AppGenerator, BaseGenerator);

/**
 * Command line aliases
 */
AppGenerator.aliases = ['app', 'a', 'init'];

/**
 * Default key name (first command line argument is stored in options[defaultKeyName])
 */
AppGenerator.prototype.defaultKeyName = 'appName';

/**
 * Performs the generator action
 *
 * @param {Array} arguments
 */
AppGenerator.prototype.perform = function (/* args */) {
    BaseGenerator.prototype.perform.apply(this, [].slice.call(arguments));

    var appname = this.options.appName;
    if (appname) {
        this.baseDir = path.join(this.baseDir, appname);
    }
    if (this.isBaseDirExists()) {
        return;
    }
    this.createDirectoryStructure();
    this.copyFiles();

    appname && process.on('exit', function () {
        console.log();
        console.log('   install dependencies:');
        console.log('     $ cd %s && npm install', appname);
        console.log();
        console.log('   run the app:');
        console.log('     $ node server');
        console.log();
    });
};

/**
 * Creates the basic directory structure
 */
AppGenerator.prototype.createDirectoryStructure = function () {
    var self = this;
    [
        'app/',
        'app/assets/',
        'app/assets/coffeescripts/',
        'app/assets/stylesheets/',
        'app/models/',
        'app/controllers/',
        'app/helpers/',
        'app/tools/',
        'app/views/',
        'app/views/layouts/',
        'db/',
        'db/seeds/',
        'db/seeds/development/',
        'log/',
        'public/',
        'public/images',
        'public/stylesheets/',
        'public/javascripts/',
        'node_modules/',
        'config/',
        'config/locales/',
        'config/initializers/',
        'config/environments/'
    ].forEach(function (dir) {
            self.createDirectory(dir);
        });
};

/**
 * Copy files from templates directory
 */
AppGenerator.prototype.copyFiles = function () {
    var self = this;
    var templateVariables = {
        'ENGINE': this.getEngine(),
        'STYLE': this.getCSSEngineExtension(),
        'CODE': this.getCodeExtension(),
        'TPL': this.getTemplateExtension(),
        'DATA': this.getDataExtension(),
        'VIEWENGINE': this.getTemplateEngine(),
        'CSSENGINE': this.getCSSEngine(),
        'APPNAME': this.getAppName(),
        'SECRET': this.generateSecret(),
        'DBDRIVER': this.getDatabaseDriver(),
        'SUFFIX': this.isEvalAllowed() ? '_controller' : '',
        'EVAL': this.isEvalAllowed() ? '_eval' : '',
        'DBDEPENDENCY': this.getDatabaseDependency()
    };

    [
        'app/assets/coffeescripts/application.coffee',
        'app/assets/stylesheets/application.{{ STYLE }}',
        'app/tools/database.{{ CODE }}',
        'config/environment.{{ CODE }}',
        'config/config.json',
        'config/config.development.json',
        'config/config.production.json',
        'config/config.test.json',
        'config/components.json',
        'config/middleware.json',
        'config/middleware.development.json',
        'config/middleware.test.json',
        'config/extensions.json',
        'config/extensions.development.json',
        'config/routes.{{ CODE }}',
        'public/index.html',
        'public/stylesheets/bootstrap.css',
        'public/stylesheets/bootstrap-responsive.css',
        'public/images/glyphicons-halflings-white.png',
        'public/images/glyphicons-halflings.png',
        'public/images/compound.png',
        'public/javascripts/rails.js',
        'public/javascripts/bootstrap.js',
        'public/javascripts/application.js',
        'public/favicon.ico',
        'Procfile',
        'README.md',
        'package.json',
        'server.{{ CODE }}'
    ].forEach(function (file) {
            self.copyFile(file, templateVariables);
        });

    self.copyFile('gitignore-example', '.gitignore', {});

    self.copyFile('config/databases_{{ DBDRIVER }}.json', 'config/databases.json', templateVariables);
    self.copyTemplate('application_layout', 'app/views/layouts/application_layout.{{ TPL }}', templateVariables);
    self.copyController('application_controller{{ EVAL }}.{{ CODE }}', 'app/controllers/application{{ SUFFIX }}.{{ CODE }}', templateVariables);
};

/**
 * Helper methods for renaming / replacing template variables
 */

module.exports = AppGenerator;

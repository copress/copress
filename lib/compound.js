var fs = require('fs'),
    path = require('path'),
    events = require('events'),
    util = require('util'),
    existsSync = fs.existsSync || path.existsSync,
    exists = fs.exists || path.exists,
    bootable = require('bootable'),
    configup = require('configup'),

    Map = require('railway-routes').Map,
    ControllerBridge = require('./controller-bridge'),
    compoundUtils = require('./utils'),
    controllerExtensions = require('./controller-extensions'),
    helpers = require('./helpers'),
    isServerSide = typeof window === 'undefined',
    kontroller = require('kontroller'),
    i18n = require('./i18n'),
    utils = require('./utils');

module.exports = Compound;

/**
 * Global compound API singleton.
 * Available everywhere in project.
 *
 */
function Compound(app, root) {
    var compound = this;
    this.__initializer = new bootable.Initializer();
    this.__localeData = {};
    this.models = {};
    this.structure = {
        paths: {
            controllers: {},
            models: {},
            views: {},
            helpers: {},
            errors: {}
        },
        controllers: {},
        models: {},
        views: {},
        helpers: {},
        errors: {},
        register: function () {
        }
    };
    this.locales = [];
    this.utils = compoundUtils;
    this.controllerExtensions = controllerExtensions;
    this.helpers = helpers;
    this.parent = null;
    this.root = root || process.cwd();
    this.errors = this.structure.errors;
    this.elements = [];

    if (app) {
        app.on('mount', function (parent) {
            if (parent.compound) {
                compound.parent = parent.compound;
            } else if (parent.parent && parent.parent.compound) {
                compound.parent = parent.parent.compound;
            }
            if (compound.parent) {
                compound.parent.elements.push(compound);
            }
        });

        app.compound = compound;
        app.models = compound.models;
        app.root = root;
        compound.app = app;
    }

    this.controller = kontroller.BaseController;

    this.i18n = i18n;

    this.controllerBridge = new ControllerBridge(this);
    this.bridge = this.controllerBridge.uniCaller.bind(this.controllerBridge);
    this.map = new Map(app, this.bridge);

    if (this.constructor.name === 'CompoundClient') {
        return;
    }

    if (!this._setup) {
        this._setup = true;
        this.setup(root);
    }
}

util.inherits(Compound, events.EventEmitter);

/**
 * Setup compound initialization phases:
 *
 *  - start http server
 *  - run configurators (config/environment, config/environments/{env})
 *  - add routes
 *  - init extensions (including ORM and db/schema)
 *  - init assets compiler
 *  - init models
 *  - run initializers `config/initializers/*`
 *  - locales
 *  - observers
 *  - assets
 *
 * @param {Object} root - `root` path.
 * @return {Compound} compound - compound app descriptor.
 */
Compound.prototype.setup = function (root) {
    var compound = this;

    root = root || compound.root;

    compound.phase(function configure() {
        // run environment.{js|coffee}
        // and environments/{test|development|production}.{js|coffee}
        compound.emit('configure');
        if (isServerSide && compound.app) {
            compound.configure(root);
        }
        compound.emit('after configure');
    });

    compound.phase(require('bootable-middleware')('config'));
    compound.phase(require('bootable-components')('config'));
    compound.phase(require('./boot/extensions')('config'));

    compound.phase(function routes() {
        compound.emit('routes', compound.map, compound);
        if (isServerSide) {
            var routesFile = root + '/config/routes', routesFileName;
            if (existsSync(routesFile + '.js')) {
                routesFileName = routesFile + '.js';
            } else if (existsSync(routesFile + '.coffee')) {
                routesFileName = routesFile + '.coffee';
            }
            if (routesFileName) {
                compound.map.addRoutes(routesFileName, compound.bridge, compound);
            }
        }
        compound.emit('after routes', compound.map, compound);
    });

    compound.phase(function structure() {

        if ('function' === typeof compound.loadStructure) {
            compound.loadStructure(root);
        }
        compound.emit('structure', compound.structure, compound);
    });

    //compound.phase(function () {
    //    // init models in app/models/*
    //    require('./models')(compound, root);
    //    compound.emit('models', compound.models, compound);
    //});

    compound.phase(function initializers(done) {
        // run config/initializers/*
        if (isServerSide && compound.app) {
            compound.runInitializers(root, done);
        }
        compound.emit('initializers', compound);
    });

    compound.phase(function i18n() {
        compound.i18n(compound, root);
    });

    return compound;
};

/**
 * Register a boot phase.
 *
 * When an application boots, it proceeds through a series of phases, ultimately
 * resulting in a listening server ready to handle requests.
 *
 * A phase can be either synchronous or asynchronous.  Synchronous phases have
 * following function signature
 *
 *     function myPhase() {
 *       // perform initialization
 *     }
 *
 * Asynchronous phases have the following function signature.
 *
 *     function myAsyncPhase(done) {
 *       // perform initialization
 *       done();  // or done(err);
 *     }
 *
 * @param {Function} fn
 * @api public
 */
Compound.prototype.phase = function (fn) {
    this.__initializer.phase(fn);
    return this;
};


/**
 * Boot `Compound` application.
 *
 * Compound builds on Express, providing a set of conventions for how to
 * organize code and resources on the file system as well as an MVC architecture
 * for structuring code.
 *
 * When booting a Compound application, the file system conventions are used
 * to initialize modules, configure the environment, register controllers, and
 * draw routes.  When complete, `callback` is invoked with an initialized
 * `express` instance that can listen for requests or be mounted in a larger
 * application.
 *
 * @param {Object|String|Function} [env]
 * @param {Function} [cb]
 * @api public
 */
Compound.prototype.boot = function (env, cb) {
    if (typeof env == 'function') {
        cb = env;
        env = undefined;
    }

    if (this.booting) {
        return cb && this.once('ready', cb, this.error, this);
    } else if (this.booted) {
        return cb && cb(this.error, this);
    }

    this.booting = true;

    var that = this;
    this.__initializer.run(function (err) {
        that.error = err;
        if (err) {
            if (cb) return cb(err, that);
            throw err;
        }
        that.booting = false;
        that.booted = true;
        that.emit('ready', that);
        if (cb) cb(null, that);
    }, this);
};


Compound.prototype.model = function (model, caseSensitive) {
    if (typeof model === 'function') {
        var name = model.modelName || model.name;
        if (!name) {
            throw new Error('Named function or jugglingdb model required');
        }
        this.models[name] = model;
        return model;
    }
    if (!caseSensitive) {
        model = model.toLowerCase();
    }
    var foundModel;
    for (var i in this.models) {
        if (model === i || !caseSensitive && model === i.toLowerCase()) {
            foundModel = this.models[i];
        }
    }
    return foundModel;
};

Compound.prototype.loadConfigs = function loadConfigs(dir) {
    var compound = this, app = compound.app;
    if (!app) {
        return;
    }
    fs.readdirSync(dir).forEach(function (file) {
        if (file[0] === '.' || file.match(/^(Roco|environment|routes|autoload)\.(js|coffee|json|yml|yaml)$/)) {
            return;
        }
        var filename = path.join(dir, file);
        var basename = path.basename(filename, path.extname(filename));
        var stats = fs.statSync(filename);
        if (stats.isFile()) {
            var conf = require(filename);
            if ('function' === typeof conf) {
                conf(compound);
            } else {
                app.set(basename, conf[app.get('env')]);
            }
        }
    });
};

Compound.prototype.loadConfig = function loadConfig(/* dir, ..., override */) {
    var app = this.app;
    var args = Array.prototype.slice.apply(arguments);
    var override = typeof args[args.length - 1] === 'boolean' ? args.pop() : false;
    var filename = path.resolve.apply(path, args);
    var config = configup.loadDeepMerge(filename, app.get('env'));

    for (var key in config) {
        if (config.hasOwnProperty(key)) {
            var cur = app.get(key);
            if (override || cur === undefined || cur === null) {
                app.set(key, config[key]);
            }
        }
    }
};

/**
 * Run app configurators in `config/environment` and `config/environments/env`.
 * @param {Compound} root - `root` path.
 */
Compound.prototype.configure = function configureApp(root) {
    var compound = this;
    var app = compound.app;
    root = root || compound.root;
    var mainEnv = root + '/config/environment';

    if (root === compound.root) {
        app.set('views', root + '/app/views');
    }
    if (!requireIfExists(compound, mainEnv + '.js')) {
        requireIfExists(compound, mainEnv + '.coffee');
    }

    var supportEnv = app.root + '/config/environments/' + app.settings.env;
    if (!requireIfExists(compound, supportEnv + '.js')) {
        requireIfExists(compound, supportEnv + '.coffee');
    }

};

/**
 * Require `module` if it exists
 *
 * @param {Compound} compound - express app.
 * @param {String} module - path to file.
 * @return {Boolean} success - returns true when required file exists.
 */
function requireIfExists(compound, module) {
    if (fs.existsSync(module)) {
        requireFun(module)(compound);
        return true;
    } else {
        return false;
    }
}

function requireFun(filename) {
    var mod, err;
    try {
        mod = require(filename);
    } catch (e) {
        err = e;
    }
    if (typeof mod !== 'function') {
        console.log('WARNING: ', filename,
            'should export function(compound) but given ' + typeof mod);
    }
    if (err) {
        throw err;
    }
    if (typeof mod === 'function') {
        return mod;
    } else {
        return function () {
        };
    }
}

/**
 * Run initializers in sandbox mode
 *
 * @param {String|Function} [root] - `root` path
 * @param {Function} [done] - the done callback function
 */
Compound.prototype.runInitializers = function runInitializers(root, done) {
    if (typeof root === 'function') {
        done = root;
        root = null;
    }
    var queue, pattern, compound = this, initializersPath = path.join(
        root || compound.root, 'config', 'initializers');
    done = done || function (err) {
            if (err) throw err;
        };

    pattern = compound.app.get('ignore initializers pattern') || /^\./;

    if (existsSync(initializersPath)) {
        queue = fs.readdirSync(initializersPath).map(function (file) {
            if (file.match(pattern)) return false;
            return requireFun(path.join(initializersPath, file));
        }).filter(Boolean);

        next();
    } else {
        done();
    }

    function next(err) {
        if (err) return done(err);
        var initializer = queue.shift();
        if (!initializer) return done();
        if (initializer.length === 2) {
            initializer.call(compound, compound, next);
        } else {
            initializer.call(compound, compound);
            next();
        }
    }
};

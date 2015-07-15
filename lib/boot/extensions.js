var debug = require('debug')('copress:boot:extensions');
var path = require('path');
var configup = require('configup');
var middist = require('middist');

/**
 *
 * @param dir the relative or absolute dir where is the extensions config file. default is `config`.
 * @returns {Function}
 */
module.exports = function (dir) {
    return function (done) {
        this.emit('extensions', this);
        var app = this.app;
        var rootDir = path.resolve(this.root || process.cwd(), dir || '');
        var config = loadExtensions(rootDir);
        var componentInstructions = buildExtensionInstructions(rootDir, config);
        if (componentInstructions.length > 0) {
            setupExtensions(app, componentInstructions, done);
        } else {
            done();
        }

        this.emit('extensions:after', this);
        this.emit('after extensions', this); // just compatible
    }
};


function loadExtensions(dir, env) {
    return configup.load(path.resolve(dir, 'extensions'), env, mergeExtensionConfig);
}

function mergeExtensionConfig(target, config, fileName) {
    for (var c in config) {
        if (c in target) {
            var err = configup.mergeObjects(target[c], config[c]);
            if (err) {
                throw new Error('Cannot apply ' + fileName + ' to `' + c + '`: ' + err);
            }
        } else {
            target[c] = config[c];
        }
    }
}

function buildExtensionInstructions(rootDir, config) {
    return Object.keys(config)
        .filter(function (name) {
            return !!config[name];
        })
        .map(function (name) {
            return {
                sourceFile: configup.resolveAppScriptPath(rootDir, name, {strict: true}),
                config: config[name]
            };
        });
}


var handle = middist.build(function (def, compound, next) {
    debug('Configuring extension %j', def.sourceFile);
    var ext = require(def.sourceFile);
    if (typeof ext.init !== 'function') return next();

    if (ext.init.length > 2) {
        ext.init.call(compound, compound, def.config, next);
    } else {
        ext.init.call(compound, compound, def.config);
        next();
    }
});

function setupExtensions(app, instructions, done) {
    handle(instructions, app.compound, done);
}

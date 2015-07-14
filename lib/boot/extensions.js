var debug = require('debug')('copress:boot:extensions');
var path = require('path');
var configup = require('configup');

/**
 *
 * @param dir the relative or absolute dir where is the extensions config file. default is `config`.
 * @returns {Function}
 */
module.exports = function (dir) {
    return function () {
        this.emit('extensions', this);
        var app = this.app;
        var rootDir = path.resolve(this.root || process.cwd(), dir || '');
        var config = loadExtensions(rootDir);
        var componentInstructions = buildExtensionInstructions(rootDir, config);
        if (componentInstructions.length > 0) {
            setupExtensions(app, componentInstructions);
        }
        this.emit('after extensions', this);
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

function setupExtensions(app, instructions) {
    instructions.forEach(function (data) {
        debug('Configuring extension %j', data.sourceFile);
        var ext = require(data.sourceFile);
        if (typeof ext.init == 'function') {
            ext.init(app.compound, data.config);
        }
    });
}

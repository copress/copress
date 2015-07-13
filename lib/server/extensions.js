var utils = require('../utils'),
    Module = require('module').Module,
    fs = require('fs'),
    cs = require('coffee-script'),
    path = require('path');

/**
 * Initialize extensions
 */
module.exports = function (done) {
    var root = this.root;

    var autoload = path.join(root, 'config', 'autoload');
    if (utils.existsSync(autoload + '.js') ||
        utils.existsSync(autoload + '.coffee')
    ) {
        var exts = require(autoload);
        init(exts(this), this);
    } else {
        done();
    }

    function init(exts, c) {
        var idx = 0;

        if (Array.isArray(exts)) {
            next();
        } else {
            done();
        }

        function next(err) {
            if (err) {
                return done(err);
            }

            var mod = exts[idx++];

            if (mod.init && typeof mod.init == 'function') {
                var arity = mod.init.length;
                if (arity >= 2) {
                    // Async initializer.  Exported function will be invoked, with next
                    // being called when the initializer finishes.
                    mod.init.call(c, c, next);
                } else {
                    // Sync initializer.  Exported function will be invoked, with next
                    // being called immediately.
                    mod.init.call(c, c);
                    next();
                }
            } else {
                // Initializer does not export a function.  Requiring the initializer
                // is sufficient to invoke it, next immediately.
                next();
            }
        }
    }
};

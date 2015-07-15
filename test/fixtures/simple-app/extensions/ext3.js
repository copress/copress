exports.init = function(c, options, next) {
    c.exts.push(3);
    next();
};
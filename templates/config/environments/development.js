var express = require('express');
var errorHandler = require('errorhandler');

module.exports = function (compound) {
    var app = compound.app;

    var env = process.env.NODE_ENV || 'development';
    if ('development' == env) {
        app.set('defaultLocale', 'en');
        app.enable('watch');
        app.enable('log actions');
        app.enable('env info');
        app.enable('force assets compilation');
        app.set('translationMissing', 'display');
        app.use(errorHandler({ dumpExceptions: true, showStack: true }));
    }
};

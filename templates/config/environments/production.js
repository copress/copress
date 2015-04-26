var express = require('express');
var errorHandler = require('errorhandler');

module.exports = function (compound) {
    var app = compound.app;

    var env = process.env.NODE_ENV || 'production';
    if ('production' == env) {
        app.set('defaultLocale', 'en');
        app.enable('quiet');
        //app.enable('merge javascripts');
        // app.enable('merge stylesheets');
        app.disable('assets timestamps');
        app.use(errorHandler());
    }
};

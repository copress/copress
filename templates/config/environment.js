module.exports = function (compound) {

    var methodOverride = require('method-override');
    var bodyParser = require('body-parser');
    var cookieParser = require('cookie-parser')
    var session = require('express-session');
    var multer = require('multer');
    var logger = require('morgan');
    var favicon = require('serve-favicon');
    var express = require('express');
    var app = compound.app;

    app.use(express.static(app.root + '/public', { maxAge: 86400000 }));
    app.set('jsDirectory', '/javascripts/');
    app.set('cssDirectory', '/stylesheets/');
    app.set('cssEngine', '{{ CSSENGINE }}');
    compound.loadConfigs(__dirname);
    app.use(favicon(app.root + '/public/favicon.ico'));
    app.use(logger('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser('secret'));
    app.use(session({ resave: true, saveUninitialized: true, secret: 'secret',cookie: { secure: true } }));
    app.use(methodOverride());
    app.use(multer());
};

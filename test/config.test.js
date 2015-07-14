var should = require('./init.js');

describe('compound.loadConfigs', function() {
    it('should load configs from given directory', function() {
        var app = getApp();
        var compound = app.compound;
        compound.loadConfigs(__dirname + '/fixtures/load-configs-app/config');
        should.exists(app.get('database'), 'load database config');
        app.get('database').driver.should.equal('memory');
        should.exists(app.get('foo'), 'load extra config');
        app.get('foo').should.equal('bar');
        should.not.exists(app.get('hello'));
    });

    it('should load config from a specific file', function() {
        var app = getApp();
        var compound = app.compound;
        compound.loadConfig(__dirname + '/fixtures/load-config-app/config/database');
        compound.loadConfig(__dirname + '/fixtures/load-config-app/config/extra-config');
        should.exists(app.get('db'), 'load database config');
        app.get('db').driver.should.equal('memory');
        should.exists(app.get('foo'), 'load extra config');
        app.get('foo').should.equal('Hello World');
        should.not.exists(app.get('hello'));
    });
});

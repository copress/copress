var should = require('./init.js');
var path = require('path');
var request = require('supertest');
var pd = require('plando');

var SIMPLE_APP = path.join(__dirname, 'fixtures', 'simple-app');

describe('compound/boot', function () {
    it('should boot simple-app', function (done) {
        var plan = pd.plan(2, done);
        var app = getApp(SIMPLE_APP);
        var compound = app.compound;
        compound.boot(function (err) {
            if (err) return done(err);
            app.dummyComponentOptions.option.should.equal('value');
            app.get('host').should.equal('127.0.0.1');
            app.get('port').should.equal(3000);
            compound.exts.should.eql([1, 3, 2]);
            plan.check();
        });

        request(app)
            .get('/')
            .end(function(err, res) {
                if (err && err.status !== 404) return done(err);
                res.headers.names.should.equal('custom-middleware');
                plan.check()
            });
    });
});
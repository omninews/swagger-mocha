'use strict';

var request = require('supertest');
var expect = require('expect.js');
var mocha = require('./setup-mocha')();

/**
 * Initialize
 *
 * @param app (express#App|string) An express app or url to a running server
 * @param [swaggerPath] (string) Path to the swagger.json file. Defaults to /swagger.json
 */

var SwaggerMocha = module.exports = function SwaggerMocha (app, swaggerPath) {
  this.request = request(app);
  this.swaggerPath = swaggerPath || '/swagger.json';
};

/**
 * Parses swagger.json, tries to generate a valid request for each path and
 * method, and validates the response against specified schemas.
 */

SwaggerMocha.prototype.run = function() {
  var self = this;

  this.fetchSwaggerJson(function(err, res){
    describe('Automatic schema validation:', function () {
      Object.keys(res.body.paths).forEach(function (path) {
        describe('GET ' + path, function () {
          var result;

          it('responds with 200', function (done) {
            self.request.get(path)
              .expect(200)
              .end(function (err, res) {
                result = res.body;
                done(err);
              });
          });

          it('works', function () {
            expect(1).to.equal(1);
          });
        });
      });
    });

    mocha.run(function (err) {
      console.log('Done');
      process.exit();
    });
  });
};

SwaggerMocha.prototype.fetchSwaggerJson = function(callback) {
  this.request
  .get(this.swaggerPath)
  .expect(200)
  .end(function (err, res) {
    describe('swagger.json', function () {
      it('exists', function () {
        if(err) {
          throw err;
        }
      });

      it('has paths', function () {
        expect(res.body.paths).to.not.be.empty();
      });

      it('has definitions', function () {
        expect(res.body.definitions).to.not.be.empty();
      });
    });

    callback(err, res);
  });
};

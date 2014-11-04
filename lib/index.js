'use strict';

var request = require('supertest');
//var expect = require('expect.js');
var mocha = require('./setup-mocha')();
var chai = require('chai');
var expect = chai.expect;
var async = require('async');

chai.use(require('chai-json-schema'));
chai.tv4.banUnknown = true;

var SwaggerMocha = module.exports = function SwaggerMocha (app, swaggerPath) {
  this.request = request(app);
  this.swaggerPath = swaggerPath || '/swagger.json';
};

SwaggerMocha.prototype.run = function() {
  var self = this;

  // Get swagger.json
  this.getSwaggerJson(function (err, swagger) {

    // Set definitions
    self.setDefinitions();
    //console.log(chai.tv4.getSchema('#/definitions/article'));

    // Get results for each path
      //## Invalid results?
    self.getResults(function (err, results) {
      // Test result for each path against the schema
      self.testResults();
      mocha.run(function () {
        process.exit();
      });
      // Generate mocha suites and tests, to get pretty logs
      // Run mocha
    });
  });
};

SwaggerMocha.prototype.getSwaggerJson = function(callback) {
  var self = this;

  this.request
  .get(this.swaggerPath)
  .expect(200)
  .end(function (err, res) {
    if(err) {
      err = new Error('Could not find swagger.json at ' + this.swaggerPath);
    }

    self.swagger = res.body;

    callback(err);
  });
};

SwaggerMocha.prototype.setDefinitions = function() {
  var definitions = this.swagger.definitions;

  Object.keys(definitions).forEach(function (name) {
    console.log('#/definitions/' + name);
    chai.tv4.addSchema('#/definitions/' + name, definitions[name]);
    console.log(chai.tv4.getSchema('#/definitions/' + name));
  });
};

SwaggerMocha.prototype.getResults = function(callback) {
  var self = this;
  var paths = this.swagger.paths;
  var testedPaths = Object.keys(paths).filter(function (path) {
    var spec = paths[path];
    //## For now only support GET and status 200
    return spec.get;
  });

  async.map(testedPaths, function (path, next) {
    var spec = paths[path];
    var status = 200;

    self.generateValidRequest(path, spec.get.responses[status])
    .expect(status)
    .end(function (err, res) {
      next(err, {
        path: path,
        status: status,
        method: 'get',
        result: res.body
      });
    });
  }, function (err, results) {
    self.results = results;
    callback(err);
  });
};

SwaggerMocha.prototype.generateValidRequest = function(path, spec) {
  return this.request.get(this.setPathParams(path, spec.parameters));
  //## Set query params and stuff too
};

SwaggerMocha.prototype.setPathParams = function(path, parameters) {
  var self = this;

  if(!parameters || !parameters.length) {
    return path;
  }

  parameters.forEach(function (param) {
    if(param.in === 'path') {
      path = path.replace(new RegExp('\{' + escapeRegExp(param.name) + '\}'), self.validParams[param.name]);
    }
  });

  return path;
};

SwaggerMocha.prototype.testResults = function() {
  var self = this;

  return this.results.map(function (test) {
    describe(test.method.toUpperCase() + ' ' + test.path, function () {
      it('matches the schema', function () {
        expect(test.result).to.be
        .jsonSchema(self.swagger.paths[test.path][test.method].responses[test.status].schema);
      });
    });
  });
};

/* Helpers
============================================================================= */

function escapeRegExp(string){
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}


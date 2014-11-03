'use strict';

var request = require('supertest');
var expect = require('expect.js');
var mocha = require('./setup-mocha')();
var FieldTest = require('./fieldtest');

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
        var spec = res.body.paths[path];
        self.spec = res.body;

        //## For now just support GET
        if(spec.get) {
          self.testGET(path, spec.get);
        }
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

SwaggerMocha.prototype.testGET = function(path, spec) {
  var self = this;
  var properties = self.getSchema(spec.responses[200].schema).properties;
  var propertyTests = [];

  path = self.setPathParams(path, spec.parameters);

  describe('GET ' + path, function () {
    it('responds with 200', function (done) {
      var request = self.request.get(path);

      //## setRequiredParams

      self.createValidRequest(request, spec.parameters)
        .end(function (err, res) {
          var result = res.body;
          if(Array.isArray(result)) {
            result = result[0];
          }

          propertyTests.forEach(function (test) {
            test.setResult(result[test.property]);
          });

          done(err);
        });
    });

    propertyTests = Object.keys(properties).map(function (property) {
      var schema = properties[property];
      var test = new FieldTest();

      test.setProperty(property);
      test.setSchema(schema);
      test.test();

      return test;
    });

    /*it('is valid', function () {
      self.testResponse(spec.responses[200].schema, result);
      expect(1).to.equal(1);
    });*/
  });
};

SwaggerMocha.prototype.createValidRequest = function(request, parameters) {
  request = request
    .expect(200);

  return request;
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

SwaggerMocha.prototype.testResponse = function(schema, result) {
  var self = this;
  var item;

  if(schema.type === 'array') {
    expect(result).to.be.an('array');

    result.forEach(function (item) {
      self.testItem(schema.items, item);
    });
  }
  else {
    expect(result).to.not.be.an('array');
    self.testItem(schema, result);
  }
};

SwaggerMocha.prototype.testItem = function(schema, item) {
  var self = this;

  if(isReference(schema)) {
    schema = this.getDefinition(schema);
  }

  Object.keys(schema.properties).forEach(function (property) {
    var field = schema.properties[property];

    if(schema.required.indexOf(property) > -1) {
      expect(item).to.have.property(property);

      switch(field.type) {
        case 'string':
          expect(item[property]).to.be.a('string');
          break;
        case 'array':
          expect(item[property]).to.be.a('array');
          break;
        case 'integer':
          expect(item[property]).to.be.a('number');
          //## Needs more precise test
          break;
        case 'number':
          expect(item[property]).to.be.a('number');
          break;
      }
    }
  });
};

SwaggerMocha.prototype.getSchema = function(schema) {
  if(isReference(schema)) {
    schema = this.getDefinition(schema);
  }
  if(schema.type === 'array' && isReference(schema.items)) {
    schema = this.getDefinition(schema.items);
  }

  return schema;
};

SwaggerMocha.prototype.getDefinition = function(schema) {
  return findByPath(this.spec, schema.$ref.replace(/^[\/#]+/, ''));
};

/* Helpers
============================================================================= */

function escapeRegExp(string){
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function isReference (schema) {
  return schema.$ref;
}

function findByPath (element, path, separator) {
  var next, _element;

  separator = separator !== undefined ? separator : '/';

  path = path.split(separator);
  _element = element;

  while(path.length && _element) {
    next = path.shift();
    _element = _element[next];
  }

  return _element;
};

'use strict';

var request = require('supertest');
var expect = require('expect.js');
var async = require('async');
var tv4 = require('tv4');
var mocha = require('./setup-mocha')();
var formats = require('./format-validators');

tv4.addFormat(formats);

var SwaggerMocha = module.exports = function SwaggerMocha (app, swaggerPath) {
  this.request = request(app);
  this.swaggerPath = swaggerPath || '/swagger.json';
  this.requestConcurrency = 100;
};

SwaggerMocha.run = function (callback) {
  mocha.run(callback);
}

SwaggerMocha.prototype.run = function(callback) {
  var self = this;

  async.series([
    this.getSwaggerJson.bind(this),
    this.setDefinitions.bind(this),
    this.getResults.bind(this),
    this.testResults.bind(this)
  ], function (err) {
    if(err) {
      throw err;
    }

    callback(err);
  });
};

SwaggerMocha.prototype.getSwaggerJson = function(callback) {
  var self = this;

  console.log('Fetching spec at ' + this.swaggerPath);

  this.request
  .get(this.swaggerPath)
  .expect(200)
  .end(function (err, res) {
    if(err) {
      err = new Error('Could not find swagger.json at ' + self.swaggerPath);
    }

    self.swagger = res.body;

    callback(err);
  });
};

SwaggerMocha.prototype.setDefinitions = function(callback) {
  var definitions = this.swagger.definitions;

  console.log('Parsing definitions');

  Object.keys(definitions).forEach(function (name) {
    tv4.addSchema('#/definitions/' + name, definitions[name]);
  });

  if(callback) {
    callback();
  }
};

SwaggerMocha.prototype.getResults = function(callback) {
  var self = this;
  var paths = this.swagger.paths;
  //## For now only support GET and status 200
  var status = 200;
  var method = 'get';

  var testedPaths = Object.keys(paths).filter(function (path) {
    return !paths[path]['x-test-ignore'] && paths[path].get;
  }).map(function (path) {
    return {
      requestUrl: self.fullPath(self.setPathParams(path, paths[path].get.parameters)),
      path: path,
      query: self.setQueryString(paths[path].get.parameters),
      status: status,
      method: method
    };
  }).concat(this.customRequests || []);

  console.log('Fetching results');

  async.mapLimit(testedPaths, self.requestConcurrency, function (data, next) {
    self.generateValidRequest(data, paths[data.path])
    .expect(data.status)
    .end(function (err, res) {
      if(err) {
        return next(new Error('Could not find ' + data.requestUrl + '. Reason: ' + err.message));
      }

      data.result = res.body;
      data.headers = res.headers;
      next(null, data);
    });
  }, function (err, results) {
    self.results = results;
    callback(err);
  });
};

SwaggerMocha.prototype.generateValidRequest = function(data, spec) {
  //## Set query params and stuff
  var request = this.request[data.method || 'get'](data.requestUrl);

  if(data.headers) {
    request.set(data.headers);
  }

  if(data.method !== 'get' && data.data) {
    request = request.send(data.data);
  }

  if(data.query) {
    request = request.query(data.query);
  }

  return request;
};

SwaggerMocha.prototype.fullPath = function(path) {
  return (this.swagger.basePath || '') + path;
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

SwaggerMocha.prototype.setQueryString = function (parameters) {
  var self = this;

  if(!parameters || !parameters.length) {
    return '';
  }

  return parameters.filter(function (param) {
    return param.in === 'query' && param.required;
  }).map(function (param) {
    return param.name + '=' + self.validParams[param.name];
  }).join('&');
};

SwaggerMocha.prototype.testResults = function(callback) {
  var self = this;

  console.log('Matching results against schemas');

  this.results.forEach(function (test) {
    var path = self.swagger.paths[test.path];
    var schema = path[test.method].responses[test.status].schema;
    var headerSchemas = path[test.method].responses[test.status].headers;

    describe(test.method.toUpperCase() + ' ' + test.requestUrl, function () {
      describe('response body', function () {
        self.testResult(test.result, schema, test.customTest, self.banUnknownProperties);
      });

      if(headerSchemas) {
        describe('response headers', function () {
          self.testResult(test.headers, {
            properties: keysToLowerCase(headerSchemas),
            required: getRequiredHeaders(headerSchemas)
          }, null, self.banUnknownHeaders);
        });
      }
    });
  });

  if(callback) {
    callback();
  }
};

SwaggerMocha.prototype.testResult = function(result, schema, customTest, banUnknownProperties) {
  var assertion = tv4.validateMultiple(result, schema || {}, false, banUnknownProperties);

  if(!assertion.valid) {
    assertion.errors.forEach(function (err) {
      it(err.dataPath, function () {
        throw err;
      });
    });
  }
  else if(!customTest) {
    it('looks alright!', function () {});
  }

  if(customTest) {
    customTest(result);
  }
};

/* Helpers
============================================================================= */

function escapeRegExp(string){
  return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}


function keysToLowerCase (obj) {
  var result = {};

  Object.keys(obj).forEach(function (key) {
    result[key.toLowerCase()] = obj[key];
  });

  return result;
}

function getRequiredHeaders (headerSchemas) {
  return Object.keys(headerSchemas || {}).filter(function (key) {
    return headerSchemas[key].required;
  }).map(String.prototype.toLowerCase.call.bind(String.prototype.toLowerCase));
}

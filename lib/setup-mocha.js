'use strict';

var Mocha = require('mocha');
var Suite = require('mocha/lib/suite');
var Test = require('mocha/lib/test');
var mocha;
var currentSuite;

/**
 * Custom setup to set up mocha programmatically but use it as normal
 */

module.exports = exports = function (options) {
  mocha = new Mocha(options);
  currentSuite = mocha.suite;

  return exports;
};

exports.run = function (callback) {
  mocha.run(callback);
};


global.describe = function describe (title, callback) {
  const suite = Suite.create(currentSuite, title);
  const originalSuite = currentSuite;
  currentSuite = suite;
  callback();
  currentSuite = originalSuite;
};

global.it = function it (title, callback) {
  currentSuite.addTest(new Test(title, callback));
};

global.before = function before (callback) {
  currentSuite.beforeAll(callback);
};

global.after = function after (callback) {
  currentSuite.afterAll(callback);
};

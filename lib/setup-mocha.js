'use strict';

var Mocha = require('mocha');
var Suite = Mocha.Suite;
var Test = Mocha.Test;
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
  currentSuite = Suite.create(currentSuite, title);
  callback();
  currentSuite = currentSuite.parent;
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

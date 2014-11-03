'use strict';

var expect = require('expect.js');

var FieldTest = module.exports = function FieldTest () {
  this.result = null;
};

FieldTest.prototype.setProperty = function(property) {
  this.property = property;
};

FieldTest.prototype.setSchema = function(schema) {
  this.schema = schema;
};

FieldTest.prototype.test = function() {
  var self = this;

  describe('property `' + this.property + '`', function () {
    if(self.schema.required) {
      it('is required and is set', function () {
        expect(self.result).to.be.ok();
      });

      it('has type ' + self.schema.type, function () {
        self.testType();
      });
    }
    else {
      it('has type ' + self.schema.type, function () {
        self.testNotRequiredType();
      });
    }

    if(self.schema.format) {
      it('has format ' + self.schema.format, function () {
        self.testFormat();
      });
    }
  });
};

FieldTest.prototype.setResult = function(result) {
  this.result = result;
};

FieldTest.prototype.testType = function() {
  switch(this.schema.type) {
    case 'string':
      expect(this.result).to.be.a('string');
      break;
    case 'array':
      expect(this.result).to.be.a('array');
      break;
    case 'integer':
      expect(this.result).to.be.a('number');
      //## Needs more precise test
      break;
    case 'number':
      expect(this.result).to.be.a('number');
      break;
  }
};

FieldTest.prototype.testNotRequiredType = function() {
  // Ugly way of accomplishing or operator
  try {
    switch(this.schema.type) {
      case 'string':
        expect(this.result).to.be.a('string');
        break;
      case 'array':
        expect(this.result).to.be.a('array');
        break;
      case 'integer':
        expect(this.result).to.be.a('number');
        //## Needs more precise test
        break;
      case 'number':
        expect(this.result).to.be.a('number');
        break;
    }
  }
  catch(e) {
    try {
      expect(this.result).to.not.be.ok();
    }
    catch(e2) {
      // Will only throw if the above did, which it shouldn't
      throw e;
    }
  }
};

FieldTest.prototype.testFormat = function() {

};

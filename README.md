# Swagger-mocha

Automatic validation of Swagger paths schemas and responses.
Using mocha for pretty error outputting.

Supports swagger 2.0 only. Should support any REST api, even not express, though
it's not confirmed.

## Usage

```js
var SwaggerTest = require('swagger-mocha');
var app = require('../path/to/something/that/exposes/an/express/app');
var swaggerJsonPath = '/swagger.json';

var swaggerTest = new SwaggerTest(app, swaggerJsonPath);

swaggerTest.customRequests = [
  {
    requestUrl: '/resource?test-with-query-parameter=1337',
    path: '/resource',
    method: 'get',
    status: 200,
    customTest: function (result) {
      it('should be leet', function () {
        expect(result).to.be('1337');
      });
    }
  }
];

swaggerTest.validParams = {
  resourceId: '1337'
};

swaggerTest.run();
```

## API

### `new SwaggerTest(app, swaggerPath)`

* `app`, either an express app or url to a running server (e.g. "http://localhost:3000")
* `swaggerPath`, the path to the swagger.json file. Default is /swagger.json

### `SwaggerTest#customRequests = [request]`

* `customRequests`, an array of additional requests to test
* `request`
  * `requestUrl`, the path (plus any query strings) to test
  * `path`, the name of the specs for the path in the swagger.json file
  * `method`, which method to use (e.g. "get" or "post")
  * `status`, which status to expect. Can be used to test error responses too
  * [`customTest`], additional testing of the result, other than the automatic schema validation (e.g. the number of items etc)

### `SwaggerTest#validParams = {}`

* `validParams`, a key-value map of valid values for path parameters. When
  encountering a path like /resource/{id}, a property with the same name is
  expected to be found in `validParams`. This implementation is admittedly a bit
  fragile.

### `SwaggerTest#run(callback)`

Prepare the tests.

### `SwaggerTest.run(callback)`

Run mocha.

## Todo

* Support other methods than GET. Unsure if it's wanted
* Tests

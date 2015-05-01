# spy-server [![Build status](https://travis-ci.org/underdogio/spy-server.png?branch=master)](https://travis-ci.org/underdogio/spy-server)

Test server that spies on requests and serves fixtured responses

This was built as a successor to [fixed-server][]. We had frustration with testing non-repeatable actions (e.g. saving, deleting) against live source (e.g. via [nine-track][]). While [nine-track][] partially covers this via series support, this aims to simplify the testing process and be a nice middleground.

[fixed-server]: https://github.com/uber/fixed-server
[nine-track]: https://github.com/twolfson/nine-track

## Getting Started
Install the module with: `npm install spy-server`

```js
// Load in our dependencies
var assert = require('assert');
var request = require('request');
var SpyServerFactory = require('spy-server');

// Generate our server and set up fixtures
var testServerFactory = new SpyServerFactory({port: 1337});
testServerFactory.addFixture('hello-world', {
  method: 'get',
  route: '/hello',
  response: function (req, res) {
    res.send('world');
  }
});

// Start our test
describe('A server receiving a hello request', function () {
  // Start a server on 1337 with our `hello-world` fixture
  var testServer = testServerFactory.run('hello-world');
  var body;
  before(function sendRequest (done) {
    // Send a request and save the response
    request('http://localhost:1337/hello?foo=bar', function (err, res, _body) {
      body = _body;
      done(err);
    });
  });

  // Make our normal assertion
  it('replies to the request', function () {
    assert.strictEqual(body, 'world');
  });

  // Make our spy server assertion
  it('received `foo` from our request', function () {
    var helloSpy = testServer.getFixtureSpy('hello-world');
    assert.deepEqual(helloSpy.callCount, 1);
    assert.deepEqual(helloSpy.lastRequest.query, {foo: 'bar'});
  });
});
```

### Inspecting POST body
In tests that run saving, we want to be able to see what POST data is being sent to our endpoint. In this example, we leverage a body parsing middleware to generate `req.body` and then inspect `req.body` via our spy.

```js
// Load in our dependencies
var assert = require('assert');
var bodyParser = require('body-parser');
var request = require('request');
var SpyServerFactory = require('spy-server');

// Generate our server and set up fixtures
var testServerFactory = new SpyServerFactory({port: 1337});
testServerFactory.addFixture('hello-world', {
  method: 'post',
  route: '/hello',
  // Use middleware chain to parse request information onto `req.body`
  response: [
    bodyParser.urlencoded({extended: true}),
    function sendHelloResponse (req, res) {
      res.send('world');
    }
  ]
});

// Start our test
describe('A server receiving a save request', function () {
  // Start a server on 1337 with our `hello-world` fixture
  var testServer = testServerFactory.run('hello-world');
  before(function sendRequest (done) {
    // Send a POST request to our server
    request({
      method: 'POST',
      url: 'http://localhost:1337/hello',
      form: {
        foo: 'bar'
      }
    }, done);
  });

  // Make our spy server assertion
  it('received `foo` in the `body` of our request', function () {
    var helloSpy = testServer.getFixtureSpy('hello-world');
    assert.deepEqual(helloSpy.callCount, 1);
    // We can access `req.body` due to using `bodyParser.urlencoded` on the request
    assert.deepEqual(helloSpy.lastRequest.body, {foo: 'bar'});
  });
});
```

## Documentation
We expose the `SpyServerFactory` constructor via our `module.exports`.

### new SpyServerFactory(options)
Constructor for creating a new `SpyServer`

All arguments are passed through to `FixedServerFactory`. Please see its documentation instead:

https://github.com/uber/fixed-server/tree/0.4.0#new-fixedserverfactoryoptions

#### Methods
All methods are inherited from `FixedServerFactory` (e.g. `addFixture`, `createServer`). Please see its documentation instead:

https://github.com/uber/fixed-server/tree/0.4.0#new-fixedserverfactoryoptions

- `factory.createServer` will create a `SpyServer` instead of a `FixedServer`

### new SpyServer(options)
Constructor for server that will host fixtures and spy on requests

All arguments are passed through to `FixedServer`. Please see its documentation instead:

https://github.com/uber/fixed-server/tree/0.4.0#fixedserveroptions

#### Methods
All methods are inherited from `FixedServer` (e.g. `listen`, `destroy`). Overridden/new methods are documented in other headings. See `FixedServer` documentation here:

https://github.com/uber/fixed-server/tree/0.4.0#fixedserveroptions

#### server.installFixture(name, fixture)
Install a fixture and set up a spy under our `name`

- name `String` - Key to use to refer to fixture and its spy
- fixture `Object` - Container for route parameters
    - method `String` - Lowercase HTTP method to run `params.response` under (e.g. `get`, `post`, `put`)
        - Any valid [`express` method][] is accepted
    - route `String|RegExp` - Route to run `fixture.response` under (e.g. `/hello`)
    - response `Function|Function[]` - `express` middleware or array of middlewares that will handle request and generate response
        - Function signature must be `(req, res)`/`(req, res, next)` as is expected in `express`

[`express` method]: http://expressjs.com/api.html#app.VERB

#### server.getFixtureSpy(name)
Retrieve spy for a given fixture

- name `String` - Key used when installing fixture via `installFixture`
    - This will be the same key as used with `factory.createServer`/`factory.run`

**Returns:**

- spy `Spy` - Spy installed for our fixture
    - `Spy` documentation can be [found below](#new-spy)

### new Spy()
Constructor for a spy

#### spy.callCount
Amount of times a spy has been invoked (e.g. `3` for 3 times requested)

Type: `Number`

#### spy.called
Boolean indicating that a spy has been invoked or not (e.g. `false` for 0 times requested, `true` for 1 time requested)

Type: `Boolean`

#### spy.firstRequest
First request received at fixture's endpoint. If no requests have been received, then this will be `null`

Type: `Request|null`

`spy.firstRequest` is an `http` request parsed via [express][]. It will have properties like: `req.headers`, `req.method`, `req.params`, `req.query`. More information can be found in the `node` and `express` documentation:

https://nodejs.org/api/http.html#http_http_incomingmessage

http://expressjs.com/3x/api.html#request

[express]: http://expressjs.com/

#### spy.lastRequest
Last request received at fixture's endpoint. If no requests have been received, then this will be `null`

Type: `Request|null`

`spy.lastRequest` is an `http` request parsed via [express][]. It will have properties like: `req.headers`, `req.method`, `req.params`, `req.query`. More information can be found in the `node` and `express` documentation:

https://nodejs.org/api/http.html#http_http_incomingmessage

http://expressjs.com/3x/api.html#request

#### spy.requests
Array of requests received at fixture's endpoint

Type: `Request[]`

Each `request` in `spy.requests` is an `http` request parsed via [express][]. They will have properties like: `req.headers`, `req.method`, `req.params`, `req.query`. More information can be found in the `node` and `express` documentation:

https://nodejs.org/api/http.html#http_http_incomingmessage

http://expressjs.com/3x/api.html#request

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint via `npm run lint` and test via `npm test`.

## License
Copyright (c) 2015 Underdog.io

Licensed under the MIT license.

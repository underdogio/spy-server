// Load in our dependencies
var assert = require('assert');
var request = require('request');
var SpyServerFactory = require('../');

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

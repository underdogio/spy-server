// Load in our dependencies
var assert = require('assert');
var bodyParser = require('body-parser');
var request = require('request');
var SpyServerFactory = require('../');

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
    // Send a request and save the response
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
    assert.deepEqual(helloSpy.lastRequest.body, {foo: 'bar'});
  });
});

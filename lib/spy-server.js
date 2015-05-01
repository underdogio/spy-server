// Load in our dependencies
var assert = require('assert');
var util = require('util');
var extend = require('obj-extend');
var FixedServerFactory = require('fixed-server');
var FixedServer = FixedServerFactory.FixedServer;

// Define a Spy class
function Spy() {
  // Define object-based defaults (to prevent reuse across instances)
  this.requests = [];
}
Spy.prototype = {
  // Define primitive defaults
  callCount: 0,
  called: false,
  firstRequest: null,
  lastRequest: null,
  requests: []
};

// Define our spy server
function SpyServer() {
  // Inherit from our FixedServer
  FixedServer.apply(this, arguments);

  // Create storage for spies
  this.spies = {};
}
util.inherits(SpyServer, FixedServer);

// Add spy retrieval methods
SpyServer.prototype.getFixtureSpy = function (key) {
  var spy = this.spies[key];
  assert(spy, '`spyServer.getFixtureSpy` could not find spy for fixture "' + key + '". ' +
    'Please verify the fixture was included in `SpyServer.createServer`/`SpyServer.run`.');
  return spy;
};

// Override fixture installation to add spying
SpyServer.prototype.installFixture = function (key, fixture) {
  // Generate a spy for our key
  var spy = this.spies[key] = new Spy();

  // Prepare the response or response chain for modification
  var responseArr = fixture.response;
  if (!Array.isArray(responseArr)) {
    responseArr = [fixture.response];
  } else {
    responseArr = responseArr.slice();
  }

  // When we receive a new request
  function handleNewRequest(req, res) {
    // Bump our callCount and mark the spy as called
    spy.callCount += 1;
    spy.called = true;

    // If this is the first request, save it
    if (spy.firstRequest === null) {
      spy.firstRequest = req;
    }

    // Save our request as the last request and to our chain
    spy.lastRequest = req;
    spy.requests.push(req);
  }
  responseArr.unshift(function trackRequest (req, res, next) {
    // Update our spy and continue to the normal functions
    handleNewRequest(req, res);
    next();
  });

  // Save our new response
  var spyFixture = extend({}, fixture, {
    response: responseArr
  });

  // Invoke our normal installation
  return FixedServer.prototype.installFixture.call(this, spyFixture);
};

// Define our factory constructor
function SpyServerFactory() {
  // Inherit from our factory
  FixedServerFactory.apply(this, arguments);
}
util.inherits(SpyServerFactory, FixedServerFactory);
// TODO: Update `fixed-server` to use a prototype defined constructor and pass through `key` to `installFixture`
SpyServerFactory.prototype.createServer = function (fixtureNames) {
  // Upcast fixtureNames to an array
  if (!fixtureNames) {
    fixtureNames = [];
  } else if (!Array.isArray(fixtureNames)) {
    fixtureNames = [fixtureNames];
  }

  // Install each fixture
  var server = new SpyServer(this.options);
  fixtureNames.forEach(function installServerFixture (fixtureName) {
    // Get and assert the fixture exists
    var fixture = this.fixtures[fixtureName];
    assert(fixture, 'FixedServer fixture "' + fixtureName + '" could not be found.');

    server.installFixture(fixtureName, fixture);
  }, this);

  // Return the server
  return server;
};

// Export our function
SpyServerFactory.SpyServer = SpyServer;
module.exports = SpyServerFactory;

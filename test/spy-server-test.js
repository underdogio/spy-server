// Load in dependencies
var bodyParser = require('body-parser');
var expect = require('chai').expect;
var httpUtils = require('request-mocha')(require('request'));
var SpyServerFactory = require('../');

// Define our server and fixtures
var testServerFactory = new SpyServerFactory({port: 1337});
testServerFactory.addFixture('hello-world', {
  method: 'get',
  route: '/hello',
  response: function (req, res) {
    res.send('world');
  }
});
testServerFactory.addFixture('goodbye-moon', {
  method: 'post',
  route: '/goodbye',
  response: [
    bodyParser.urlencoded({extended: true}),
    function handlePostRequest (req, res) {
      res.send('moon');
    }
  ]
});

// Start our tests
describe('A spy-server running a fixture', function () {
  var testServer = testServerFactory.run(['hello-world']);

  it('has a spy with a call count of 0', function () {
    var helloSpy = testServer.getFixtureSpy('hello-world');
    expect(helloSpy).to.have.property('callCount', 0);
  });
  it('has a spy that hasn\'t been called', function () {
    var helloSpy = testServer.getFixtureSpy('hello-world');
    expect(helloSpy).to.have.property('called', false);
  });
  it('has a spy that has no first request', function () {
    var helloSpy = testServer.getFixtureSpy('hello-world');
    expect(helloSpy).to.have.property('firstRequest', null);
  });
  it('has a spy that has no last request', function () {
    var helloSpy = testServer.getFixtureSpy('hello-world');
    expect(helloSpy).to.have.property('lastRequest', null);
  });
  it('has a spy that has no requests', function () {
    var helloSpy = testServer.getFixtureSpy('hello-world');
    expect(helloSpy.requests).to.deep.equal([]);
  });

  describe('replying to a request', function () {
    httpUtils.save('http://localhost:1337/hello?first=true');

    it('replies with the server\'s response', function () {
      expect(this.err).to.equal(null);
      expect(this.res.statusCode).to.equal(200);
      expect(this.body).to.equal('world');
    });
    it('has a spy with a call count of 1', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy).to.have.property('callCount', 1);
    });
    it('has a spy that has been called', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy).to.have.property('called', true);
    });
    it('has a spy that has a first request', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy.firstRequest).to.not.equal(null);
      expect(helloSpy.firstRequest.query).to.deep.equal({first: 'true'});
    });
    it('has a spy that has a last request', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy.lastRequest).to.not.equal(null);
      expect(helloSpy.lastRequest.query).to.deep.equal({first: 'true'});
    });
    it('has a spy that has 1 request', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy.requests).to.have.length(1);
      expect(helloSpy.requests[0].query).to.deep.equal({first: 'true'});
    });

    describe('replying to another request', function () {
      httpUtils.save('http://localhost:1337/hello?second=true');

      it('has a spy with a call count of 2', function () {
        var helloSpy = testServer.getFixtureSpy('hello-world');
        expect(helloSpy).to.have.property('callCount', 2);
      });
      it('has a spy that has been called', function () {
        var helloSpy = testServer.getFixtureSpy('hello-world');
        expect(helloSpy).to.have.property('called', true);
      });
      it('has a spy that has first request with our first query', function () {
        var helloSpy = testServer.getFixtureSpy('hello-world');
        expect(helloSpy.firstRequest).to.not.equal(null);
        expect(helloSpy.firstRequest.query).to.deep.equal({first: 'true'});
      });
      it('has a spy that has last request with our second query', function () {
        var helloSpy = testServer.getFixtureSpy('hello-world');
        expect(helloSpy.lastRequest).to.not.equal(null);
        expect(helloSpy.lastRequest.query).to.deep.equal({second: 'true'});
      });
      it('has a spy that has 2 requests with their appropriate queries', function () {
        var helloSpy = testServer.getFixtureSpy('hello-world');
        expect(helloSpy.requests).to.have.length(2);
        expect(helloSpy.requests[0].query).to.deep.equal({first: 'true'});
        expect(helloSpy.requests[1].query).to.deep.equal({second: 'true'});
      });
    });
  });
});

describe('A spy-server running a fixture with an array of middlewares', function () {
  var testServer = testServerFactory.run(['goodbye-moon']);
  httpUtils.save({
    method: 'POST',
    url: 'http://localhost:1337/goodbye',
    form: {
      middlewares: 'array'
    }
  });

  it('replies with the server\'s response', function () {
    expect(this.err).to.equal(null);
    expect(this.res.statusCode).to.equal(200);
    expect(this.body).to.equal('moon');
  });
  it('has a spy that looks at the request of those middlewares', function () {
    var goodbyeSpy = testServer.getFixtureSpy('goodbye-moon');
    expect(goodbyeSpy.callCount).to.equal(1);
    expect(goodbyeSpy.lastRequest.body).to.deep.equal({
      middlewares: 'array'
    });
  });
});

describe('A spy-server running multiple fixtures', function () {
  var testServer = testServerFactory.run(['hello-world', 'goodbye-moon']);

  describe('replying to a request at each fixture', function () {
    httpUtils.save('http://localhost:1337/hello?multiple=get');
    httpUtils.save({
      method: 'POST',
      url: 'http://localhost:1337/goodbye',
      form: {
        multiple: 'post'
      }
    });

    it('has spies with appropriate call counts for each fixture', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy).to.have.property('callCount', 1);

      var goodbyeSpy = testServer.getFixtureSpy('goodbye-moon');
      expect(goodbyeSpy).to.have.property('callCount', 1);
    });
    it('has spies that have been called for each fixture', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy).to.have.property('called', true);

      var goodbyeSpy = testServer.getFixtureSpy('goodbye-moon');
      expect(goodbyeSpy).to.have.property('called', true);
    });
    it('has spies that with a first request for each fixture', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy.firstRequest.query).to.deep.equal({multiple: 'get'});

      var goodbyeSpy = testServer.getFixtureSpy('goodbye-moon');
      expect(goodbyeSpy.firstRequest.body).to.deep.equal({multiple: 'post'});
    });
    it('has spies that with a last request for each fixture', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy.lastRequest.query).to.deep.equal({multiple: 'get'});

      var goodbyeSpy = testServer.getFixtureSpy('goodbye-moon');
      expect(goodbyeSpy.lastRequest.body).to.deep.equal({multiple: 'post'});
    });
    it('has spies that with 1 request for each fixture', function () {
      var helloSpy = testServer.getFixtureSpy('hello-world');
      expect(helloSpy.requests).to.have.length(1);
      expect(helloSpy.requests[0].query).to.deep.equal({multiple: 'get'});

      var goodbyeSpy = testServer.getFixtureSpy('goodbye-moon');
      expect(goodbyeSpy.requests).to.have.length(1);
      expect(goodbyeSpy.requests[0].body).to.deep.equal({multiple: 'post'});
    });
  });
});

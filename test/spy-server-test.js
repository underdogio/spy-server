// Load in dependencies
var assert = require('assert');
var spyServer = require('../');

// Start our tests
describe('spy-server', function () {
  it('returns awesome', function () {
    assert.strictEqual(spyServer(), 'awesome');
  });
});

import $ from 'jquery';
import _ from 'lodash';

// reads resourceUrl and sets model
// informs listeners about events by calling with parameter:
//  'read-begin' - when the http request is sent
//  'read-end' - when the result has been received and put into model
// returns an object havin the on(listener) method
var HttpConnector = function(modelSetter) {
  var listeners = [];

  function open(resourceUrl) {
    fireEvent('read-begin');
    $.get(resourceUrl).done(function(data) {
      modelSetter(data);
      fireEvent('read-end');
    });
  }

  function fireEvent(type) {
    _.each(listeners, function(listener) {
      listener(type);
    });
  }

  return {
    on: function(listener) {
      listeners.push(listener);
    },
    open: open
  };
};

module.exports = HttpConnector;

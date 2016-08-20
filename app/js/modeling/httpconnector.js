import $ from 'jquery';
import _ from 'lodash';

// reads resourceUrl and informs event listener with result or error message
// Event types and parameters are:
//  'read-begin' - when the http request is sent
//  'read-end', result, error - when the result has been received, result is null and error is a message, in case of error
// returns an object havin the on(listener) method
export function HttpConnector() {
  var listeners = [];

  function open(resourceUrl) {
    fireEvent('read-begin');
    $.get(resourceUrl).done(function(data) {
      fireEvent('read-end', data);
    }).error(function(error) {
      console.log('error', error);
      fireEvent('read-end', null, error);
    });
  }

  function fireEvent(type, data, error) {
    _.each(listeners, function(listener) {
      listener(type, data, error);
    });
  }

  return {
    on: function(listener) {
      listeners.push(listener);
    },
    open: open
  };
};

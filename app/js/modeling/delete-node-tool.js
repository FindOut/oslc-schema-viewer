import utils from './utils';

// node moving tool
module.exports = function() {
  var dispatch = d3.dispatch('delete');
  var button = null;
  function addDeleteButton(parent) {
    if (button) {
      removeDeleteButton();
    }
    button = d3.select(parent).append('g')
      .classed('delete-button', true);
    button.append('circle')
      .attr('r', 10);
    button.append('path')
      .attr('d', 'M-5 -5 L5 5 M5 -5 L-5 5')
  }
  function removeDeleteButton() {
    button && button.remove();
    button = null;
  }
  var tool = {
    onEnter: function(m) {
      console.log('enter',m.d);
      addDeleteButton(this);
    },
    onLeave: function(m) {
      console.log('leave',m.d);
      removeDeleteButton();
    },
    onOver: (m) => {
      return false;
    },
    onClick: (m) => {
      if (button && d3.event.sourceEvent.target === button.select('circle').node()) {
        // delete button clicked - tell client and tell Manipulator that click is taken
        dispatch.delete(m.startD);
        return true;
      }
    },
    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

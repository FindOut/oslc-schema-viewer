import * as utils from './utils';

import * as d3 from './d3';

// node moving tool
export function DeleteNodeTool() {
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
    onDragStart: function(m) {
      // if a drag is starting - remove button
      removeDeleteButton();
      return false;
    },
    onEnter: function(m) {
      if (!m.isDrag) {
        addDeleteButton(this);
      }
    },
    onLeave: function(m) {
      removeDeleteButton();
    },
    onOver: (m) => {
      if (m.isDrag) {
        removeDeleteButton();
      }
      return false;
    },
    onClick: (m) => {
      if (button && d3.event.sourceEvent.target === button.select('circle').node()) {
        // delete button clicked - tell client and tell Manipulator that click is taken
        dispatch.call('delete', null, m.startD);
        return true;
      }
    },
    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

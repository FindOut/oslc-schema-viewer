import * as utils from './utils';

import * as d3 from './d3';

// select node tool
// click node to select it and deselect all other nodes
// shift/cmd-click node to invert selection state
// click background to deselect all nodes
// all selection changes sends 'select' event to listeners
export function SelectTool() {
  var dispatch = d3.dispatch('select');
  function deselectAll() {
    var toDeselect = d3.selectAll('.selected');
    toDeselect.classed('selected', false);
  }
  var tool = {
    onMount: function() {
      d3.select('svg').on('mousedown', function() {
        if (d3.event.target.tagName === 'svg') {
          deselectAll();
          dispatch.call('select');
        }
      });
    },
    onClick: function(m) {
      var el = d3.select(this);
      if (d3.event.sourceEvent.shiftKey || d3.event.sourceEvent.metaKey || d3.event.sourceEvent.ctrlKey) {
        el.classed('selected', !el.classed('selected'));
        dispatch.call('select');
      } else {
        deselectAll();
        el.classed('selected', true);
        dispatch.call('select');
      }
      return true;
    },
    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

import utils from './utils';

// select node tool
// click node to select it and deselect all other nodes
// shift/cmd-click node to invert selection state
// click background to deselect all nodes
// all selection changes sends 'select' event to listeners
module.exports = function() {
  var dispatch = d3.dispatch('select');
  d3.select('svg').on('click', function() {
    if (d3.event.target.tagName === 'svg') {
      deselectAll();
      dispatch.select();
    }
  });
  function deselectAll() {
    var toDeselect = d3.selectAll('.selected');
    toDeselect.classed('selected', false);
  }
  var tool = {
    onClick: function(d) {
      console.log('selectTool onclick',this);
      var el = d3.select(this);
      if (d3.event.sourceEvent.shiftKey || d3.event.sourceEvent.metaKey || d3.event.sourceEvent.ctrlKey) {
        el.classed('selected', !el.classed('selected'));
        dispatch.select();
      } else {
        deselectAll();
        el.classed('selected', true);
        dispatch.select();
      }
      return true;
    },
    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

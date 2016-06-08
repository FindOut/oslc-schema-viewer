import utils from './utils';

// move duplicate of a dragged node
// duplicator is function(d) {create and render new node model object using element this end model d as a template and return new el}
// options let you require additional keys to be pressed - to require alt key but not shift key, use {altKey: true, shiftKey: false}
module.exports = function(duplicator, options) {
  options = options || {};
  var dispatch = d3.dispatch('move', 'end'),
    dupElSel;
  var validKeysMap = {shiftKey: true, altKey: true, ctrlKey: true, metaKey: true};
  function keysMatch(event) {
    var keys = Object.keys(options);
    for (var i in keys) {
      var key = keys[i];
      if (validKeysMap[key] && event[key] != options[key]) {
        return false;
      }
    }
    return true;
  }
  var tool = {
    onOver: (m) => {d3.event.target.style.cursor = "move"; return true;},
    onDragStart: function(m) {
      if (keysMatch(d3.event.sourceEvent)) {
        dupElSel = duplicator(m.startEl, m.d);
        dupElSel.classed('moving', true);
        return true;
      }
    },
    onDrag: function(m) {
      dupElSel.node().parentNode.appendChild(dupElSel.node());
      dispatch.move.call(dupElSel.node(), dupElSel.datum(), m.lastDist, m.dropParent);
    },
    onDragEnd: function(m) {
      dupElSel.classed('moving', false);
      dispatch.end.call(dupElSel.node(), dupElSel.datum(), m.dist, m.dropParent);
    },
    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

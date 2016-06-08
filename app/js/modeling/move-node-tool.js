import utils from './utils';

// node moving tool
module.exports = function() {
  var dispatch = d3.dispatch('move', 'end');
  var tool = {
    onOver: (m) => {d3.event.target.style.cursor = "move"; return true;},
    onDragStart: function(m) {
      this.parentNode.appendChild(this);
      d3.select(this).classed('moving', true);
      return true;
    },
    onDrag: function(m) {
      dispatch.move(m.d, m.lastDist, m.dropParent);
    },
    onDragEnd: function(m) {
      //TODO hur gör man om klienten vill fånga upp end istället? d3.event.x etc
      d3.select(this).classed('moving', false);
      dispatch.end(m.d, m.dist, m.dropParent);
    },
    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

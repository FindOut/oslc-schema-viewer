import d3 from 'd3';
import _ from 'lodash';
import utils from './utils';

// returns a function layout(node), that when called with a d3 g element, lines up its children g elements horisontally and sizes its rect around them
function hboxLayout() {
  var margin = 5, fill = false, positionSetter = utils.defaultPositionSetter;
  function layout(node) {
    var x = margin, maxHeight = 0;
    // get the direct children of node that have class node
    var gChildren = d3.selectAll(_.filter(node.node().childNodes, function(node) {return d3.select(node).classed('node')}));
    gChildren.each(function(d) {
      positionSetter(d3.select(this), {x: x, y: margin});
      var bBox = this.getBBox();
      x += bBox.width + margin;
      maxHeight = Math.max(maxHeight, bBox.height);
    });
    if (fill) {
      gChildren.each(function(d) {
        this.size(d3.select(this), {height: maxHeight});
      });
    }
    var preferredSize = node.node().preferredSize();
    node.node().size(node,
      {width: Math.max(preferredSize.width, x),
      height: Math.max(preferredSize.height, margin + maxHeight + margin)});
  }
  layout.positionSetter = function(ps) {
    if (!ps) {return positionSetter;}
    positionSetter = ps;
    return layout;
  };
  layout.margin = function(size) {
    if (!size) {return margin;}
    margin = size;
    return layout;
  };
  layout.fill = function(t) { // true sets all child height to max child height
    if (!t) {return fill}
    fill = t;
    return layout;
  };
  return layout;
}

module.exports = hboxLayout;

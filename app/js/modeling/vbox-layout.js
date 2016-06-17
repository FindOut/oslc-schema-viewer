import d3 from 'd3';
import _ from 'lodash';
import utils from './utils';

// returns a function layout(node), that when called with one d3 g element,
// lines up its children g elements vertically and sizes its rect around them
function vboxLayout() {
  var margin = 5, fill = false, positionSetter = utils.defaultPositionSetter;
  function layout(node) {
    var y = margin, maxWidth = 0;
    var text = node.select('text').node();
    if (text) {
      var bb = text.getBBox();
      y += bb.y + bb.height;
    }
    var gChildren = d3.selectAll(_.filter(node.node().childNodes, function(node) {return node.tagName == 'g'}));
    gChildren.each(function(d) {
      positionSetter(d3.select(this), {x: margin, y: y});
      var bBox = this.getBBox();
      y += bBox.height + margin;
      maxWidth = Math.max(maxWidth, bBox.width);
    });
    if (fill) {
      gChildren.each(function(d) {
        this.size(d3.select(this), {width: maxWidth});
      });
    }
    var preferredSize = node.node().preferredSize();
    node.node().size(node,
      {width: Math.max(preferredSize.width, margin + maxWidth + margin),
      height: Math.max(preferredSize.height, y)});
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
  layout.fill = function(t) { // true sets all child widths to max child width
    if (!t) {return fill;}
    fill = t;
    return layout;
  };
  return layout;
}

module.exports = vboxLayout;

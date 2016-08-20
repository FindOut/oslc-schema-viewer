import * as d3 from './d3';
import _ from 'lodash';
import * as utils from './utils';


export function XyLayout() {
  var margin = 5, fill = false;
  function layout(node) {
    var max = {x: 0, y: 0};
    var gChildren = utils.selectAllImmediateChildNodes(node);
    gChildren.each(function(d) {
      this.fomod.position(d3.select(this), {x: margin + d.x || 0, y: margin + d.y || 0});
      var bBox = this.getBBox();
      if (d.x || d.y) {
        max.x = Math.max(max.x, d.x + bBox.width);
        max.y = Math.max(max.y, d.y + bBox.height);
      }
    });
    var preferredSize = node.node().fomod.preferredSize(node);
    node.node().fomod.size(node,
      {width: Math.max(preferredSize.width, max.x) + 2 * margin,
      height: Math.max(preferredSize.height, max.y) + 2 * margin});
  }
  layout.childOffset = function() {
    return {x: margin, y: margin};
  };
  layout.margin = function(size) {
    if (size == undefined) {return margin;}
    margin = size;
    return layout;
  };
  layout.fill = function(t) { // true sets all child height to max child height
    if (t == undefined) {return fill;}
    fill = t;
    return layout;
  };
  return layout;
}

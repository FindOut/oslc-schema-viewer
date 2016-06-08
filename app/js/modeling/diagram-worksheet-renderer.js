import d3 from 'd3';
import _ from 'lodash';
import utils from './utils';
import hboxLayout from './hbox-layout';

// returns a function layout(node), that when called with a d3 g element, lines up its children g elements horisontally and sizes its rect around them
function xyLayout() {
  var margin = 5, fill = false, positionSetter = utils.defaultPositionSetter;
  function layout(node) {
    var max = {x: 0, y: 0};
    var gChildren = d3.selectAll(_.filter(node.node().childNodes, function(node) {return node.tagName == 'g'}));
    gChildren.each(function(d) {
      positionSetter(d3.select(this), {x: d.x || 0, y: d.y || 0});
      var bBox = this.getBBox();
      max.x = Math.max(max.x, d.x + bBox.width);
      max.y = Math.max(max.y, d.y + bBox.height);
    });
    var preferredSize = node.node().preferredSize();
    node.node().size(node,
      {width: Math.max(preferredSize.width, max.x),
      height: Math.max(preferredSize.height, max.y)});
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
    if (!t) {return fill;}
    fill = t;
    return layout;
  };
  return layout;
}

// Renders rectangular elements under parentElement corresponding to dataArray items.
// Assumes each data item has an id attribute.
// if there is a text attribute, it is displayed centered in the box
function DiagramWorksheetRenderer(nodeClass) {
  var layout = xyLayout();
  function render(parentElement, dataArray) {
    var defaultSize = {width: 500, height: 300};
    var nodes = parentElement.selectAll('.' + nodeClass)
      .data(dataArray, d => d.id);
    var nodesEnter = nodes.enter().append('g')
        .attr('class', nodeClass)
        .attr('id', d => nodeClass + '_' + d.id)
        .each(function(d) {
          this.size = utils.defaultSizeSetter;
          this.layout = layout;
          this.preferredSize = function() {return defaultSize};
        });
    nodesEnter.append('rect')
          .attr(defaultSize);
    nodesEnter.append('text');
    nodes.exit().remove();

    return nodes;
  }

  function layoutSetterGetter(newLayout) {
    if (!newLayout) {return layout}
    layout = newLayout;
    return renderer;
  }

  return {
    render: render,
    layout: layoutSetterGetter
  };
}

module.exports = DiagramWorksheetRenderer;

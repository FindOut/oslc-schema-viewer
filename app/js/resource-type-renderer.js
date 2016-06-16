import d3 from 'd3';
import _ from 'lodash';
import {utils, vboxLayout} from './modeling/index';

// Renders rectangular elements under parentElement corresponding to dataArray items.
// Assumes each data item has an id attribute.
// if there is a text attribute, it is displayed centered in the box
// nodeClass is used to type the rendered g elements
function ResourceTypeRenderer(nodeClass, propsPropsGetter, prefixes) {
  function render(parentElement, resourceTypeUris) {
    var defaultSize = {width: 50, height: 30};
    var nodes = parentElement.selectAll('.' + nodeClass)
      .data(resourceTypeUris, d => d);
    var nodesEnter = nodes.enter().append('g')
        .attr('class', 'node ' + nodeClass)
        .attr('id', d => 'node_' + d)
        .each(function(d) {
          this.size = function(node, size) {
            if (size) {
              // place line below text
              let title = node.select('.title');
              title.attr('y', 3);
              let titleBBox = title.node().getBBox();
              let props = node.select('.props');
              let propsBBox = props.node().getBBox();
              let rectBBox = node.select('rect').node().getBBox();
              let line = node.select('line');
              let titleBottom = titleBBox.y + titleBBox.height + 1;
              let textBottom = titleBottom + propsBBox.height;
              line.attr({x1: rectBBox.x, x2: rectBBox.x + size.width, y1: titleBottom, y2: titleBottom});
              props.attr('y', titleBottom + 1);
            }
            return utils.defaultSizeSetter(node, size);
          };
          this.layout = vboxLayout();
          this.preferredSize = function() {
            var titleBBox = d3.select(this).select('.title').node().getBBox();
            var propsBBox = d3.select(this).select('.props').node().getBBox();
            var width = Math.max(defaultSize.width, titleBBox.x + Math.max(titleBBox.width, propsBBox.width) + 10);
            var height = Math.max(defaultSize.height, propsBBox.y + titleBBox.height + propsBBox.height + 11);
            return {width: width, height: height};
          };
        });
    nodesEnter.append('rect')
      .attr(defaultSize)
      .attr('rx', 15)
      .attr('ry', 10);
    nodesEnter.append('line');
    nodesEnter.append('text')
      .attr('class', 'title');
    nodesEnter.append('text')
      .attr('class', 'props');
    nodes.exit().remove();

    // render title
    var nodeRows = nodes.select('.title').selectAll('tspan')
      .data(d => [d]);
    nodeRows.enter().append('tspan')
      .attr({x: '.5em', dy: '.9em'});
    nodeRows.text(d => prefixes.shrink(d));
    nodeRows.attr('fill', 'black');
    nodeRows.exit().remove();

    // render properties
    var nodeRows = nodes.select('.props').selectAll('tspan')
      .data(d => propsPropsGetter(d));
    nodeRows.enter().append('tspan')
      .attr('x', '.5em').attr('dy', '1.2em');
    nodeRows.text(d => d);
    nodeRows.attr('fill', 'black');
    nodeRows.exit().remove();

    return nodes;
  }

  return {render: render};
}

module.exports = ResourceTypeRenderer;

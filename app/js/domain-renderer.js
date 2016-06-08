import d3 from 'd3';
import _ from 'lodash';
import {utils, vboxLayout} from './modeling/index';

// Renders rectangular elements under parentElement corresponding to dataArray items.
// Assumes each data item has an id attribute.
// if there is a text attribute, it is displayed centered in the box
// nodeClass is used to type the rendered g elements
function DomainRenderer(nodeClass) {
  function render(parentElement, dataArray) {
    var defaultSize = {width: 50, height: 30};
    var nodes = parentElement.selectAll('.' + nodeClass)
      .data(dataArray, d => d);
    var nodesEnter = nodes.enter().append('g')
        .attr('class', "node " + nodeClass)
        .attr('id', d => 'node_' + d)
        .each(function(d) {
          this.size = function(node, size) {
            if (size) {
              let title = node.select('.title tspan');
              title
                .attr('x', (size.width - title.node().getBBox().width) / 2)
                .attr('y', 2);

            }
            return utils.defaultSizeSetter(node, size);
          };
          this.layout = vboxLayout();
          this.preferredSize = function() {
            var text = d3.select(this).select('text').node();
            var textBBox = text.getBBox();
            var width = Math.max(defaultSize.width, textBBox.x + textBBox.width + 2);
            var height = Math.max(defaultSize.height, textBBox.y + textBBox.height + 2);
            return {width: width, height: height};
          };
        });
    nodesEnter.append('rect')
          .attr(defaultSize);
    nodesEnter.append('text').attr('class', 'title');
    nodes.exit().remove();

    var nodeRows = nodes.select('text').selectAll('tspan')
      .data(d => [d]);
    nodeRows.enter().append('tspan')
      .attr('x', '.1em').attr('dy', '.9em');
    nodeRows.text(d => d);
    nodeRows.attr('fill', 'black');
    nodeRows.exit().remove();

    return nodes;
  }

  return {render: render};
}

module.exports = DomainRenderer;

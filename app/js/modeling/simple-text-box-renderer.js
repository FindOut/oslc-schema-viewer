import d3 from 'd3';
import _ from 'lodash';
import utils from './utils';
import hboxLayout from './hbox-layout';


// Renders rectangular elements under parentElement corresponding to dataArray items.
// Assumes each data item has an id attribute.
// if there is a text attribute, it is displayed centered in the box
function SimpleTextBoxRenderer(nodeClass) {
  function render(parentElement, dataArray) {
    var defaultSize = {width: 50, height: 30};
    var nodes = parentElement.selectAll('.' + nodeClass)
      .data(dataArray, d => d.id);
    var nodesEnter = nodes.enter().append('g')
        .attr('class', "node " + nodeClass)
        .attr('id', d => 'node_' + d.id)
        .each(function(d) {
          this.size = utils.defaultSizeSetter;
          this.layout = hboxLayout().fill(true).margin(10);
          this.preferredSize = function() {return defaultSize};
        });
    nodesEnter.append('rect')
          .attr(defaultSize);
    nodesEnter.append('text');
    nodes.exit().remove();

    var nodeRows = nodes.select('text').selectAll('tspan')
      .data(d => [d.text]);
    nodeRows.enter().append('tspan')
      .attr('x', '.1em').attr('dy', '.9em');
    nodeRows.text(d => d);
    nodeRows.attr('fill', 'black');
    nodeRows.exit().remove();

    return nodes;
  }

  return {render: render};
}

module.exports = SimpleTextBoxRenderer;

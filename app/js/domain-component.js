import * as d3 from './modeling/d3';
import _ from 'lodash';
import {utils, VBoxLayout} from './modeling/index.js';

// Renders rectangular elements under parentElement corresponding to dataArray items.
// Assumes each data item has an id attribute.
// if there is a text attribute, it is displayed centered in the box
// nodeClass is used to type the rendered g elements
export default function DomainComponent(nodeClass, domainNameInfoGetter) {
  var defaultSize = {width: 50, height: 30};
  function render(parentElement, dataArray) {
    var nodes = parentElement.selectAll('.' + nodeClass)
      .data(dataArray, d => d);

    nodes.exit().remove();

    var nodesEnter = nodes.enter().append('g')
        .attr('class', "node " + nodeClass)
        .attr('id', d => 'node_' + d)
        .each(function(d) {
          this.fomod = geometryFunctions;
        });
    nodesEnter.append('rect')
          .attr(defaultSize);
    nodesEnter.append('text').attr('class', 'title');
    nodesEnter.append('title').text(d=>domainNameInfoGetter(d).domain);

    let nodesUpdateEnter = nodesEnter.merge(nodes);

    var nodeRows = nodesUpdateEnter.select('text').selectAll('tspan')
      .data(d => [domainNameInfoGetter(d).name]);

    nodeRows.exit().remove();

    let nodeRowsEnter = nodeRows.enter().append('tspan')
      .attr('x', '.1em').attr('dy', '.9em');

    let nodeRowsUpdateEnter = nodeRowsEnter.merge(nodeRows);
    nodeRowsUpdateEnter.text(d => d);
    nodeRowsUpdateEnter.attr('fill', 'black');

    return nodesUpdateEnter;
  }

  let geometryFunctions = {
    position: utils.defaultPositionSetter,
    size: function(node, size) {
      if (size) {
        let title = node.select('.title tspan');
        title
        .attr('x', (size.width - title.node().getBBox().width) / 2)
        .attr('y', 2);
      }
      return utils.defaultSizeSetter(node, size);
    },
    layout: new VBoxLayout(),
    preferredSize: function(node) {
      var text = node.select('text').node();
      var textBBox = text.getBBox();
      var width = Math.max(defaultSize.width, textBBox.x + textBBox.width + 2);
      var height = Math.max(defaultSize.height, textBBox.y + textBBox.height + 2);
      return {width: width, height: height};
    },
    innerMargin: function(node) {
        var bBox = node.select('text').node().getBBox();
        return {
            top: bBox.y + bBox.height,
            right: 0,
            bottom: 0,
            left: 0
        };
    }
  };
  render.nodeClass = nodeClass;
  render.layout = function(newLayout) {
    if (!newLayout) {return geometryFunctions.layout}
    geometryFunctions.layout = newLayout;
    return render;
  };

  return render;
}

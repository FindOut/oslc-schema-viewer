import * as d3 from './d3';
import _ from 'lodash';
import * as utils from './utils';

import {VBoxLayout} from './vbox-layout';

// Renders rectangular elements under parentElement corresponding to dataArray items.
// Assumes each data item has an id attribute.
// if there is a text attribute, it is displayed centered in the box
export function SimpleTextBoxComponent(nodeClass, labelFunction) {
  let defaultSize = {
      width: 50,
      height: 30
  };

  function render(parentElement, dataArray) {
      // the following selectAll expression selects only immediate children
      var nodes = parentElement.selectAll('#' + parentElement.attr('id') + ' > .' + nodeClass)
          .data(dataArray, d => d.id);

      nodes.exit().remove();

      var nodesEnter = nodes.enter().append('g')
          .attr('class', "node " + nodeClass)
          .attr('id', d => 'node_' + d.id)
          .each(function(d) {
            this.fomod = geometryFunctions;
          });
      nodesEnter.append('rect')
          .attr('width', defaultSize.width)
          .attr('height', defaultSize.height);
      nodesEnter.append('text');

      let nodesUpdateEnter = nodesEnter.merge(nodes);

      var nodeRows = nodesUpdateEnter.select('text').selectAll('tspan')
          .data(labelFunction || function(d) {
              return [d.text];
          });

      nodeRows.exit().remove();

      let nodeRowsEnter = nodeRows.enter().append('tspan')
          .attr('x', '.1em').attr('dy', '.9em')
          .attr('fill', 'black');;
      let nodeRowsUpdateEnter = nodeRowsEnter.merge(nodeRows);
      nodeRowsUpdateEnter.text(d => d);

      return nodesUpdateEnter;
  }

  let geometryFunctions = {
    position: utils.defaultPositionSetter,
    size: utils.defaultSizeSetter,
    layout: new VBoxLayout().fill(true),
    preferredSize: function(node) {
        var bBox = node.select('text').node().getBBox();
        return {
            width: Math.max(defaultSize.width, bBox.x + bBox.width + bBox.x),
            height: Math.max(defaultSize.height, bBox.y + bBox.height)
        };
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
    if (!newLayout.length) {
      return geometryFunctions.layout;
    }
    geometryFunctions.layout = newLayout;
    return this;
  };

  return render;
}

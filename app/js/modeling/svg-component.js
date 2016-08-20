import * as d3 from './d3';
import _ from 'lodash';
import $ from 'jquery';
import * as utils from './utils';

import {HBoxLayout} from './hbox-layout';

export function SvgComponent(nodeClass) {
  let defaultSize = {
    width: 1000,
    height: 700
  };

  function render(parentElement, dataArray) {
    // console.log('SimpleTextBoxComponent(',parentElement,', ',dataArray,')');
    var nodes = parentElement.selectAll('svg')
      .data(dataArray || {
        id: 'svg-element-data'
      }, d => d.id);

    nodes.exit().remove();

    var nodesEnter = nodes.enter().append('svg')
      .attr('class', "node " + nodeClass)
      .attr('id', d => 'node_' + d.id)
      .each(function (d) {
        this.fomod = geometryFunctions;
      });

    return parentElement.selectAll('svg');
  }

  let geometryFunctions = {
    position: utils.defaultPositionSetter,
    size: function (node, size) {
      if (!size) {
        return {
          width: node.attr('width'),
          height: node.attr('height')
        };
      }
      if (size.width) {
        node.attr('width', size.width);
      }
      if (size.height) {
        node.attr('height', size.height);
      }
    },
    layout: new HBoxLayout().fill(false),
    preferredSize: function (node) {
      return {
        width: +$(window).innerWidth(),
        height: +$(window).innerHeight()
      }
    },
    innerMargin: function (node) {
      return {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      };
    }
  };

  render.nodeClass = nodeClass;
  render.layout = function (newLayout) {
    if (!newLayout) {
      return geometryFunctions.layout
    }
    geometryFunctions.layout = newLayout;
    return this;
  };

  return render;
}

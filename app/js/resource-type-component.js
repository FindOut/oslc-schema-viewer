import * as d3 from './modeling/d3';
import _ from 'lodash';
import {utils, VBoxLayout} from './modeling/index';

// Renders rectangular elements under parentElement corresponding to dataArray items.
// Assumes each data item has an id attribute.
// if there is a text attribute, it is displayed centered in the box
// nodeClass is used to type the rendered g elements
export default function ResourceTypeComponent(nodeClass, propsPropsGetter, prefixes, isDerived) {
  var defaultSize = {width: 50, height: 30};
  function render(parentElement, resourceTypeUris) {
    var nodes = parentElement.selectAll('.' + nodeClass)
      .data(resourceTypeUris, d => d);

    nodes.exit().remove();

    var nodesEnter = nodes.enter().append('g')
        .attr('class', 'node ' + nodeClass)
        .classed('derived', isDerived)
        .attr('id', d => 'node_' + d)
        .each(function(d) {
          this.fomod = {
            position: utils.defaultPositionSetter,
            size: function(node, size) {
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
                line.attr('x1', rectBBox.x)
                  .attr('x2', rectBBox.x + size.width)
                  .attr('y1', titleBottom)
                  .attr('y2', titleBottom);
                props.attr('y', titleBottom + 1);
              }
              return utils.defaultSizeSetter(node, size);
            },
            layout: new VBoxLayout(),
            preferredSize: function(node) {
              var titleBBox = node.select('.title').node().getBBox();
              var propsBBox = node.select('.props').node().getBBox();
              var width = Math.max(defaultSize.width, titleBBox.x + Math.max(titleBBox.width, propsBBox.width) + 10);
              var height = Math.max(defaultSize.height, propsBBox.y + titleBBox.height + propsBBox.height + 11);
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
        });
    nodesEnter.append('rect')
      .attr('width', defaultSize.width)
      .attr('height', defaultSize.height)
      .attr('rx', 15)
      .attr('ry', 10);
    nodesEnter.append('line');
    nodesEnter.append('text')
      .attr('class', 'title');
    nodesEnter.append('text')
      .attr('class', 'props');
    nodesEnter.append('title').text(d=>d);

    let nodesUpdateEnter = nodesEnter.merge(nodes);

    // render title
    var nodeRows = nodesUpdateEnter.select('.title').selectAll('tspan')
      .data(d => [d]);

    nodeRows.exit().remove();


    let nodeRowsEnter = nodeRows.enter().append('tspan')
      .attr('x', '.5em')
      .attr('dy', '.9em');

    let nodeRowsUpdateEnter = nodeRowsEnter.merge(nodeRows);

    nodeRowsUpdateEnter.text(d => prefixes.shrink(d).replace(/.*:/, ''));
    nodeRowsUpdateEnter.attr('fill', 'black');

    // render properties
    var nodeProps = nodesUpdateEnter.select('.props').selectAll('tspan')
      .data(d => propsPropsGetter(d));
    nodeProps.exit().remove();
    let nodePropsEnter = nodeProps.enter().append('tspan')
      .attr('x', '.5em').attr('dy', '1.2em');
    let nodePropsUpdateEnter = nodePropsEnter.merge(nodeProps);
    nodePropsUpdateEnter.text(d => d);
    nodePropsUpdateEnter.attr('fill', 'black');

    return nodesUpdateEnter;
  }

  render.nodeClass = nodeClass;

  return render;
}

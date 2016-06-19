import d3 from 'd3';
import _ from 'lodash';
import utils from './utils.js';

// layout the single relationNode, by placing its ends
function defaultRelationLayout(relationNode) {
  var svgSel = d3.select(utils.getParentSvgElement(relationNode.node()));
  svgSel.attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  var relation = relationNode.datum();
  var fromNodeId = 'node_' + relation.from;
  var toNodeId = 'node_' + relation.to;
  var fromNode = document.getElementById(fromNodeId);
  fromNode || console.log('RelationRenderer missing fromNode:', fromNodeId);
  var toNode = document.getElementById(toNodeId);
  toNode || console.log('RelationRenderer missing toNode:', toNodeId);
  var fromEl = d3.select(fromNode).select('rect');
  var toEl = d3.select(toNode).select('rect');
  if (fromEl.node() && toEl.node()) {
    var fromRectTopLeft = utils.getElementRelativePoint({x: 0, y: 0}, fromEl.node(), svgSel.select('g').node());
    var fromRect = {x: fromRectTopLeft.x, y: fromRectTopLeft.y, width: parseFloat(fromEl.attr('width')), height: parseFloat(fromEl.attr('height'))};
    var fromPoint = {x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2};

    if (fromNodeId !== toNodeId) {
      var toRectTopLeft = utils.getElementRelativePoint({x: 0, y: 0}, toEl.node(), svgSel.select('g').node());
      var toRect = {x: toRectTopLeft.x, y: toRectTopLeft.y, width: parseFloat(toEl.attr('width')), height: parseFloat(toEl.attr('height'))};
      var toPoint = {x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2};

      utils.adjustToRectEdge(fromPoint, toPoint, toRect);
      utils.adjustToRectEdge(toPoint, fromPoint, fromRect);

      relationNode.selectAll('path')
        .attr('d', `M ${fromPoint.x},${fromPoint.y} L${toPoint.x},${toPoint.y}`);
    } else {
      // self reference - draw a small loop from fromNode to itself
      let x = fromRect.x + fromRect.width, y = fromRect.y + fromRect.height / 2, w = 20, out = 10;
      let pathExpr = `M ${x},${y - w} L ${x + out},${y - w} A ${w},${w} 0 1,1 ${x + out},${y + w} L ${x},${y + w}`;
      console.log('pathExpr', pathExpr);
      relationNode.selectAll('path')
      // .attr('d', `M ${x},${y - w} L${x + 2 * w},${y - w} L${x + 2 * w},${y + w} L${x},${y + w}`);
      .attr('d', pathExpr);
    }
  }
}

// returns object with render function
// relationClass is the class for the created relation elements
// labelGetter is a function(d) that returns a string displayed on the line
function RelationRenderer(relationClass, labelGetter) {
  var layout = defaultRelationLayout;
  function render(parentEl, relations) {
    // define arrow-head marker
    var svgSel = d3.select(utils.getParentSvgElement(parentEl.node()));
    var defs = svgSel.selectAll('defs').data(['dummy']);
    defs.enter().append('defs').append('marker')
      .attr("id", 'markerArrowEnd')
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
        .attr("d", 'M0,-5 L10,0 L0,5')
        .attr('fill', 'black');

    var svgZeroPoint = svgSel.node().createSVGPoint();

    let getId = d => d.from.toString() + '-' + d.to.toString();

    var relation = svgSel.selectAll('.' + relationClass)
        .data(relations, getId);
    var relationEnter = relation.enter().append('g')
      .attr("class", relationClass)
      .each(function(d) {this.layout = layout});
    relationEnter.append("path")
      .attr('id', d => 'path_' + getId(d))
      .attr(
        {'class': relationClass + '-line',
        d: ''});
    relation.select('.' + relationClass + '-line')
        .attr({'marker-end': 'url(#markerArrowEnd)',
          'stroke': 'black',
          'fill': 'none'});
    relationEnter.append('path')
      .attr('class', relationClass + '-line-shadow');
    relation.select('.' + relationClass + '-line-shadow')
        .attr({'stroke': '#ffffff',
        'stroke-width': 10,
        'stroke-opacity': 0.01,
        'fill': 'none'});
    if (labelGetter) {
      relationEnter
        .append('text')
        // .attr("x", -10)
        .attr("dy", '-.1em')
        .attr('font-size', '70%')
        .append('textPath')
        .style("text-anchor","middle")
        .attr("startOffset", "50%")
        .attr('xlink:href', d => '#path_' + getId(d))
        .text(labelGetter);
    }
    relation.exit().remove();

    return relation;
  }

  var renderer = {
    render: render,
    layout: layoutSetterGetter};

  function layoutSetterGetter(newLayout) {
    if (!newLayout) {return layout}
    layout = newLayout;
    return renderer;
  }

  return renderer;
}

module.exports = RelationRenderer;

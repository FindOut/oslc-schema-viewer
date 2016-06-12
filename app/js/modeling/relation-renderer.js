import d3 from 'd3';
import _ from 'lodash';
import utils from './utils.js';

// layout the single relationNode, by placing its ends
function defaultRelationLayout(relationNode) {
  var svgSel = d3.select(utils.getParentSvgElement(relationNode.node()));

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
    var toRectTopLeft = utils.getElementRelativePoint({x: 0, y: 0}, toEl.node(), svgSel.select('g').node());

    var fromRect = {x: fromRectTopLeft.x, y: fromRectTopLeft.y, width: parseFloat(fromEl.attr('width')), height: parseFloat(fromEl.attr('height'))};
    var fromPoint = {x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2};

    var toRect = {x: toRectTopLeft.x, y: toRectTopLeft.y, width: parseFloat(toEl.attr('width')), height: parseFloat(toEl.attr('height'))};
    var toPoint = {x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2};

    utils.adjustToRectEdge(fromPoint, toPoint, toRect);
    utils.adjustToRectEdge(toPoint, fromPoint, fromRect);

    relationNode.selectAll('line')
      .attr('x1', fromPoint.x)
      .attr('y1', fromPoint.y)
      .attr('x2', toPoint.x)
      .attr('y2', toPoint.y);
  }
}

// returns object with render function
function RelationRenderer(relationClass) {
  var layout = defaultRelationLayout;
  // define arrow-head marker
  function render(parentEl, relations) {
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

    console.log('relations',svgSel.selectAll('.' + relationClass).size());
    var relation = svgSel.selectAll('.' + relationClass)
        .data(relations, d => d.from.toString() + '-' + d.to.toString());
    var relationEnter = relation.enter().append('g')
      .attr("class", relationClass)
      .each(function(d) {this.layout = layout});
    relationEnter.append('line')
        .attr('class', relationClass + '-line');
    relation.select('.' + relationClass + '-line')
        .attr('marker-end', 'url(#markerArrowEnd)')
        .attr('stroke', 'black');
    relationEnter.append('line')
      .attr('class', relationClass + '-line-shadow');
    relation.select('.' + relationClass + '-line-shadow')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 10)
        .attr('stroke-opacity', 0.01);
    relation.exit().remove();

    return relation;
  }

  var renderer = {render: render,
    layout: layoutSetterGetter};

  function layoutSetterGetter(newLayout) {
    if (!newLayout) {return layout}
    layout = newLayout;
    return renderer;
  }

  return renderer;
}

module.exports = RelationRenderer;

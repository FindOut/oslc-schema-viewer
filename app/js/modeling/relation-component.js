import * as d3 from './d3';
import _ from 'lodash';
import * as utils from './utils';

// returns object with render function
// relationClass is the class for the created relation elements
// labelGetter is a function(d) that returns a string array displayed on the line
export function RelationComponent(relationClass, labelGetter) {
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

    var relation = svgSel.selectAll('.' + relationClass)
        .data(relations, d => d.id);

    relation.exit().remove();

    var relationEnter = relation.enter().append('g')
      .attr('id', d => 'relation_' + d.id)
      .attr("class", 'relation ' + (relationClass === 'relation' ? '' : relationClass))
      .each(function(d) {
        this.fomod = geometryFunctions;
      });
    relationEnter.append("path")
      .attr('id', d => 'path_' + d.id)
      .attr('class', relationClass + '-line')
      .attr('marker-end', 'url(#markerArrowEnd)')
      .attr('stroke', 'black')
      .attr('fill', 'none')
      .attr('d', '');
    relationEnter.append('path')
        .attr('class', relationClass + '-line-shadow')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 10)
        .attr('stroke-opacity', 0.01)
        .attr('fill', 'none');
    relationEnter.append('text')
      .attr("dy", '-.2em')
      .attr('font-size', '70%')
      .attr('text-anchor', 'middle');

    let updateEnter = relationEnter.merge(relation);
    if (labelGetter) {
      updateEnter.select('text').each(function(relation) {
        let nodeRows = d3.select(this).selectAll('textPath')
          .data(labelGetter);

        nodeRows.exit().remove();

        let nodeRowsEnter = nodeRows.enter().append('textPath')
          .style("text-anchor","middle")
          .attr("startOffset", "50%")
          .attr('xlink:href', d => '#path_' + relation.id);
        let nodeRowsUpdateEnter = nodeRowsEnter.merge(nodeRows);
        nodeRowsUpdateEnter.text(d => d);
      })
    }

    return updateEnter;
  }

  render.nodeClass = relationClass;

  render.layout = function(newLayout) {
    if (!newLayout) {return geometryFunctions.layout}
    geometryFunctions.layout = newLayout;
    return renderer;
  };

  let geometryFunctions = {
    layout: new RelationLayout()
  };

  return render;
}

// layout the single relationNode, by placing its ends
function RelationLayout() {
  let selfRelLoopRadius = 20;  // loop radius
  let selfRelStraightOutDist = 10; // straight selfRelStraightOutDist before loop bend starts

  function getRelationGeometry(relationNode) {
    var svgSel = d3.select(relationNode.node().ownerSVGElement);
    svgSel.attr('xmlns:xlink', 'http://www.w3.org/1999/xlink')

    var relation = relationNode.datum();
    var fromNodeId = 'node_' + relation.from;
    var toNodeId = 'node_' + relation.to;
    var fromNode = document.getElementById(fromNodeId);
    fromNode || console.log('RelationComponent missing fromNode:', fromNodeId);
    var toNode = document.getElementById(toNodeId);
    toNode || console.log('RelationComponent missing toNode:', toNodeId);
    var fromEl = d3.select(fromNode).select('rect');
    var toEl = d3.select(toNode).select('rect');
    if (fromEl.node() && toEl.node()) {
      var relationParent = relationNode.node().parentNode;
      var fromRectTopLeft = utils.getElementRelativePoint({x: 0, y: 0}, fromEl.node(), relationParent);
      var fromRect = {x: fromRectTopLeft.x, y: fromRectTopLeft.y, width: parseFloat(fromEl.attr('width')), height: parseFloat(fromEl.attr('height'))};
      var fromPoint = {x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2};

      if (fromNodeId === toNodeId) {
        let x = fromRect.x + fromRect.width;
        let y = fromRect.y + fromRect.height / 2; // middle right of node rect
        let fromPoint = {x: x, y: y - selfRelLoopRadius};
        let toPoint = {x: x, y: y + selfRelLoopRadius};
        return {selfRel: true, fromRect, fromPoint, toPoint}
      } else {
        // line from edge of source to edge of target, directed from center to center
        var toRectTopLeft = utils.getElementRelativePoint({x: 0, y: 0}, toEl.node(), relationParent);
        var toRect = {x: toRectTopLeft.x, y: toRectTopLeft.y, width: parseFloat(toEl.attr('width')), height: parseFloat(toEl.attr('height'))};
        var toPoint = {x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2};

        if (fromPoint.x !== toPoint.x || fromPoint.y !== toPoint.y) {
          utils.adjustToRectEdge(fromPoint, toPoint, toRect);
          utils.adjustToRectEdge(toPoint, fromPoint, fromRect);
        }
        return {selfRel: false, fromRect, toRect, fromPoint, toPoint}
      }
      return null;
    }
  }

  function layout(relationNode) {
    let relGeom = getRelationGeometry(relationNode);
    if (relGeom) {
      if (relGeom.selfRel) {
        // self reference - draw a small loop from fromNode to itself
        let x = relGeom.fromRect.x + relGeom.fromRect.width;
        let y = relGeom.fromRect.y + relGeom.fromRect.height / 2; // middle right of node rect
        relationNode.selectAll('path')
          .attr('d', `M ${x},${y - selfRelLoopRadius} L ${x + selfRelStraightOutDist},${y - selfRelLoopRadius} A ${selfRelLoopRadius},${selfRelLoopRadius} 0 1,1 ${x + selfRelStraightOutDist},${y + selfRelLoopRadius} L ${x},${y + selfRelLoopRadius}`);
      } else {
        relationNode.selectAll('path')
          .attr('d', `M ${relGeom.fromPoint.x},${relGeom.fromPoint.y} L${relGeom.toPoint.x},${relGeom.toPoint.y}`);
      }
    }
  }

  layout.getRelationGeometry = getRelationGeometry;

  return layout;
}

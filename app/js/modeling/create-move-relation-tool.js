import * as utils from './utils';

import * as d3 from './d3';

// creation relation tool for Manipulator
// create a relation by dragging from edge of object (edge is dragEdgeWidth wide) to other object
export function CreateMoveRelationTool() {
  var dispatch = d3.dispatch('create', 'move'),
    dragEdgeWidth = 5,
    rubberbandLine,
    defaultValidator = (pos) => utils.classedElementAtPos('node', pos),
    sourceValidator = defaultValidator,
    targetValidator = defaultValidator,
    targetHighlighter = (el, highlight) => d3.select(el).classed('highlighted-target', highlight),
    highlightedTarget = null,
    moveEnd = null;

  function atEdge(target, pos) {  // true if pos is withing edgeWidth from edge of target boundary
    var box = target.getBBox();
    return pos.x - box.x < dragEdgeWidth || pos.y - box.y < dragEdgeWidth
      || pos.x - box.x > box.width - dragEdgeWidth || pos.y - box.y > box.height - dragEdgeWidth;
  }

  function addRubberbandLine(m, isEnd) {
    let [fromPoint, toPoint] = isEnd ? [m.pos, m.startPos] : [m.startPos, m.pos];
    rubberbandLine = d3.select('svg').append('line')
      .attr('stroke', 'black')
      .attr('marker-end', 'url(#markerArrowEnd)')
      .attr('x1', fromPoint.x)
      .attr('y1', fromPoint.y)
      .attr('x2', toPoint.x)
      .attr('y2', toPoint.y);
  }
  var tool =  {
    dragEdgeWidth: function(width) {if (!arguments) return dragEdgeWidth; dragEdgeWidth = width; return tool;},
    // the validators should be of the form (pos) => <true if pos is on a valid node>, pos is svg relative
    sourceValidator: function(validator) {if (!arguments) return sourceValidator; sourceValidator = validator; return tool;},
    targetValidator: function(validator) {if (!arguments) return targetValidator; targetValidator = validator; return tool;},
    // the highlighter should highlight the form (el, highlight) => highlight element el if highlight, unhighlight if !highlight
    targetHighlighter: function(highlighter) {if (!arguments) return targetHighlighter; targetHighlighter = highlighter; return tool;},

    onOver: (m) => {
      if (sourceValidator(m.pos)
          && atEdge(d3.event.target, utils.a2xy(d3.mouse(d3.event.target)))) {
        d3.event.target.style.cursor = "crosshair";
        return true;
      }
    },

    onDragStart: (m) => {
      if (d3.select(m.startEl).classed('node')) {
        // create new relation
        if (sourceValidator(m.startPos)
            && atEdge(m.startEl, utils.getElementRelativePoint(m.startPos, m.startEl.ownerSVGElement, m.startEl))) {
          addRubberbandLine(m);
          return true;
        }
      } else if (d3.select(m.startEl).classed('relation')) {
        // move existing relation end
        let relGeom = m.startEl.fomod.layout.getRelationGeometry(d3.select(m.startEl));
        if (relGeom) {
          let fromDist = utils.dist2(m.pos, relGeom.fromPoint);
          let toDist = utils.dist2(m.pos, relGeom.toPoint);
          if (fromDist < toDist) {
            moveEnd = "from";
            m.startPos = relGeom.toPoint;
          } else {
            moveEnd = "to";
            m.startPos = relGeom.fromPoint;
          }
          addRubberbandLine(m, moveEnd === 'from');
          return true;
        }
      }
    },

    onDrag: (m)=>{
      rubberbandLine.remove();  // remove temporarily to not interfere with valid target highlighting

      // indicate valid target visually
      highlightedTarget && targetHighlighter(highlightedTarget, false);
      if (moveEnd === 'from') {
        highlightedTarget = sourceValidator(m.pos);
      } else {
        highlightedTarget = targetValidator(m.pos);
      }
      highlightedTarget && targetHighlighter(highlightedTarget, true);

      addRubberbandLine(m, moveEnd === 'from');
    },

    onDragEnd: (m) => {
      if (highlightedTarget) {
        d3.select(highlightedTarget).classed('highlighted-target', false);
      }
      rubberbandLine.remove();
      var el = targetValidator(m.pos);
      if (el) {
        if (moveEnd) {
          dispatch.call('move', null, d3.select(m.startEl), d3.select(el), moveEnd === 'from');
        } else {
          dispatch.call('create', null, d3.select(m.startEl), d3.select(el));
        }
      }
    },

    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

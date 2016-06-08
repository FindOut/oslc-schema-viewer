import utils from './utils';

// creation relation tool for Manipulator
// create a relation by dragging from edge of object (edge is dragEdgeWidth wide) to other object
module.exports = function() {
  var dispatch = d3.dispatch('create'),
   dragEdgeWidth = 5,
   line,
   svgEl = d3.select('svg').node(),
   defaultValidator = (pos) => utils.classedElementAtPos('node', pos),
   sourceValidator = defaultValidator,
   targetValidator = defaultValidator,
   targetHighlighter = (el, highlight) => d3.select(el).classed('highlighted-target', highlight),
   highlightedTarget = null;

  function atEdge(target, pos) {  // true if pos is withing edgeWidth from edge of target boundary
    var box = target.getBBox();
    return pos.x - box.x < dragEdgeWidth || pos.y - box.y < dragEdgeWidth
      || pos.x - box.x > box.width - dragEdgeWidth || pos.y - box.y > box.height - dragEdgeWidth;
  }
  var tool =  {
    dragEdgeWidth: function(width) {if (!arguments) return dragEdgeWidth; dragEdgeWidth = width; return tool;},
    // the validators should be of the form (pos) => <true if pos is on a valid node>
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
      if (sourceValidator(m.startPos)
          && atEdge(d3.event.sourceEvent.target, utils.getElementRelativePoint(m.startPos, svgEl, m.startEl))) {
        line = d3.select('svg').append('line')
          .attr('stroke', 'black')
          .attr('x1', m.pos.x).attr('y1', m.pos.y)
          .attr('x2', m.pos.x).attr('y2', m.pos.y);
        return true;
      }
    },

    onDrag: (m)=>{
      // indicate valid target visually
      highlightedTarget && targetHighlighter(highlightedTarget, false);
      highlightedTarget = targetValidator(m.pos);
      highlightedTarget && targetHighlighter(highlightedTarget, true);

      line
        .attr('x2', m.pos.x)
        .attr('y2', m.pos.y)
        .attr('marker-end', 'url(#markerArrowEnd)');
    },

    onDragEnd: (m) => {
      if (highlightedTarget) {
        d3.select(highlightedTarget).classed('highlighted-target', false);
      }
      line.remove();
      var el = targetValidator(m.pos);
      if (el) {
        dispatch.create(m.d, d3.select(el).datum());
      }
    },
    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

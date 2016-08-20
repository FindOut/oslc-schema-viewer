import * as utils from './utils';
import * as d3 from './d3';

// node moving tool.
// If the moved node is selected, then all selected nodes are moved to the mouse arrow target object,
// otherwise, only the dragged node is moved.
// A ghost rectangle is used to indicate each moving node.
export function MoveNodeTool(options) {
  var
    dispatch = d3.dispatch('move', 'end'),
    dragEls, ghostRects, ghostBounds, grabOffset;

  function addGhostRect(boundsList) {
    ghostRects = d3.select('svg').selectAll('.ghost').data(boundsList).enter().append('rect')
      .attr('class', 'ghost')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('width', d => d.width)
      .attr('height', d => d.height);
  }

  var tool = {
    onOver: (m) => {d3.event.target.style.cursor = "move"; return true;},
    onDragStart: function(m) {
      if (!options || utils.keysMatch(d3.event.sourceEvent, options)) {
        dragEls = d3.select(m.startEl);
        if (d3.select(m.startEl).classed('selected')) {
          dragEls = d3.selectAll('.node.selected');
        }
        // put bounds of all selected els in ghostBounds array
        ghostBounds = [];
        dragEls.each(function(d) {
          let r = this.getBBox();
          var svgPos = utils.getElementRelativePoint(r, this, this.ownerSVGElement);
          grabOffset = {x: svgPos.x - m.startPos.x, y: svgPos.y - m.startPos.y};
          ghostBounds.push({x: svgPos.x, y: svgPos.y, width: r.width, height: r.height});
        });
        addGhostRect(ghostBounds);
        return true;
      }
    },
    onDrag: function(m) {
      ghostRects.remove();
      ghostBounds.forEach(function(ghostBounds) {
        ghostBounds.x += m.lastDist.x;
        ghostBounds.y += m.lastDist.y;
      }) ;
      var targetEl = utils.classedElementAtPosExcept('node', m.pos, m.startEl) || m.startEl.ownerSVGElement;
      var targetRelMousePos = utils.getElementRelativePoint(m.pos, m.startEl.ownerSVGElement, targetEl);
      dispatch.call('move', null, d3.select(m.startEl), d3.select(targetEl), targetRelMousePos);
      addGhostRect(ghostBounds);
    },
    onDragEnd: function(m) {
      ghostRects.remove();
      var targetEl = utils.classedElementAtPosExcept('node', m.pos, m.startEl) || m.startEl.ownerSVGElement;
      if (utils.isAnchestorOf(m.startEl, targetEl)) {
        // avoid creating circular nesting - set target to parent of dragged elements
        targetEl = m.startEl.parentElement;
      }
      let targetRelPosList = [];
      dragEls.each(function(d) {
        let r = this.getBBox();
        let childOffset = targetEl.fomod.layout.childOffset();
        r.x += m.dist.x - childOffset.x;
        r.y += m.dist.y - childOffset.y;
        targetRelPosList.push(utils.getElementRelativePoint(r, this, targetEl));
      });
      dispatch.call('end', null, dragEls, d3.select(targetEl), targetRelPosList);
    },
    on: (type, listener) => {dispatch.on(type, listener); return tool;}
  };
  return tool;
};

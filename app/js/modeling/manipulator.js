import * as utils from './utils';

import * as d3 from './d3';

// helper object that makes it simple to implement interactive manipulation commands
export function Manipulator() {
  var drag = d3.drag(),
    thresholdRadius = 3,
    tools = [],
    svgEl,
    ownerTool = null,
    dist2 = a => a.x * a.x + a.y * a.y;

  var m = function(selection) {
    // send a mount event to the tools
    _.forEach(tools, function(tool) {
      tool.onMount && tool.onMount(selection);
    })
    if (selection.empty()) {
      return;
    }
    svgEl = svgEl || selection.node().ownerSVGElement || selection.node();
    var overDecoration = null;
    selection.on('mouseenter', function(d) {
      m.d = d;
      _.eachRight(tools, tool => tool.onEnter && tool.onEnter.call(this, m));
    });
    selection.on('mouseleave', function(d) {
      m.d = d;
      _.eachRight(tools, tool => tool.onLeave && tool.onLeave.call(this, m));
    });
    selection.on('mousemove', function(d) {
      m.d = d;
      m.pos = utils.a2xy(d3.mouse(this.parentElement));
      _.find(tools, tool=>tool.onOver && tool.onOver.call(this, m));
    });
    return drag.call(selection, selection);
  }
  m.origin = f => {drag.origin(f); return m}; // set origin function (see d3)
  m.add = tool => {tools.push(tool); return m}; // add tool function
  m.thresholdRadius = // set the distance to drag in order to consider it a drag, and not a click
    r => {if (arguments.length) return thresholdRadius; thresholdRadius = r; return m};
  m.startEl = null; // svg element that got the mouse-down
  m.isDrag = false;
  drag.on('start', function(d) {
    if (!m.startEl) {
      m.d = d;
      m.startD = d;
      m.startPos = m.pos = m.prevPos = utils.a2xy(d3.mouse(svgEl));
      m.startEl = this;
      m.dist = {x: 0, y: 0};
    }
    d3.event.sourceEvent.stopPropagation();
  });
  drag.on('drag', function(d) {
    m.d = d;
    m.pos = utils.a2xy(d3.mouse(svgEl));
    m.dist = {x: m.pos.x - m.startPos.x, y: m.pos.y - m.startPos.y};
    if (dist2({x: m.startPos.x - m.pos.x, y: m.startPos.y - m.pos.y}) > thresholdRadius * thresholdRadius) {
      m.isDrag = true;
    }
    if (m.isDrag) {
      if (ownerTool) {
        m.lastDist = {x: m.pos.x - m.prevPos.x, y: m.pos.y - m.prevPos.y};
        m.prevPos = m.pos;
        ownerTool.onDrag && ownerTool.onDrag.call(this, m)
      } else {
        m.prevPos = m.startPos;
        ownerTool = _.find(tools, tool=>tool.onDragStart && tool.onDragStart.call(this, m))
      }
    }
  });
  drag.on('end', function(d) {
    m.d = d;
    if (ownerTool) {
      try {
        ownerTool.onDragEnd && ownerTool.onDragEnd.call(this, m);
      } finally {
        ownerTool = null;
        m.isDrag = false;
      }
    } else  {
      if (!m.isDrag) {
        _.find(tools, tool=>tool.onClick && tool.onClick.call(m.startEl, m));
      }
    }
    m.startEl = null;
  });
  return m;
};

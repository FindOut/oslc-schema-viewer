import utils from './utils';

// helper object that makes it simple to implement interactive manipulation commands
module.exports = function(nodeClass) {
  var drag = d3.behavior.drag(),
    thresholdRadius = 3,
    tools = [],
    svgEl,
    ownerTool = null,
    isDrag = false,
    dist2 = a => a.x * a.x + a.y * a.y;

  // returns the object under pos and under el
  function dropParent(el, pos) {
    // has to remove moving element temporarily, to find the element under
    var parent = el.parentNode;
    parent.removeChild(el);
    var dropParent = utils.classedElementAtPos(nodeClass, pos) || d3.select('svg').node();
    parent.appendChild(el);
    return dropParent;
  }

  var m = function(selection) {
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
      // console.log('mousemove', this, d, this.parentElement);
      m.d = d;
      m.pos = utils.a2xy(d3.mouse(this.parentElement));
      // console.log('m.pos', m.pos);
      _.find(tools, tool=>tool.onOver && tool.onOver.call(this, m));
    });
    return drag.call(selection, selection);
  }
  m.origin = f => {drag.origin(f); return m};
  m.add = tool => {tools.push(tool); return m};
  m.thresholdRadius = r => {if (arguments.length) return thresholdRadius; thresholdRadius = r; return m};
  m.startEl = null;
  drag.on('dragstart', function(d) {
    if (!m.startEl) {
      m.d = d;
      m.startD = d;
      m.startPos = m.pos = m.prevPos = utils.a2xy(d3.mouse(svgEl));
      m.startEl = this;
      m.dist = {x: 0, y: 0};
      console.log('dragstart',this);
    }
  });
  drag.on('drag', function(d) {
    console.log('drag',this);
    m.d = d;
    m.pos = utils.a2xy(d3.mouse(svgEl));
    m.dist = {x: m.pos.x - m.startPos.x, y: m.pos.y - m.startPos.y};
    m.lastDist = {x: m.pos.x - m.prevPos.x, y: m.pos.y - m.prevPos.y};
    m.prevPos = m.pos;
    m.dropParent = dropParent(this, m.pos);
    if (dist2({x: m.startPos.x - m.pos.x, y: m.startPos.y - m.pos.y}) > thresholdRadius * thresholdRadius) {
      isDrag = true;
    }
    if (isDrag) {
      if (ownerTool) {
        ownerTool.onDrag && ownerTool.onDrag.call(this, m)
      } else {
        ownerTool = _.find(tools, tool=>tool.onDragStart && tool.onDragStart.call(this, m))
      }
    }
  });
  drag.on('dragend', function(d) {
    console.log('dragend');
    m.d = d;
    if (ownerTool) {
      try {
        ownerTool.onDragEnd && ownerTool.onDragEnd.call(this, m);
      } finally {
        ownerTool = null;
        isDrag = false;
      }
    } else  {
      if (!isDrag) {
        _.find(tools, tool=>tool.onClick && tool.onClick.call(m.startEl, m));
      }
    }
    m.startEl = null;
  });
  return m;
};

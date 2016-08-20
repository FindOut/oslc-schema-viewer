import * as d3 from './d3';

// true if the modifier key in
export function keysMatch(event, options, validKeysMap = {shiftKey: true, altKey: true, ctrlKey: true, metaKey: true}) {
  var keys = Object.keys(options);
  for (var i in keys) {
    var key = keys[i];
    if (validKeysMap[key] && event[key] != options[key]) {
      return false;
    }
  }
  return true;
}

// True if parent is an anchestor of element
export function isAnchestorOf(parent, element) {
  while (element){
    if (element == parent) {
      return true;
    } else {
      element = element.parentElement;
    }
  }
  return false;
}

// the square of the distance between point a and b
export function dist2(a, b) {
  let dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function selectAllImmediateChildNodes(node, nodeClass) {
  let nc = nodeClass || 'node';
  return d3.selectAll(_.filter(node.node().childNodes, function(node) {return node.tagName == 'g' && d3.select(node).classed(nc)}));
}

// sets size of node to size
// node is d3 wrapped, size is {width: , height: }
export function defaultSizeSetter(node, size) {
  var rectNode = node.select('rect');
  if (!size) {
    return {width: +rectNode.attr('width'), height: +rectNode.attr('height') || 10};
  }
  if (size.width) {
    rectNode.attr('width', size.width);
  }
  if (size.height) {
    rectNode.attr('height', size.height);
  }
}

// get or set position of node to pos
// node is d3 wrapped, pos is {x: , y: }
export function defaultPositionSetter(node, pos) {
  if (!pos) {
    var tr = node.attr('transform');
    var p = this.getTranslation(pos);
    return p || {x: 0, y: 0};
  }
  node.attr("transform", "translate(" + pos.x + "," + pos.y + ")")
}

export function a2xy(a) {
  return {x: a[0], y: a[1]}
}

// returns el or the closest parent having a specified class
export function classedParent(clazz, el) {
  while (true) {
    if (!el || d3.select(el).classed(clazz)) {
      return el;
    }
    el = el.parentElement;
  }
}

// returns el or the closest parent having a specified class, excluding exceptEl
export function classedParentExcept(clazz, el, exceptEl) {
  while (true) {
    if (!el || (d3.select(el).classed(clazz) && el !== exceptEl)) {
      return el;
    }
    el = el.parentElement;
  }
}

// returns the element at pos, or the closest parent having the specified class
// pos is [x, y] in svg coord system
export function classedElementAtPos(clazz, pos) {
  return this.classedParent(clazz, this.elementAtPos(pos));
}

// returns the element at pos, or the closest parent having the specified class
// pos is [x, y] in svg coord system
export function classedElementAtPosExcept(clazz, pos, exceptEl) {
  return this.classedParentExcept(clazz, this.elementAtPos(pos), exceptEl);
}

// returns the element at pos, or the closest parent having the specified class
// pos is [x, y] in svg coord system
export function elementAtPos(pos) {
  var svgEl = d3.select('svg').node(),
  svgBounds = svgEl.getBoundingClientRect();
  return document.elementFromPoint(pos.x + svgBounds.left, pos.y + svgBounds.top);
}

// returns the svg element that is above el in the hierarchy, or null if none
export function getParentSvgElement(el) {
  if (!el || el.tagName === 'svg') {
    return el;
  } else {
    return this.getParentSvgElement(el.parentElement);
  }
}

// returns fromElCoord expressed in the fromEl coordinate system
// as a coordinate expressed in the toEl coordinate system
export function getElementRelativePoint(fromElCoord, fromEl, toEl) {
  if (fromEl == toEl) {
    return {x: fromElCoord.x, y: fromElCoord.y};
  }
  var svgEl = fromEl.ownerSVGElement || fromEl;
  if (svgEl.createSVGPoint) {
    var point = svgEl.createSVGPoint();
    point.x = fromElCoord.x;
    point.y = fromElCoord.y;
    if (fromEl != svgEl) {
      point = point.matrixTransform(fromEl.getCTM()); // fromEl -> global
    }
    if (toEl != svgEl) {
      point = point.matrixTransform(toEl.getCTM().inverse()); // global -> toEl
    }
    return {x: point.x, y: point.y};
  }
  var rect = el.getBoundingClientRect();
  return {x: gp[0] - rect.left - el.clientLeft, y: gp[0] - rect.top - el.clientTop};
}

// keeps a list of listeners and simplfy adding listeners and sending events to them
export function EventManager() {
  var listeners = {};

  // adds listener on a specified event
  function on(eventKey, listener) {
    var keyListeners = listeners[eventKey] || [];
    listeners[eventKey] = keyListeners;
    keyListeners.push(listener);
    return this;
  }
  // sends all listeners on a specified event a cal with the specified this value and any number of parameters
  function fire(eventKey, thisValue) {
    var keyListeners = listeners[eventKey];
    for (var i in keyListeners) {
      var listener = keyListeners[i];
      var args = Array.prototype.slice.call(arguments, 0);
      args.splice(1, 1);  // remove thisValue
      listener.apply(thisValue, args);
    }
    return this;
  }

  return {
    on: on,
    fire: fire
  };
}

// sets result .x and .y to the crossing point of two end-less lines defined by (x1,y1)-(x2,y2) and (x3,y3)-(x4,y4)
export function lineCrossing(result, x1, y1, x2, y2, x3, y3, x4, y4) {
  var px = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-((y1-y2)*(x3-x4)));
  var py = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-((y1-y2)*(x3-x4)));
  result.x = px;
  result.y = py;
}

// a line goes from (p.x,p.y) to (rp.x,rp.y) that is inside the rectangle (r.x, r.y, r.width, r.height)
// adjusts (rp.x,rp.y) along the line, to be at the edge of r
export function adjustToRectEdge(p, rp, r) {
  var x3, y3, x4, y4;
  var dx = rp.x - p.x;
  var dy = rp.y - p.y;
  var k = dx == 0 ? 1000000 : dy / dx;
  var rk = r.height / r.width;
  x3 = r.x;
  y3 = r.y;
  if (Math.abs(k) < Math.abs(rk)) {
    // line crosses left or right rect edge
    x4 = r.x;
    y4 = r.y + r.height;
    if (dx < 0) {
      // line crosses right edge
      x3 += r.width;
      x4 += r.width;
    }
  } else {
    // line crosses top or bottom rect edge
    x4 = r.x + r.width;
    y4 = r.y;
    if (dy < 0) {
      // line crosses bottom edge
      y3 += r.height;
      y4 += r.height;
    }
  }
  this.lineCrossing(rp, p.x, p.y, rp.x, rp.y, x3, y3, x4, y4);
}

let regexTranslate2Args = /translate\(([0-9.]+)[, ]+([0-9.]+)\)/;
let regexTranslate1Arg = /translate\(([0-9.]+)\)/;

// return (x, y) when tr="translate(x, y)"
// or (x, 0) when tr="translate(x)"
export function getTranslation(tr) {
  var tr = this.regexTranslate2Args.exec(tr);
  if (tr) {
    return {x: +tr[1], y: +tr[2]};
  }
  tr = this.regexTranslate1Arg.exec(transform);
  return tr && {x: +tr[1], y: 0};
}

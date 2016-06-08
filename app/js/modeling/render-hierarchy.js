import d3 from 'd3';
import _ from 'lodash';

// works like _.groupBy
function groupBy(a, f) {
  var m = new Map();
  _.forEach(a, function(d) {
    var fd = f(d);
    if (fd) {
      var mfd = m[fd];
      if (mfd) {
        mfd.push(d);
      } else {
        m[fd] = [d];
      }
    }
  });
  return m;
}

// Renders all objects under the d3 wrapped parentElement.
// getChildren(parentData) returns all data elements that are immediate children of parentData, or top level data items if parentData is falsy (undefined, null or false).
// getRenderer(dataObject) returns a renderer for dataObject
function renderHierarchy(parentElement, getChildren, getRenderer) {
  function renderChildren(parentEl, parent) {
    var dataByType = groupBy(getChildren(parent), getRenderer);
    _.forEach(dataByType, (typeData) => {
      var nodes = getRenderer(typeData[0])(parentEl, typeData);
      nodes.each(function(d) {
        renderChildren(d3.select(this), d);
        this.layout && this.layout(d3.select(this));
      });
    });
  }
  renderChildren(parentElement, undefined);
}

module.exports = renderHierarchy;

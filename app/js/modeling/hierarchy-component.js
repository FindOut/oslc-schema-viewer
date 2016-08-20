import * as d3 from './d3';
import _ from 'lodash';

export function HierarchyComponent(getChildren, getComponent) {
  var componentMapId = 'componentMapId_' + Math.random();

  // Map that preserves the original key values
  function GenMap() {
    var map = {},
      keyMap = {};  // used to be able to retrieve the key unchanged

    return {
      set: function(key, value) {
        map[key.nodeClass] = value;
        keyMap[key.nodeClass] = key;
      },

      get: function(key) {
        return map[key.nodeClass];
      },

      // calls f(value, key) for each key in map
      forEach: function(f) {
        _.forEach(map, function(v, k) {
          f(v, keyMap[k]);
        });
      },
      map: map
    }
  }

  // organizes dataItems by renderer returned by getComponent(dataItem)
  // and returns a Map of dataItem lists by renderer
  function groupBy(parentElement, dataItems, getComponent, allData, level) {
    // get the map calculated last time, for this element, so that
    // renderers with no data items left can remove their elements
    // map is stored under a random attribute name specific for this HierarchyComponent
    var componentDataMap = parentElement.node()[componentMapId];
    if (componentDataMap) {
      // clear data item lists of remembered renderers
      componentDataMap.forEach((typeData) => {
        typeData.length = 0;
      });
    } else if (dataItems && dataItems.length != 0) {
      // no remembered renderers - create a new map
      componentDataMap = new GenMap();
      // store map for next time
      parentElement.node()[componentMapId] = componentDataMap;
    }

    // for each data item, get renderer to use as map key, and
    // create a data item list for each renderer to use as map value
    _.forEach(dataItems, function(d) {
      var component = getComponent(d, allData, level);
      if (component) {
        var mfd = componentDataMap.get(component);
        if (mfd) {
          mfd.push(d);
        } else {
          componentDataMap.set(component, [d]);
        }
      }
    });
    return componentDataMap;
  }

  // Renders all objects under the d3 wrapped parentElement.
  // getChildren(parentData) returns all data elements that are immediate children of
  // parentData, or top level data items if parentData is falsy (undefined, null or false).
  // getComponent(dataObject) returns a renderer for dataObject
  function render(parentElement, allData) {
    function renderChildren(parentEl, parentData, level) {
      var dataByComponent = groupBy(parentEl, getChildren(parentData, allData, level), getComponent, allData, level);
      dataByComponent && dataByComponent.forEach((data, component) => {
        var nodes = component(parentEl, data);
        nodes.each(function(d) {
          renderChildren(d3.select(this), d, level + 1);
          this.fomod.layout && this.fomod.layout(d3.select(this));
        });
      });
    }
    renderChildren(parentElement, undefined, 0);
  }

  return render;
}

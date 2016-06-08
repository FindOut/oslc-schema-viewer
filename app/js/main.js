import d3 from 'd3';
import {
  SvgRenderer, DiagramWorksheetRenderer, RelationRenderer, hboxLayout, vboxLayout, renderHierarchy, Manipulator,
  DeleteNodeTool, MoveNodeTool, MoveDuplicateNodeTool, CreateRelationTool, SelectTool, utils
} from './modeling/index';
import {OSLCSchemaConnector, getOSLCSchemaChildren, getOSLCSchemaRenderer, getRdfType, renderHtml} from './oslc-schema-connector.js';

var renderAll;
if (false) {
  renderAll = renderHtml;
} else {
  var model;

  var svgRenderer = new SvgRenderer(model, d3.select('#graph'));
  var diagramWorksheetRenderer = new DiagramWorksheetRenderer('worksheet');
  var relationRenderer = new RelationRenderer('relation');

  // Returns a renderer for data object d, that creates, updates or removes elements.
  // The call renderer(parentElement, dataObjectArray) should return a d3 selection of elements - both new and existing.
  // parentElement is a d3 selection of one parent element, and
  // dataObjectArray is all data objects to be rendered by this renderer.
  function getRenderer(d) {
    return {
      'a': simpleTextBoxRenderer.render,
      'b': simpleTextBoxRenderer.render}[d.type];
  }

  function getRelationRenderer(d) {
    return {
      'relation': relationRenderer.render}[d.type];
  }

  // Returns children of parentData,
  // or top level objects if no parentData.
  function getHierChildren(parentData) {
    if (parentData) {
      return parentData.children
    } else {
      return model;
    }
  }

  // Returns all objects with parent attribute equal to id of parentData,
  // or all objects with no parent attribute if no parentData.
  function getFlatChildren(parentData) {
    if (parentData) {
      return _.filter(model, d => (d.parent == parentData.id));
    } else {
      return _.filter(model, d => !d.parent);
    }
  }

  renderAll = function renderModel() {
    diagramWorksheetRenderer.render(d3.select('#graph svg'), [{id: 'ws'}]);
    // renderHierarchy(d3.select('#graph svg .worksheet'), getFlatChildren, getRenderer);
    renderHierarchy(d3.select('#graph svg .worksheet'), getOSLCSchemaChildren, getOSLCSchemaRenderer);
    diagramWorksheetRenderer.layout()(d3.select('#graph svg .worksheet'));
    // renderHierarchy(d3.select('#graph svg .worksheet'), getFlatChildren, getRelationRenderer);

    d3.selectAll('.node').call(nodeManipulator);
    // d3.selectAll('svg .relation').call(relationManipulator);

    svgRenderer.adjustSize();
  }

  // var connector = new HttpConnector(d => {model = d});
  var connector = new OSLCSchemaConnector(d => {model = d});
  connector.on(function(eventType) {
    if (eventType === 'read-end') {
      renderAll();
    }
  });
  // connector.open('model-flat.json');
  let urlField = d3.select('#urlField').node();
  urlField.value = 'https://vservices.offis.de/rtp/simulink/v1.0/services/catalog/singleton';
  urlField.onchange = function() {connector.open(urlField.value);};
  connector.open(urlField.value);

  var selectTool = new SelectTool()
    .on('select', (el, deselectEls) => {
      console.log('selection event');
    });

  function deleteChildrenOf(id) {
    _.forEach(model, function (node) {
      if (node.id !== id && node.parent === id) {
        deleteChildrenOf(node.id);
      }
      deleteObject(node.id);
    });
  }

  function deleteObject(id) {
  //  deleteChildrenOf(id);
    _.remove(model, node => node.type === 'relation' && (node.from === id || node.to === id));

  console.log(model);
    _.remove(model, node => node.id === id);
  }

  var nodeManipulator = new Manipulator('node')
  //   .add(new MoveNodeTool()
  //     .on('move', (d, dist, droppedOnElement) => {
  //       // try changing 'move' to 'end' and move a node with the mouse
  //       d.x += dist.x;
  //       d.y += dist.y;
  //       renderAll();
  //     })
  //   )
    .add(selectTool)
    ;
}

// var connector = new HttpConnector(d => {model = d});
var connector = new OSLCSchemaConnector(d => {model = d});
connector.on(function(eventType) {
  if (eventType === 'read-end') {
    renderAll();
  }
});
// connector.open('model-flat.json');
let urlField = d3.select('#urlField').node();
urlField.value = 'https://vservices.offis.de/rtp/simulink/v1.0/services/catalog/singleton';
urlField.onchange = function() {connector.open(urlField.value);};
connector.open(urlField.value);

import d3 from 'd3';
import {
  SvgRenderer, DiagramWorksheetRenderer, RelationRenderer, hboxLayout, vboxLayout, renderHierarchy, Manipulator,
  DeleteNodeTool, MoveNodeTool, MoveDuplicateNodeTool, CreateRelationTool, SelectTool, utils
} from './modeling/index';
import {OSLCSchemaConnector, getOSLCSchemaChildren, getOSLCSchemaRenderer, getRdfType, renderHtml, getRelations} from './oslc-schema-connector.js';

// var connector = new HttpConnector(d => {model = d});
var connector = new OSLCSchemaConnector(d => {model = d});

// set up and listen to url field
let urlField = d3.select('#urlField').node();
urlField.value = 'https://vservices.offis.de/rtp/simulink/v1.0/services/catalog/singleton,https://vservices.offis.de/rtp/bugzilla/v1.0/services/catalog/singleton';
urlField.onchange = function() {connector.open(urlField.value);};

if (false) {
  connector.on(function(eventType) {
    if (eventType === 'read-end') {
      renderHtml();
    }
  });
} else {
  var model;

  var svgRenderer = new SvgRenderer(model, d3.select('#graph'));
  var diagramWorksheetRenderer = new DiagramWorksheetRenderer('worksheet').layout(hboxLayout());
  var relationRenderer = new RelationRenderer('relation');

  function getRelationRenderer(d) {
    return {'relation': relationRenderer.render}[d.type];
  }

  var renderModel = function() {
    diagramWorksheetRenderer.render(d3.select('#graph svg'), [{id: 'ws'}]);
    renderHierarchy(d3.select('#graph svg .worksheet'), getOSLCSchemaChildren, getOSLCSchemaRenderer);
    diagramWorksheetRenderer.layout()(d3.select('#graph svg .worksheet'));
    renderHierarchy(d3.select('#graph svg .worksheet'), getRelations, getRelationRenderer);

    d3.selectAll('.node').call(nodeManipulator);
    // d3.selectAll('svg .relation').call(relationManipulator);

    svgRenderer.adjustSize();
  }

  connector.on(function(eventType) {
    if (eventType === 'read-end') {
      renderModel();
    }
  });

  var nodeManipulator = new Manipulator('node')
    .add(new SelectTool()
      .on('select', (el, deselectEls) => {
        console.log('selection event');
      })
    );
}


connector.open(urlField.value);

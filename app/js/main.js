import * as d3 from './modeling/d3';
import {
  SvgComponent, HBoxLayout, VBoxLayout, HierarchyComponent, Manipulator,
  MoveNodeTool, CreateMoveRelationTool, SelectTool, utils
} from './modeling/index.js';
import {OSLCSchemaConnector, getOSLCSchemaChildren, getOSLCSchemaComponent, getRelations, getRelationComponent, getRdfType, renderHtml} from './oslc-schema-connector.js';

// var connector = new HttpConnector(d => {model = d});
let connector = new OSLCSchemaConnector();

// set up and listen to url field
let urlField = d3.select('#urlField').node();
urlField.value = 'https://vservices.offis.de/rtp/bugzilla/v1.0/services/catalog/singleton';
urlField.onchange = function() {connector.open(urlField.value);};

let svgComponent = new SvgComponent('top').layout(new HBoxLayout().margin(10));
let nodeHierarchyComponent = new HierarchyComponent(getOSLCSchemaChildren, getOSLCSchemaComponent);
let relationHierarchyComponent = new HierarchyComponent(getRelations, getRelationComponent);

function renderModel() {
  svgComponent(d3.select('#graph'), [{id: 'ws'}]);
  nodeHierarchyComponent(d3.select('#graph svg'));
  svgComponent.layout()(d3.select('#graph svg'));
  relationHierarchyComponent(d3.select('#graph svg'));

  d3.selectAll('.node').call(nodeManipulator);
}

connector.on(function(eventType) {
  if (eventType === 'read-end') {
    renderModel();
  }
});

var nodeManipulator = new Manipulator()
  .add(new SelectTool()
    .on('select', (el, deselectEls) => {
      console.log('selection event');
    })
  );

connector.open(urlField.value);

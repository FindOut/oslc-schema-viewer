var d3 = require('d3');
var _ = require('lodash');
var Promise = require('promise');
var RdfXmlParser = require('rdf-parser-rdfxml');
import {fetchGraph, matchForEachTriple, getOneObject, getOneObjectString, addTriple, renderHtmlPropsTable, getPropsProps} from './oslc-schema-utils'
import DomainRenderer from './domain-renderer';
import ResourceTypeRenderer from './resource-type-renderer';

let OSLC = suffix => 'http://open-services.net/ns/core#' + suffix;
let RDF = suffix => 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' + suffix;
let OSLCKTH = suffix => 'http://oslc.kth.se/core#' + suffix;

var parser = new RdfXmlParser();
let hasResourceTypePredicate = parser.rdf.createNamedNode(OSLCKTH('hasResourceType'));
let hasResourceShapePredicate = parser.rdf.createNamedNode(OSLCKTH('hasResourceShape'));
let schemaDomainType = parser.rdf.createNamedNode(OSLCKTH('hasResourceShape'));

let currentGraph;

export var domainRenderer = new DomainRenderer('domain');
export var resourceTypeRenderer = new ResourceTypeRenderer('resourceType', propsPropsGetter);

export function renderHtml() {
  renderHtmlPropsTable(currentGraph);
}

function propsPropsGetter(resourceTypeUri) {
  let resourceShapeUri = getOneObjectString(currentGraph, resourceTypeUri, OSLCKTH('hasResourceShape'));
  return _.map(getPropsProps(currentGraph, resourceShapeUri, ['name', 'valueType', 'range']),
      propProps => propProps[0] + ': ' + propProps[1] + (propProps[2] ? ' *' : ''));
}

export function getRdfType(s) {
  let typeTriples = currentGraph.match(s, RDF('type'), null);
  if (typeTriples.length) {
    return typeTriples.toArray()[0].object.toString();
  } else {
    return undefined;
  }
}

export function getOSLCSchemaRenderer(d) {
  return {
    'http://oslc.kth.se/core#SchemaDomain': domainRenderer.render,
    'http://oslc.kth.se/core#SchemaResourceType': resourceTypeRenderer.render}[getRdfType(d)];
}

// returns a list of children of parentData
export function getOSLCSchemaChildren(parentData) {
  if (parentData) {
    let type = getRdfType(parentData);
    if (type == OSLCKTH('SchemaDomain')) {
      let resourceTypeTriples = currentGraph.match(parentData, OSLCKTH('hasResourceType'), null);
      return _.uniq(_.map(resourceTypeTriples.toArray(), t => t.object.toString()));
    } else {
      return [];
    }
  } else {
    // return list of domains
    return _.uniq(_.map(currentGraph.match(null, 'http://oslc.kth.se/core#hasResourceType', null).toArray(), t => t.subject.toString()));
  }
}

// returns an object having the methods:
// on(listener) - stores listener
// open(url) - reads resourceUrl and sets model
//    informs listeners about events by calling with parameter:
//    'read-begin' - when the http request is sent
//    'read-end' - when the result has been received and put into model
export function OSLCSchemaConnector(modelSetter) {
  var listeners = [];

  function open(catalogUrl) {
    fireEvent('read-begin');

    // fetch catalog
    fetchGraph(catalogUrl).then(function(graph) {
      currentGraph = graph;
      // collect all unique resourceShape URIs into resourceShapeUriSet
      let resourceShapeUriSet = {};
      matchForEachTriple(graph, null, RDF('type'), OSLC('ServiceProvider'), function(serviceProviderUriTriple) {
        matchForEachTriple(graph, serviceProviderUriTriple.subject, OSLC('service'), null, function(serviceTriple) {
          let serviceDomain = getOneObject(graph, serviceTriple.object, OSLC('domain'));
          let serviceDomainHostname = parser.rdf.createNamedNode(new URL(serviceDomain ? serviceDomain.toString() : 'nodomain').origin);

          processService(OSLC('queryCapability'));
          processService(OSLC('creationFactory'));

          function processService(handler) {
            matchForEachTriple(graph, serviceTriple.object, handler, null, function(handlerTriple) {
              let resourceType = getOneObject(graph, handlerTriple.object, OSLC('resourceType'));
              // add domain to resource type relation to simplify grouping by domain
              addTriple(graph, serviceDomainHostname, OSLCKTH('hasResourceType'), resourceType);
              addTriple(graph, serviceDomainHostname, RDF('type'), OSLCKTH('SchemaDomain'));

              matchForEachTriple(graph, handlerTriple.object, OSLC('resourceShape'), null, function(resourceShapeUriTriple) {
                resourceShapeUriSet[resourceShapeUriTriple.object.toString()] = resourceType || 'no resource type';
              });
            });
          }
        });
      });

      // fetch all resourceShape resources
      Promise.all(_.map(resourceShapeUriSet, function(resourceType, resourceShapeUri) {
        return fetchGraph(resourceShapeUri).then(function(resourceShapeGraph) {
          // add resourceShape triples to total graph
          graph.addAll(resourceShapeGraph);
          // add resource type to resource shape relation to simplify later
          addTriple(graph, resourceType, OSLCKTH('hasResourceShape'), resourceShapeUri);
          addTriple(graph, resourceType, RDF('type'), OSLCKTH('SchemaResourceType'));
          return resourceShapeUri;
        })
      })).done(function(resourceShapeUris) {
        modelSetter(currentGraph);
        fireEvent('read-end');
      })
      .catch(function(error) {
        console.error(error);
        fireEvent('read-end');
      });
    });
  }

  function fireEvent(type) {
    _.each(listeners, function(listener) {
      listener(type);
    });
  }

  return {
    on: function(listener) {
      listeners.push(listener);
    },
    open: open
  };
};

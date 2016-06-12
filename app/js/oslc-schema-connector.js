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

export function getRelations(parentData) {
  if (parentData) {
    return [];
  } else {
    let rels = [];
    matchForEachTriple(currentGraph, null, OSLCKTH('hasResourceShape'), null, function(resourceShapeUriTriple) {
      matchForEachTriple(currentGraph, resourceShapeUriTriple.object, OSLC('property'), null, function(propertyUriTriple) {
        let range = getOneObject(currentGraph, propertyUriTriple.object, OSLC('range'));
        if (range) {
          rels.push({type: 'relation', from: resourceShapeUriTriple.subject.toString(), to: range.toString()});
        }
      });
    });
    return rels;
  }
}

// returns an object having the methods:
// on(listener) - stores listener
// open(url) - reads resourceUrl and sets model using modelSetter
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
      let resourceShapeUriSet = {}; // collect all unique resourceShape URIs here
      // for each serviceProvider
      matchForEachTriple(graph, null, RDF('type'), OSLC('ServiceProvider'), function(serviceProviderUriTriple) {
        // for each service
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
              // mar domain with type
              addTriple(graph, serviceDomainHostname, RDF('type'), OSLCKTH('SchemaDomain'));

              // collect and map all unique resource shapes to resourceType
              matchForEachTriple(graph, handlerTriple.object, OSLC('resourceShape'), null, function(resourceShapeUriTriple) {
                let resourceTypeString = resourceType || 'no resource type';
                resourceShapeUriSet[resourceShapeUriTriple.object.toString()] = resourceTypeString;
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
          // add resource type to resource shape relation to simplify later processing
          addTriple(graph, resourceType, OSLCKTH('hasResourceShape'), resourceShapeUri);
          addTriple(graph, resourceType, RDF('type'), OSLCKTH('SchemaResourceType'));

          return resourceShapeUri;
        })
      })).done(function(resourceShapeUris) {
        createMissingResourceTypes(resourceShapeUriSet);

        modelSetter(currentGraph);
        fireEvent('read-end');
      })
      .catch(function(error) {
        console.error(error);
        fireEvent('read-end');
      });
    });
  }

  // for any property oslc:range to nonexistent domain or resource type, create dummy resource type
  function createMissingResourceTypes(resourceShapeUriSet) {
    _.forEach(resourceShapeUriSet, function(resourceType, resourceShapeUri) {
      matchForEachTriple(currentGraph, resourceShapeUri, OSLC('property'), null, function(propertyUriTriple) {
        let propertyTriples = currentGraph.match(propertyUriTriple.object, null, null);
        let range = getOneObject(propertyTriples, propertyUriTriple.object, OSLC('range'));
        if (range) {
          createMissingResourceType(range.toString(), resourceShapeUriSet)
        }
      });
    });
  }

  function createMissingResourceType(newResourceTypeUri, resourceShapeUriSet) {
    if (!resourceShapeUriSet[newResourceTypeUri]) {
      let shapeUri = parser.rdf.createBlankNode();
      let newDomain = new URL(newResourceTypeUri).origin
      // find domain
      if (currentGraph.match(newDomain, RDF('type'), OSLCKTH('SchemaDomain')).length == 0) {
        // domain doesn't exist - create it
        console.log('create domain', newDomain);
        addTriple(currentGraph, newDomain, RDF('type'), OSLCKTH('SchemaDomain'));
      }

      // find newResourceType
      if (currentGraph.match(newResourceTypeUri, RDF('type'), OSLCKTH('SchemaResourceType')).length == 0) {
        console.log('create resource type', newResourceTypeUri);
        // newResourceType not found - create newResourceType
        addTriple(currentGraph, newDomain, OSLCKTH('hasResourceType'), newResourceTypeUri);
        addTriple(currentGraph, newResourceTypeUri, RDF('type'), OSLCKTH('SchemaResourceType'));

        // create shape
        addTriple(currentGraph, newResourceTypeUri, OSLCKTH('hasResourceShape'), shapeUri);
        resourceShapeUriSet[newResourceTypeUri] = shapeUri;
      }
    }
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

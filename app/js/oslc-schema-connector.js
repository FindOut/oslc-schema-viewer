import * as d3 from './modeling/d3';
import _ from 'lodash';
import Promise from 'promise';
import RdfXmlParser from 'rdf-parser-rdfxml';
import {fetchGraph, matchForEachTriple, getOneObject, getOneObjectString, addTriple, renderHtmlPropsTable, getPropsProps, graphToString} from './oslc-schema-utils';
import {VBoxLayout, RelationComponent} from './modeling/index.js';

import DomainComponent from './domain-component';
import ResourceTypeComponent from './resource-type-component';

let OSLC = suffix => 'http://open-services.net/ns/core#' + suffix;
let RDF = suffix => 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' + suffix;
let OSLCKTH = suffix => 'http://oslc.kth.se/core#' + suffix;

var parser = new RdfXmlParser();
let hasResourceTypePredicate = parser.rdf.createNamedNode(OSLCKTH('hasResourceType'));
let hasResourceShapePredicate = parser.rdf.createNamedNode(OSLCKTH('hasResourceShape'));
let schemaDomainType = parser.rdf.createNamedNode(OSLCKTH('hasResourceShape'));

let currentGraph;

export var domainComponent = new DomainComponent('domain', domainNameInfoGetter).layout(new VBoxLayout().margin(10));
export var resourceTypeComponent = new ResourceTypeComponent('resourceType', propsPropsGetter, parser.rdf.prefixes, isDerived);
var relationComponent = new RelationComponent('relation', d => [d.text]);

export function getOSLCSchemaComponent(d) {
  return {
    'http://oslc.kth.se/core#SchemaDomain': domainComponent,
    'http://oslc.kth.se/core#SchemaResourceType': resourceTypeComponent}[getRdfType(d)];
}

// returns a list of children of parentData
// parentData=undefined: list of domain URIs
// parentData=a domain uri: list of resource type uris in this domain
// other: empty list
export function getOSLCSchemaChildren(parentData) {
  if (parentData) {
    let type = getRdfType(parentData);
    if (type == OSLCKTH('SchemaDomain')) {
      let resourceTypeTriples = currentGraph.match(null, OSLCKTH('hasSchemaDomain'), parentData);
      return _.uniq(_.map(resourceTypeTriples.toArray(), t => t.subject.toString()));
    } else {
      return [];
    }
  } else {
    // return list of domains
    return getUniqeDomainNames();
  }
}

// returns all relations as a list of {type: 'relation', from: sourceResourceTypeUri, to: targetResourceTypeUri}
export function getRelations(parentData) {
  if (parentData) {
    return [];
  } else {
    let rels = [];
    matchForEachTriple(currentGraph, null, OSLCKTH('hasResourceShape'), null, function(resourceShapeUriTriple) {
      let resourceTypeUri = resourceShapeUriTriple.subject.toString();
      let prefixRegExp = getPrefixRegExp(resourceTypeUri);
      matchForEachTriple(currentGraph, resourceShapeUriTriple.object, OSLC('property'), null, function(propertyUriTriple) {
        let range = getOneObject(currentGraph, propertyUriTriple.object, OSLC('range'));
        if (range) {
          let name = getOneObjectString(currentGraph, propertyUriTriple.object, OSLC('propertyDefinition'));
          let text = parser.rdf.prefixes.shrink(name).replace(prefixRegExp, '');
          let id = resourceShapeUriTriple.subject.toString() + '-' + range.toString() + '-' + text;
          let relationItem = {id: id, type: 'relation', text: text, from: resourceShapeUriTriple.subject.toString(), to: range.toString()};
          rels.push(relationItem);
        }
      });
    });
    return rels;
  }
}

export function getRelationComponent(d) {
    return {'relation': relationComponent}[d.type];
  }

export function renderHtml() {
  renderHtmlPropsTable(currentGraph);
}

function getPrefix(uri, defaultValue) {
  let shrinked = parser.rdf.prefixes.shrink(uri.toString());
  if (shrinked !== uri) {
    return shrinked.substring(0, shrinked.indexOf(':'));
  } else {
    return defaultValue;
  }
}

function getPrefixRegExp(uri) {
  let prefix = getPrefix(uri);
  if (prefix) {
    return new RegExp(prefix + ':');
  } else {
    return new RegExp('');
  }
}

function propsPropsGetter(resourceTypeUri) {
  let prefixRegExp = getPrefixRegExp(resourceTypeUri);
  let resourceShapeUri = getOneObjectString(currentGraph, resourceTypeUri, OSLCKTH('hasResourceShape'));
  let propsProps = getPropsProps(currentGraph, resourceShapeUri, ['propertyDefinition', 'valueType', 'range']);
  let rangeLessPropsProps = _.filter(propsProps, prop => !prop[2]);
  let propsTexts = _.map(rangeLessPropsProps,
      propProps => parser.rdf.prefixes.shrink(propProps[0]).replace(prefixRegExp, '')
          + ': ' + parser.rdf.prefixes.shrink(propProps[1]));
  return propsTexts.sort();
}

function domainNameInfoGetter(dn) {
  let prefix = getOneObjectString(currentGraph, dn, OSLCKTH('prefix'));
  return {
    name: prefix,
    domain: parser.rdf.prefixes[prefix]
  }
}

function isDerived(resourceTypeUri) {
  return getOneObject(currentGraph, resourceTypeUri, OSLCKTH('derived'));
}

export function getRdfType(s) {
  let typeTriples = currentGraph.match(s, RDF('type'), null);
  if (typeTriples.length > 0) {
    return typeTriples.toArray()[0].object.toString();
  } else {
    return undefined;
  }
}

function getUniqeDomainNames() {
  let nameSet = {};
  matchForEachTriple(currentGraph, null, OSLCKTH('hasSchemaDomain'), null, function(triple) {
    nameSet[triple.object.toString()] = triple.object;
  });
  return _.map(nameSet, (v, k) => v);
}

// returns an object having the methods:
// on(listener) - stores listener
// open(url) - reads resourceUrl and
//    informs listeners about events by calling with parameter:
//    'read-begin' - when the http request is sent
//    'read-end', result - when the result has been received
export function OSLCSchemaConnector() {
  var listeners = [];

  function open(catalogUrls) {
    fireEvent('read-begin');

    // fetch catalog
    Promise.all(_.map(catalogUrls.split(','), url => fetchGraph(url.trim())))
    .then(function(catalogGraphs) {
      let graph = parser.rdf.createGraph();
      _.forEach(catalogGraphs, function(catalogGraph) {
        graph.addAll(catalogGraph.toArray());
      });

      collectPrefixDefinitions(graph);
      let resourceShapeUriSet = {}; // collect all unique resourceShape URIs here
      let domains = {};

      // for each serviceProvider
      matchForEachTriple(graph, null, RDF('type'), OSLC('ServiceProvider'), function(serviceProviderUriTriple) {
        // for each service
        matchForEachTriple(graph, serviceProviderUriTriple.subject, OSLC('service'), null, function(serviceTriple) {
          processService(OSLC('queryCapability'));
          processService(OSLC('creationFactory'));

          function processService(handler) {
            matchForEachTriple(graph, serviceTriple.object, handler, null, function(handlerTriple) {
              let resourceType = getOneObject(graph, handlerTriple.object, OSLC('resourceType'));
              // add domain to resource type relation to simplify grouping by domain
              addTriple(graph, resourceType, OSLCKTH('hasSchemaDomain'), getSchemaDomainNode(graph, resourceType, false));
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
        createMissingResourceTypes(graph, resourceShapeUriSet);

        currentGraph = graph;
        fireEvent('read-end', graph);
      })
      .catch(function(error) {
        console.error(error);
        fireEvent('read-end');
      });
    });
  }

  // returns the schema domain node for the resourceType prefix (creates it if missing)
  function getSchemaDomainNode(graph, resourceType, derived) {
    let prefix = getPrefix(resourceType);
    let prefixDomainNode = graph.match(null, OSLCKTH('prefix'), prefix);
    if (prefixDomainNode.length > 0) {
      return prefixDomainNode.toArray()[0].subject;
    } else {
      let schemaDomain = parser.rdf.createBlankNode()
      addTriple(graph, schemaDomain, RDF('type'), OSLCKTH('SchemaDomain'));
      addTriple(graph, schemaDomain, OSLCKTH('prefix'), prefix);
      if (derived) {
        // mark it as derived
        addTriple(graph, schemaDomain, OSLCKTH('derived'), resourceType);
      }
      return schemaDomain;
    }
  }

  function collectPrefixDefinitions(graph) {
    matchForEachTriple(graph, null, RDF('type'), 'http://open-services.net/ns/core#PrefixDefinition', function(triple) {
      let prefix = getOneObjectString(graph, triple.subject, OSLC('prefix'));
      let prefixBase = getOneObjectString(graph, triple.subject, OSLC('prefixBase'));
      parser.rdf.prefixes[prefix] = prefixBase;
    });
    // _.forEach(parser.rdf.prefixes, (v, k) => console.log(k, v));
  }

  // for any property oslc:range to nonexistent domain or resource type, create dummy resource type
  function createMissingResourceTypes(graph, resourceShapeUriSet) {
    _.forEach(resourceShapeUriSet, function(resourceType, resourceShapeUri) {
      matchForEachTriple(graph, resourceShapeUri, OSLC('property'), null, function(propertyUriTriple) {
        let propertyTriples = graph.match(propertyUriTriple.object, null, null);

        let propDef = getOneObjectString(propertyTriples, propertyUriTriple.object, OSLC('propertyDefinition'));

        let range = getOneObject(propertyTriples, propertyUriTriple.object, OSLC('range'));
        if (range) {
          createMissingResourceType(graph, range.toString(), resourceShapeUriSet)
        }
      });
    });
  }

  function createMissingResourceType(graph, newResourceTypeUri, resourceShapeUriSet) {
    if (!resourceShapeUriSet[newResourceTypeUri]) {
      let shapeUri = parser.rdf.createBlankNode();
      addTriple(graph, newResourceTypeUri, OSLCKTH('hasSchemaDomain'), getSchemaDomainNode(graph, newResourceTypeUri, true));

      // find newResourceType
      if (graph.match(newResourceTypeUri, RDF('type'), OSLCKTH('SchemaResourceType')).length == 0) {
        // newResourceType not found - create newResourceType
        addTriple(graph, newResourceTypeUri, RDF('type'), OSLCKTH('SchemaResourceType'));
        // mark it as derived
        addTriple(graph, newResourceTypeUri, OSLCKTH('derived'), newResourceTypeUri);

        // create shape
        addTriple(graph, newResourceTypeUri, OSLCKTH('hasResourceShape'), shapeUri);
        resourceShapeUriSet[newResourceTypeUri] = shapeUri;
      }
    }
  }

  function fireEvent(type, data) {
    _.each(listeners, function(listener) {
      listener(type, data);
    });
  }

  return {
    on: function(listener) {
      listeners.push(listener);
    },
    open: open
  };
};

var d3 = require('d3');
var _ = require('lodash');
var Promise = require('promise');
var RdfXmlParser = require('rdf-parser-rdfxml');
import {fetchGraph, matchForEachTriple, getOneObject, addTriple, renderHtmlPropsTable} from './oslc-schema-utils'

function OSLC(suffix) {
  return 'http://open-services.net/ns/core#' + suffix;
}
var parser = new RdfXmlParser();
let hasResourceTypePredicate = parser.rdf.createNamedNode('http://oslc.kth.se/core#hasResourceType');
let hasResourceShapePredicate = parser.rdf.createNamedNode('http://oslc.kth.se/core#hasResourceShape');
var catalogUrl = 'https://vservices.offis.de/rtp/simulink/v1.0/services/catalog/singleton';

// fetch catalog
fetchGraph(catalogUrl).then(function(graph) {
  // collect all unique resourceShape URIs into resourceShapeUriSet
  let resourceShapeUriSet = {};
  matchForEachTriple(graph, null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', OSLC('ServiceProvider'), function(serviceProviderUriTriple) {
    matchForEachTriple(graph, serviceProviderUriTriple.subject, OSLC('service'), null, function(serviceTriple) {
      let serviceDomain = getOneObject(graph, serviceTriple.object, OSLC('domain'));
      let serviceDomainHostname = parser.rdf.createNamedNode(new URL(serviceDomain ? serviceDomain.toString() : 'nodomain').origin);

      processService(OSLC('queryCapability'));
      processService(OSLC('creationFactory'));

      function processService(handler) {
        matchForEachTriple(graph, serviceTriple.object, handler, null, function(handlerTriple) {
          let resourceType = getOneObject(graph, handlerTriple.object, OSLC('resourceType'));
          // add domain to resource type relation to simplify grouping by domain
          addTriple(graph, serviceDomainHostname, hasResourceTypePredicate, resourceType);

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
      addTriple(graph, resourceType, hasResourceShapePredicate, parser.rdf.createNamedNode(resourceShapeUri));
      return resourceShapeUri;
    })
  })).done(function(resourceShapeUris) {
    renderHtmlPropsTable(graph);
  })

}).catch(function(err) {
  console.error(err.stack);
});

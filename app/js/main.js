var d3 = require('d3');
var _ = require('lodash');
var Promise = require('promise');
var jsonld = require('jsonld');
var RdfXmlParser = require('rdf-parser-rdfxml');
var $rdf = require('rdflib');

var parser = new RdfXmlParser();
var catalogUrl = 'https://vservices.offis.de/rtp/simulink/v1.0/services/catalog/singleton';
var resultMap = {}; // {<sp>: {<resource>: {<prop>: {name: xxx, ...}, ...}, ...}}

console.log(parser.rdf.createNamedNode());

// fetch catalog
fetchGraph(catalogUrl).then(function(graph) {
  let resourceShapeUriSet = {};
  let serviceProvidersTriples = graph.match(null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://open-services.net/ns/core#ServiceProvider');
  for (let serviceProviderUriTriple of serviceProvidersTriples.toArray()) {
    console.log(serviceProviderUriTriple.subject.toString());
    let serviceTriples = graph.match(serviceProviderUriTriple.subject, 'http://open-services.net/ns/core#service', null);
    for (let serviceTriple of serviceTriples.toArray()) {
      let queryCapabilityTriples = graph.match(serviceTriple.object, 'http://open-services.net/ns/core#queryCapability', null);
      for (let queryCapabilityTriple of queryCapabilityTriples.toArray()) {
        let resourceShapeUriTriples = graph.match(queryCapabilityTriple.object, 'http://open-services.net/ns/core#resourceShape', null);
        for (let resourceShapeUriTriple of resourceShapeUriTriples.toArray()) {
          resourceShapeUriSet[resourceShapeUriTriple.object.toString()] = 'dummy';
        }
      }
    }
  }

  // fetch all resourceShape resources
  Promise.all(_.map(resourceShapeUriSet, function(value, resourceShapeUri) {
    return fetchGraph(resourceShapeUri).then(function(resourceShapeGraph) {
      // add resourceShape triples to total graph
      graph.addAll(resourceShapeGraph);
      return resourceShapeUri;
    })
  })).done(function(resourceShapeUris) {
    // all shapes are loaded - log all property names
    for (let resourceShapeUri of resourceShapeUris) {
      console.log(resourceShapeUri);
      graph.match(resourceShapeUri, 'http://open-services.net/ns/core#property', null).forEach(function(propRefTriple) {
        graph.match(propRefTriple.object, 'http://open-services.net/ns/core#name', null).forEach(function(propNameTriple) {
          console.log(' ', propNameTriple.object.toString());
        });
      });
    }
  })
}).catch(function(err) {
  console.error(err);
});

function fetchGraph(url, tripleMap) {
  return fetchXml(url).then(function(urlData) {
    return parser.parse(urlData);
  });
}

function fetchXml(url) {
  // console.log('fetchXml', url);
  return new Promise(function(fulfill, reject) {
    d3.xml('/proxy?url=' + encodeURIComponent(url), function(error, doc) {
      if (error) {
        // console.log('fetchXml error', error);
        reject(error);
      } else {
        // console.log('fetchXml document', doc);
        fulfill(doc);
      }
    });
  });
}

function singleToString(s) {
  if (s.interfaceName == 'NamedNode') {
    return '<' + s.nominalValue + '>';
  } else if (s.interfaceName == 'BlankNode') {
    return '_:' + s.nominalValue;
  } else if (s.interfaceName == 'Literal') {
    return JSON.stringify(s.nominalValue, null, '');
  } else {
    throw 'unsupported rdf type: ' + s;
  }
}

function tripleToString(triple) {
  return singleToString(triple.subject) + ' ' + singleToString(triple.predicate) + ' ' + singleToString(triple.object) + '.';
}

function graphToString(graph) {
  var graphString = '';
  for (var triple of graph._graph) {
    graphString += tripleToString(triple) + '\n';
  }
  return graphString;
}

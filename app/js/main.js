var d3 = require('d3');
var _ = require('lodash');
var Promise = require('promise');
var RdfXmlParser = require('rdf-parser-rdfxml');

var parser = new RdfXmlParser();
var catalogUrl = 'https://vservices.offis.de/rtp/simulink/v1.0/services/catalog/singleton';
let hasResourceTypePredicate = parser.rdf.createNamedNode('http://oslc.kth.se/core#hasResourceType');
let hasResourceShapePredicate = parser.rdf.createNamedNode('http://oslc.kth.se/core#hasResourceShape');
function OSLC(suffix) {
  return 'http://open-services.net/ns/core#' + suffix;
}

// fetch catalog
fetchGraph(catalogUrl).then(function(graph) {
  // collect all unique resourceShape URIs into resourceShapeUriSet
  let resourceShapeUriSet = {};
  matchForEachTriple(graph, null, 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', 'http://open-services.net/ns/core#ServiceProvider', function(serviceProviderUriTriple) {
    matchForEachTriple(graph, serviceProviderUriTriple.subject, 'http://open-services.net/ns/core#service', null, function(serviceTriple) {
      let serviceDomain = getOneObject(graph, serviceTriple.object, 'http://open-services.net/ns/core#domain');
      let serviceDomainHostname = parser.rdf.createNamedNode(new URL(serviceDomain ? serviceDomain.toString() : 'nodomain').origin);

      processService('http://open-services.net/ns/core#queryCapability');
      processService('http://open-services.net/ns/core#creationFactory');

      function processService(handler) {
        matchForEachTriple(graph, serviceTriple.object, handler, null, function(handlerTriple) {
          let resourceType = getOneObject(graph, handlerTriple.object, 'http://open-services.net/ns/core#resourceType');
          addTriple(graph, serviceDomainHostname, hasResourceTypePredicate, resourceType);

          matchForEachTriple(graph, handlerTriple.object, 'http://open-services.net/ns/core#resourceShape', null, function(resourceShapeUriTriple) {
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
      // add triple that associate 
      addTriple(graph, resourceType, hasResourceShapePredicate, parser.rdf.createNamedNode(resourceShapeUri));
      return resourceShapeUri;
    })
  })).done(function(resourceShapeUris) {
    renderHtmlPropsTable(graph);
  })

}).catch(function(err) {
  console.error(err.stack);
});

function renderHtmlPropsTable(graph) {
  let domainName;
  matchForEachTriple(graph, null, 'http://oslc.kth.se/core#hasResourceType', null, function(triple) {
    // emit domain
    if (domainName !== triple.subject.toString()) {
      d3.select('#graph').append('h2').text(triple.subject.toString());
      domainName = triple.subject.toString();
    }
    // emit resource type
    d3.select('#graph').append('h2').text(triple.object.toString());

    matchForEachTriple(graph, triple.object, hasResourceShapePredicate, null, function(resourceShapeUriTriple) {
      // emit resource shape
      var table = d3.select('#graph').append('table');
      table.append('tr').attr('class', 'thead');
      var keys = ['name', 'valueType', 'occurs', 'readOnly'];
      table.select('tr').selectAll('td')
        .data(keys).enter().append('td').attr('class', 'thead').text(d=>d);
      matchForEachTriple(graph, resourceShapeUriTriple.object, 'http://open-services.net/ns/core#property', null, function(propertyUriTriple) {
        let propertyTriples = graph.match(propertyUriTriple.object, null, null);

        table.append('tr')
          .attr('class', '.proprow')
          .selectAll('td')
          .data(d=>_.map(keys,
            key=>getOneObjectString(propertyTriples, propertyUriTriple.object, OSLC(key))
              .replace('http://open-services.net/ns/core#', 'oslc:')
              .replace('http://open-services.net/ns/cm#', 'cm:')
              .replace('http://purl.org/dc/terms/', 'purl:')
              .replace('http://www.w3.org/2001/XMLSchema#', 'xsd:')
              .replace('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf:')
            )).enter().append('td').text(d=>d);
      });
    });
  });
}

// call callback(subject, predicate, object) for each matching triple
function matchForEach(graph, subject, predicate, object, callback) {
  graph.toArray().forEach(function(triple) {
    if ((!subject || triple.subject.equals(subject))
        && (!predicate || triple.predicate.equals(predicate))
        && (!object || triple.object.equals(object))) {
      callback(triple.subject, triple.predicate, triple.object);
    }
  });
}

function matchForEachTriple(graph, subject, predicate, object, callback) {
  graph.toArray().forEach(function(triple) {
    if ((!subject || triple.subject.equals(subject))
        && (!predicate || triple.predicate.equals(predicate))
        && (!object || triple.object.equals(object))) {
      callback(triple);
    }
  });
}

// adds triple to graph, if not found
// subject, predicate and object must all be truthy
function addTriple(graph, subject, predicate, object) {
  if (subject && predicate && object && graph.match(subject, predicate, object).length == 0) {
    let triple = parser.rdf.createTriple(subject, predicate, object);
    graph.add(triple);
  }
}

// returns the first object having the specified subject and predicate, or null if not found
function getOneObject(graph, subject, predicate) {
  let triples = graph.match(subject, predicate, null);
  if (triples.length) {
    return triples.toArray()[0].object;
  } else {
    return null;
  }
}

// returns the first object having the specified subject and predicate as a string, or null if not found
function getOneObjectString(graph, subject, predicate) {
  let triples = graph.match(subject, predicate, null);
  if (triples.length) {
    return triples.toArray()[0].object.toString();
  } else {
    return '';
  }
}

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

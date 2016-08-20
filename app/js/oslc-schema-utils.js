import * as d3 from './modeling/d3';
import _ from 'lodash';
import Promise from 'promise';
import RdfXmlParser from 'rdf-parser-rdfxml';

let OSLC = suffix => 'http://open-services.net/ns/core#' + suffix;
let RDF = suffix => 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' + suffix;
let OSLCKTH = suffix => 'http://oslc.kth.se/core#' + suffix;

let parser = new RdfXmlParser();
let xmlParser = new DOMParser();
let hasResourceTypePredicate = parser.rdf.createNamedNode('http://oslc.kth.se/core#hasResourceType');
let hasResourceShapePredicate = parser.rdf.createNamedNode('http://oslc.kth.se/core#hasResourceShape');

export function renderHtmlPropsTable(graph) {
  let previousDomainName;
  matchForEachTriple(graph, null, OSLCKTH('hasResourceType'), null, function(triple) {
    // emit domain name title
    let domainName = triple.subject.toString();
    if (previousDomainName !== domainName) {
      d3.select('#graph').append('h2').text(domainName);
      previousDomainName = domainName;
    }
    // emit resource type title
    d3.select('#graph').append('h2').text(triple.object.toString());

    matchForEachTriple(graph, triple.object, OSLCKTH('hasResourceShape'), null, function(resourceShapeUriTriple) {
      // emit resource shape table and header
      var table = d3.select('#graph').append('table');
      table.append('tr').attr('class', 'thead');
      var keys = ['name', 'valueType', 'occurs', 'readOnly'];
      table.select('tr').selectAll('td')
        .data(keys).enter().append('td').attr('class', 'thead').text(d=>d);

      // emit resource shape properties
      matchForEachTriple(graph, resourceShapeUriTriple.object, OSLC('property'), null, function(propertyUriTriple) {
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
export function matchForEach(graph, subject, predicate, object, callback) {
  graph.toArray().forEach(function(triple) {
    if ((!subject || triple.subject.equals(subject))
        && (!predicate || triple.predicate.equals(predicate))
        && (!object || triple.object.equals(object))) {
      callback(triple.subject, triple.predicate, triple.object);
    }
  });
}

// call callback(triple) for each matching triple
export function matchForEachTriple(graph, subject, predicate, object, callback) {
  graph.toArray().forEach(function(triple) {
    if ((!subject || triple.subject.equals(subject))
        && (!predicate || triple.predicate.equals(predicate))
        && (!object || triple.object.equals(object))) {
      callback(triple);
    }
  });
}

function makeNameNodeIfString(s) {
    if (s instanceof String || typeof s === 'string') {
      return parser.rdf.createNamedNode(s);
    }
    return s;
}

// adds triple to graph, if not found
// subject, predicate and object must all be truthy
export function addTriple(graph, subject, predicate, object) {
  if (subject && predicate && object && graph.match(subject, predicate, object).length == 0) {
    let triple = parser.rdf.createTriple(makeNameNodeIfString(subject), makeNameNodeIfString(predicate), makeNameNodeIfString(object));
    graph.add(triple);
  }
}

// returns the first object having the specified subject and predicate, or null if not found
export function getOneObject(graph, subject, predicate) {
  let triples = graph.match(subject, predicate, null);
  if (triples.length) {
    return triples.toArray()[0].object;
  } else {
    return null;
  }
}

// returns the first object having the specified subject and predicate as a string, or null if not found
export function getOneObjectString(graph, subject, predicate) {
  let triples = graph.match(subject, predicate, null);
  if (triples.length) {
    return triples.toArray()[0].object.toString();
  } else {
    return '';
  }
}

export function fetchGraph(url, tripleMap) {
  return fetchXml(url).then(function(urlData) {
    return parser.parse(urlData);
  });
}

export function fetchXml(url) {
  return new Promise(function(fulfill, reject) {
    d3.request('http://localhost:3011/proxy?url=' + encodeURIComponent(url))
    .header('Accept', 'application/rdf+xml')
    .get(function(error, xhr) {
      if (error) {
        reject(error);
      } else {
        let xmlDoc = xmlParser.parseFromString(xhr.responseText, 'text/xml');
        fulfill(xmlDoc);
      }
    });
  });
}

export function singleToString(s) {
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

export function tripleToString(triple) {
  return singleToString(triple.subject) + ' ' + singleToString(triple.predicate) + ' ' + singleToString(triple.object) + '.';
}

export function graphToString(graph) {
  var graphString = '';
  for (var triple of graph._graph) {
    graphString += tripleToString(triple) + '\n';
  }
  return graphString;
}

function renderHtmlPropsTable(graph) {
  let previousDomainName;
  matchForEachTriple(graph, null, OSLCKTH('hasResourceType'), null, function(triple) {
    // emit domain name title
    let domainName = triple.subject.toString();
    if (previousDomainName !== domainName) {
      d3.select('#graph').append('h2').text(domainName);
      previousDomainName = domainName;
    }
    // emit resource type title
    d3.select('#graph').append('h2').text(triple.object.toString());

    matchForEachTriple(graph, triple.object, OSLCKTH('hasResourceShape'), null, function(resourceShapeUriTriple) {
      // emit resource shape table and header
      var table = d3.select('#graph').append('table');
      table.append('tr').attr('class', 'thead');
      var keys = ['name', 'valueType', 'occurs', 'readOnly'];
      table.select('tr').selectAll('td')
        .data(keys).enter().append('td').attr('class', 'thead').text(d=>d);

      // emit resource shape properties
      let propsProps = getPropsProps(graph, resourceShapeUriTriple.object, keys);
      _.forEach(propsProps, function(propProps) {
        table.append('tr')
        .attr('class', '.proprow')
        .selectAll('td')
        .data(propProps).enter().append('td').text(d=>d);
      });
    });

  });
}

// returns array of props, each an array of values for each prop name in propPropNames
export function getPropsProps(graph, resourceShapeUri, propPropNames) {
  let result = [];
  matchForEachTriple(graph, resourceShapeUri, OSLC('property'), null, function(propertyUriTriple) {
    let propertyTriples = graph.match(propertyUriTriple.object, null, null);
    result.push(_.map(propPropNames,
      key=>getOneObjectString(propertyTriples, propertyUriTriple.object, OSLC(key))
    ));
  });
  return result;
}

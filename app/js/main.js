var d3 = require('d3');
var _ = require('lodash');
var Promise = require('promise');
var jsonld = require('jsonld');
var RdfXmlParser = require('rdf-parser-rdfxml');

var parser = new RdfXmlParser();
var catalogUrl = 'https://vservices.offis.de/rtp/simulink/v1.0/services/catalog/singleton';
var serviceProviderUrl, resourceShapeUrl;
var resultMap = {};
fetchIndexedJsonLd(catalogUrl).then(function(indexedCatalog) {
  console.log(catalogUrl, indexedCatalog);
  serviceProviderUrl = indexedCatalog[catalogUrl]['http://open-services.net/ns/core#serviceProvider'][0]['@id'];
  console.log('serviceProviderUrl', serviceProviderUrl);
  return fetchIndexedJsonLd(serviceProviderUrl);
}).then(function(indexedServiceProvider) {
  console.log(serviceProviderUrl, indexedServiceProvider);
  var serviceId = indexedServiceProvider[serviceProviderUrl]['http://open-services.net/ns/core#service'][0]['@id'];
  var creationFactoryId = indexedServiceProvider[serviceId]['http://open-services.net/ns/core#queryCapability'][0]['@id'];
  resourceShapeUrl = indexedServiceProvider[creationFactoryId]['http://open-services.net/ns/core#resourceShape'][0]['@id'];
  console.log('resourceShapeUrl', resourceShapeUrl);
  return fetchIndexedJsonLd(resourceShapeUrl);
}).then(function(indexedResourceShape) {
  console.log(resourceShapeUrl, indexedResourceShape);
  return addResourcePropsToMap(indexedResourceShape);
}).then(function(resultMap) {
  renderHtmlPropsTable(resultMap);
}).catch(function (error) {
  console.error(error);
});

function addResourcePropsToMap(indexedResourceShape) {
  var shape = _.find(indexedResourceShape, (value, key)=>value['@type']=='http://open-services.net/ns/core#ResourceShape');
  var resourceType = shape['http://open-services.net/ns/core#describes'][0]['@id'];
  console.log('resourceType', resourceType);
  resultMap[resourceType] = _.map(indexedResourceShape[resourceShapeUrl]['http://open-services.net/ns/core#property'], function(propertyId) {
    var property = indexedResourceShape[propertyId['@id']];
    function getPropertyProperty(id, selector) {
      var prop = property['http://open-services.net/ns/core#' + id];
      return prop && prop[0][selector]
        .replace('http://open-services.net/ns/core#', 'oslc:')
        .replace('http://open-services.net/ns/cm#', 'cm:')
        .replace('http://purl.org/dc/terms/', 'purl:')
        .replace('http://www.w3.org/2001/XMLSchema#', 'xsd:')
        .replace('http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'rdf:')
    }
    return {
      id: propertyId['@id'],
      name: getPropertyProperty('name', '@value'),
      propertyDefinition: getPropertyProperty('propertyDefinition', '@id'),
      occurs: getPropertyProperty('occurs', '@id'),
      readOnly: getPropertyProperty('readOnly', '@value'),
      valueType: getPropertyProperty('valueType', '@id')
    };
  });
  return resultMap;
}

function fetchXml(url) {
  console.log('fetchXml', url);
  return new Promise(function(fulfill, reject) {
    d3.xml('/proxy?url=' + encodeURIComponent(url), function(error, document) {
      if (error) {
        reject(error);
      } else {
        fulfill(document);
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

function fetchIndexedJsonLd(url) {
  return fetchXml(url).then(function(urlData) {
    return parser.parse(urlData);
  }).then(function (graph) {
    return jsonld.promises.fromRDF(graphToString(graph), {format: 'application/nquads'});
  }).then(function (urlDataJsonLd) {
    return _.keyBy(urlDataJsonLd, '@id');
  });
}

function renderHtmlPropsTable(resultMap) {
  console.log(resultMap);
  _.forEach(resultMap, function(props, id) {
    d3.select('#graph').append('h3').text(id)
    var table = d3.select('#graph').selectAll('table')
      .data(['dummy']);
    var tableEnter = table.enter().append('table');
    tableEnter.append('tr').attr('class', 'thead');
    var keys = ['name', 'valueType', 'occurs', 'readOnly'];
    table.select('tr').selectAll('td')
      .data(keys).enter().append('td').attr('class', 'thead').text(d=>d);
    table.selectAll('.proprow')
      .data(props, d=>d.id)
      .enter().append('tr')
      .attr('class', '.proprow')
      .selectAll('td')
      .data(d=>_.map(keys, key=>d[key])).enter().append('td').text(d=>d);
  });
}

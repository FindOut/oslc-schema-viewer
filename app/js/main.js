var d3 = require('d3');
var _ = require('lodash');
var Promise = require('promise');

function fetchXml(url) {
  return new Promise(function(fulfill, reject) {
    d3.xml(url, function(error, document) {
      if (error) {
        reject(error);
      } else {
        fulfill(document);
      }
    })
  });
}

var rdfNs='http://www.w3.org/1999/02/22-rdf-syntax-ns#',
oslcNs='http://open-services.net/ns/core#';

var propMap = new Map();

fetchXml('http://localhost:3011/rio-cm/catalog').then(function(catalog) {
  console.log('catalog', catalog);
  var serviceProviderUrl = catalog.getElementsByTagNameNS(oslcNs, 'serviceProvider')[0]
    .getAttributeNS(rdfNs, 'resource');
  console.log('serviceProviderUrl', serviceProviderUrl);
  return fetchXml(serviceProviderUrl);
}).then(function(serviceProvider) {
  console.log('serviceProvider', serviceProvider);
  var resourceShapeUrl = serviceProvider.getElementsByTagNameNS(oslcNs, 'resourceShape')[0]
    .getAttributeNS(rdfNs, 'resource');
  console.log('resourceShapeUrl', resourceShapeUrl);
  return fetchXml(resourceShapeUrl);
}).then(function(resourceShape) {
  console.log('resourceShape', resourceShape);
  _.forEach(resourceShape.getElementsByTagNameNS(oslcNs, 'Property'), function(property) {
    var name, attrMap = new Map();
    _.forEach(property.children, function(child) {
      if (child.localName == 'name') {
        name = child.childNodes[0].wholeText;
      } else if(child.getAttributeNS(rdfNs, 'resource')) {
        attrMap.set(child.localName, child.getAttributeNS(rdfNs, 'resource'));
      } else if(child.getAttributeNS(rdfNs, 'datatype')) {
        attrMap.set(child.localName, child.childNodes[0].wholeText);
      }
    });
    propMap.set(name, attrMap);
  });
  console.log('propMap', propMap);
},
function(error) {
  console.error(error);
})

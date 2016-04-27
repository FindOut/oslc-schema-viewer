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
  _.foreach(resourceShape.getElementsByTagNameNS(oslcNs, 'Property'), function(Property) {
    console.log(Property);
  });
},
function(error) {
  console.error(error);
})

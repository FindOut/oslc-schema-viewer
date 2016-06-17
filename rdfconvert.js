var jsonld = require('jsonld');
var RdfXmlParser = require('rdf-parser-rdfxml');
var fs = require("fs");
var path = require("path");
var Promise = require('promise');
var readFile = Promise.denodeify(fs.readFile);

var parser = new RdfXmlParser();

readFile(path.join(__dirname, process.argv[2]), 'utf8')
.then(xml => parser.parse(xml))
.then(function (graph) {
  return jsonld.promises.fromRDF(graphToString(graph), {format: 'application/nquads'});
}).then(function (jsonData) {
  console.log('jsonData', JSON.stringify(jsonData, null, '  '));
})
.catch(function(error) {console.error(error);});

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

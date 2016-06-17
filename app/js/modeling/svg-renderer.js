import d3 from 'd3';
import $ from 'jquery';

// returns function to render the top level svg element
// model - object containing nodes and relations
// site - d3 wrapped element to put the svg element into
function Renderer(model, site) {
  var svg = site.selectAll('svg')
    .data(['anything']);
  var svgEnter = svg.enter().append('svg')
    .attr('width', 1000)
    .attr('height', 700)
    .append('g').attr('class', 'objects');
  render.svg = svg;

  adjustSize();
  window.onresize = adjustSize;

  function render() {
  }

  function adjustSize() {
    var xmax = $(window).innerWidth(),
      ymax = $(window).innerHeight();
    _.forEach(svg.node().childNodes, function(node) {
      let bBox = node.getBBox();
      xmax = Math.max(xmax, bBox.x + bBox.width);
      ymax = Math.max(ymax, bBox.y + bBox.height);
    });
    svg.attr('width', xmax + 10)
      .attr('height', ymax + 10);
  }

  return {render: render, adjustSize: adjustSize};
}



module.exports = Renderer;

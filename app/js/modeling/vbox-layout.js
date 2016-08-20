import * as d3 from './d3';
import _ from 'lodash';
import * as utils from './utils';


// returns a function layout(node), that when called with one d3 g element,
// lines up its children g elements vertically and sizes its rect around them
export function VBoxLayout() {
    var margin = 5,
        fill = false;

    function layout(node) {
        var innerMargin = node.node().fomod.innerMargin(node);
        var y = innerMargin.top + margin,
            maxWidth = 0;
        var gChildren = utils.selectAllImmediateChildNodes(node);;
        gChildren.each(function(d) {
            this.fomod.position(d3.select(this), {
                x: innerMargin.left + margin,
                y: y
            });
            var bBox = this.fomod.size(d3.select(this));
            y += +bBox.height + innerMargin.bottom + margin;
            maxWidth = Math.max(maxWidth, bBox.width);
        });
        if (fill) {
            gChildren.each(function(d) {
                this.fomod.size(d3.select(this), {
                    width: maxWidth
                });
            });
        }
        var preferredSize = node.node().fomod.preferredSize(node);
        node.node().fomod.size(node, {
            width: Math.max(preferredSize.width, innerMargin.left + margin + maxWidth + innerMargin.right + margin),
            height: Math.max(preferredSize.height, y)
        });
    }
    layout.childOffset = function() {
      return {x: margin, y: margin};
    };
    layout.margin = function(size) {
        if (size == undefined) {
            return margin;
        }
        margin = size;
        return layout;
    };
    layout.fill = function(t) { // true sets all child widths to max child width
        if (t == undefined) {
            return fill;
        }
        fill = t;
        return layout;
    };
    return layout;
}

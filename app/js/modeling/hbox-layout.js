import * as d3 from './d3';
import _ from 'lodash';
import * as utils from './utils';


// returns a function layout(node), that when called with a d3 g element, lines up its children g elements horisontally and sizes its rect around them
export function HBoxLayout() {
    var margin = 5,
        fill = false;

    function layout(node) {
        var innerMargin = node.node().fomod.innerMargin(node);
        var x = innerMargin.left + margin,
            maxHeight = 0;
        // get the direct children of node that have class node
        var gChildren = utils.selectAllImmediateChildNodes(node);
        gChildren.each(function(d) {
            this.fomod.position(d3.select(this), {
                x: x,
                y: innerMargin.top + margin
            });
            var bBox = this.getBBox();
            x += bBox.width + innerMargin.right + margin;
            maxHeight = Math.max(maxHeight, bBox.height);
        });
        if (fill) {
            gChildren.each(function(d) {
                this.fomod.size(d3.select(this), {
                    height: maxHeight
                });
            });
        }
        var preferredSize = node.node().fomod.preferredSize(node);
        node.node().fomod.size(node, {
            width: Math.max(preferredSize.width, x),
            height: Math.max(preferredSize.height, innerMargin.top + margin + maxHeight + innerMargin.bottom + margin)
        });
    }
    layout.childOffset = function() {
      return {x: margin, y: margin};
    };
    layout.margin = function(size) {
        if (!size) {
            return margin;
        }
        margin = size;
        return layout;
    };
    layout.fill = function(t) { // true sets all child height to max child height
        if (!t) {
            return fill
        }
        fill = t;
        return layout;
    };
    return layout;
}

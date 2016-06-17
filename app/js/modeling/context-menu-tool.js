import utils from './utils';

module.exports =
  // context menu on right mouse button press
  // based on https://github.com/mar10/jquery-ui-contextmenu
  function(manipulator) {
    var eventManager = new utils.EventManager();
    var contextMenuListener;

    manipulator.getManRect().on('mousedown.contextMenu', function() {
      console.log('mousedown.contextMenu 1');
      manipulator.becomeMaster('ContextMenu');
    });
    $(manipulator.getManRect().node()).contextmenu({
      beforeOpen: function(event, ui) {
        console.log('beforeOpen');
      },
      close: function(event) {
        console.log('close(event)');
        manipulator.unbecomeMaster('ContextMenu');
        event.preventDefault();
      },
      select: function(event, ui) {
        eventManager.fire('select', this, ui.cmd);
      }
    });
    manipulator
    .on('open.ContextMenu', function(d, node) {
      console.log('ContextMenu manipulator open');
      manipulator.getManRect().on('mousedown.contextMenu', function() {
        console.log('mousedown.contextMenu 2');
        if (d3.event.button === 2) {
          manipulator.becomeMaster('ContextMenu');
        }
      });

      var menuItems = contextMenuListener && contextMenuListener(d, node) || [];
      $(manipulator.getManRect().node()).contextmenu("replaceMenu", menuItems);
    })
    .on('close.ContextMenu', function() {
      console.log('ContextMenu manipulator close');
      manipulator.getManRect().on('mousedown.contextMenu', null);
    });

    return {
      on: eventManager.on,
      // manipulator calls listener(d, node) on open and expects a menu definition array in return
      setContextMenuListener: function(listener) {
        contextMenuListener = listener;
        return this;
      }
    }
  };

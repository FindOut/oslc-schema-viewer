import _ from 'lodash';
import * as d3 from './d3';

export function Commander() {
  var undoStack = [],
      dispatch = d3.dispatch('do', 'undo', 'redo', 'change', 'register'),
        undoI = 0,
        maxRedoI = 0,
        inCommand = 0,
        commandListeners = [];
    var Commander = function() {
        this.do = function(command) {
            if (inCommand === 0) {
                inCommand++;
                if (undoI < undoStack.length) {
                    undoStack[undoI] = command;
                } else {
                    undoStack.push(command);
                }
                undoI++;
                maxRedoI = undoI;
                command.do();
                inCommand--;
                dispatch.call('do',command);
                dispatch.call('change',command);
            }
        };
        this.undo = function() {
            if (undoI > 0 && inCommand === 0) {
                inCommand++;
                var cmd = undoStack[--undoI];
                cmd.undo();
                inCommand--;
                dispatch.call('undo',cmd);
                dispatch.call('change',cmd);
            }
        };
        this.redo = function() {
            if (undoI < maxRedoI && inCommand === 0) {
                inCommand++;
                var cmd = undoStack[undoI++];
                cmd.redo();
                inCommand--;
                dispatch.call('redo',cmd);
                dispatch.call('change',cmd);
            }
        };
        this.register = function(command) {
            // adds a command to the undo stack without executing it
            // use when the result of a command is already achieved, but it should be undoable
            if (inCommand === 0) {
                inCommand++;
                if (undoI < undoStack.length) {
                    undoStack[undoI] = command;
                } else {
                    undoStack.push(command);
                }
                undoI++;
                maxRedoI = undoI;
                inCommand--;
                dispatch.call('register',command);
            }
        };
        this.on = (type, listener) => {dispatch.on(type, listener);};
        this.canUndo = function() {
            return undoI > 0 && inCommand === 0;
        };
        this.canRedo = function() {
            return undoI < maxRedoI && inCommand === 0;
        };
        this.clear = function() {
            undoI = 0;
            maxRedoI = 0;
        };
        return this;
    };
    return new Commander();
};

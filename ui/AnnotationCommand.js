import annotationHelpers from '../model/annotationHelpers'
import Command from './Command'

/**
  A class for commands intended to be executed on the annotations.

  See the example below to learn how to register an `AnnotationCommand`
  for a strong annotation.

  @class AnnotationCommand
  @extends ui/Command

  @example

  ```js
  import { AnnotationCommand } from 'substance'

  config.addCommand('strong', AnnotationCommand, {nodeType: 'strong'})
  // Disable, when cursor is collapsed
  config.addCommand('strong', AnnotationCommand, {
    nodeType: 'strong'
  })
  ```
*/

export default class AnnotationCommand extends Command {
  constructor (config) {
    super(config)

    if (!this.config.nodeType) {
      throw new Error("'nodeType' is required")
    }
  }

  /**
    Get the type of an annotation.

    @returns {String} The annotation's type.
   */
  getAnnotationType () {
    return this.config.nodeType
  }

  getType () {
    return this.getAnnotationType()
  }

  /**
    Get the annotation's data.

    @returns {Object} The annotation's data.
   */
  getAnnotationData () {
    return {}
  }

  /**
    Checks if command couldn't be executed with current selection.

    @param {Array} annos annotations
    @param {Object} sel selection

    @returns {Boolean} Whether or not command could be executed.
   */
  isDisabled (sel, params) {
    let selectionState = params.selectionState
    let isBlurred = params.editorSession.isBlurred()
    // TODO: Container selections should be valid if the annotation type
    // is a container annotation. Currently we only allow property selections.
    if (isBlurred || !sel || sel.isNull() || !sel.isAttached() || sel.isCustomSelection() ||
        sel.isNodeSelection() || sel.isContainerSelection() || selectionState.isInlineNodeSelection) {
      return true
    }
    return false
  }

  /*
    When cursor is not collapsed tool may be displayed in context (e.g. in an
    overlay)
  */
  showInContext (sel) {
    return !sel.isCollapsed()
  }

  /**
    Checks if new annotations could be created.
    There should be no annotation overlapping, selection must be not collapsed.

    @param {array} annos annotations
    @param {Selection} sel selection
    @param {object} context

    @returns {Boolean} Whether or not annotation could be created.
   */
  // When there's no existing annotation overlapping, we create a new one.
  canCreate (annos, sel, context) {
    // to create an annotation we need an expanded selection
    if (sel.isCollapsed()) return false
    // fine if there is no other anno of this type yet
    if (annos.length === 0) return true
    // otherwise these annos are only allowed to 'touch' the current selection, not overlap.
    for (let anno of annos) {
      if (sel.overlaps(anno.getSelection(), 'strict')) return false
    }
    return true
  }

  /**
    Checks if annotations could be fused.
    There should be more than one annotation overlaped by current selection.

    @param {Array} annos annotations
    @param {Object} sel selection

    @returns {Boolean} Whether or not annotations could be fused.
   */
  canFuse (annos, sel) {
    // When more than one annotation overlaps with the current selection
    return (annos.length >= 2 && !sel.isCollapsed())
  }

  /**
    Checks if annotation could be deleted.
    Cursor or selection must be inside an existing annotation.

    @param {Array} annos annotations
    @param {Object} sel selection

    @returns {Boolean} Whether or not annotation could be deleted.
   */
  canDelete (annos, sel) {
    // When the cursor or selection is inside an existing annotation
    if (annos.length !== 1) return false
    let annoSel = annos[0].getSelection()
    return sel.isInsideOf(annoSel)
  }

  /**
    Checks if annotation could be expanded.
    There should be overlap with only a single annotation,
    selection should be also outside of this annotation.

    @param {Array} annos annotations
    @param {Object} sel selection

    @returns {Boolean} Whether or not annotation could be expanded.
   */
  canExpand (annos, sel) {
    // When there's some overlap with only a single annotation we do an expand
    if (annos.length !== 1) return false
    let annoSel = annos[0].getSelection()
    return sel.overlaps(annoSel, 'strict') && !sel.isInsideOf(annoSel)
  }

  /**
    Checks if annotation could be truncated.
    There should be overlap with only a single annotation,
    selection should also have boundary in common with this annotation.

    @param {Array} annos annotations
    @param {Object} sel selection

    @returns {Boolean} Whether or not annotation could be truncated.
   */
  canTruncate (annos, sel) {
    if (annos.length !== 1) return false
    let annoSel = annos[0].getSelection()

    return (sel.isLeftAlignedWith(annoSel) || sel.isRightAlignedWith(annoSel)) &&
           !sel.contains(annoSel) &&
           !sel.isCollapsed()
  }

  /**
    Gets command state object.

    @param {Object} state.selection the current selection
    @returns {Object} info object with command details.
  */
  getCommandState (params, context) { // eslint-disable-line no-unused
    const sel = params.selection
    // We can skip all checking if a disabled condition is met
    // E.g. we don't allow toggling of property annotations when current
    // selection is a container selection
    if (this.isDisabled(sel, params, context)) {
      return {
        disabled: true
      }
    }
    let annos = this._getAnnotationsForSelection(params)
    let newState = {
      disabled: false,
      active: false,
      mode: null
    }
    if (this.canCreate(annos, sel, context)) {
      newState.mode = 'create'
    } else if (this.canFuse(annos, sel)) {
      newState.mode = 'fuse'
    } else if (this.canTruncate(annos, sel)) {
      newState.active = true
      newState.mode = 'truncate'
    } else if (this.canExpand(annos, sel)) {
      newState.mode = 'expand'
    } else if (this.canDelete(annos, sel)) {
      newState.active = true
      newState.mode = 'delete'
    } else {
      newState.disabled = true
    }
    newState.showInContext = this.showInContext(sel, params, context)

    return newState
  }

  /**
    Execute command and trigger transformation.

    @returns {Object} info object with execution details.
  */
  // Execute command and trigger transformations
  execute (params, context) { // eslint-disable-line no-unused
    let commandState = params.commandState

    if (commandState.disabled) return false
    switch (commandState.mode) {
      case 'create':
        return this.executeCreate(params, context)
      case 'fuse':
        return this.executeFuse(params, context)
      case 'truncate':
        return this.executeTruncate(params, context)
      case 'expand':
        return this.executeExpand(params, context)
      case 'delete':
        return this.executeDelete(params, context)
      default:
        console.warn('Command.execute(): unknown mode', commandState.mode)
        return false
    }
  }

  executeCreate (params, context) {
    const editorSession = params.editorSession
    const annos = this._getAnnotationsForSelection(params, context)
    this._checkPrecondition(params, context, annos, this.canCreate)
    let annoData = this.getAnnotationData()
    annoData.type = this.getAnnotationType()
    let anno
    editorSession.transaction(tx => {
      anno = tx.annotate(annoData)
    })
    return {
      mode: 'create',
      anno: anno
    }
  }

  executeFuse (params, context) {
    let annos = this._getAnnotationsForSelection(params)
    this._checkPrecondition(params, context, annos, this.canFuse)
    this._applyTransform(params, tx => {
      annotationHelpers.fuseAnnotation(tx, annos)
    })
    return {
      mode: 'fuse',
      anno: annos[0]
    }
  }

  executeTruncate (params, context) {
    let annos = this._getAnnotationsForSelection(params)
    let anno = annos[0]
    this._checkPrecondition(params, context, annos, this.canTruncate)
    this._applyTransform(params, tx => {
      annotationHelpers.truncateAnnotation(tx, anno, params.selection)
    })
    return {
      mode: 'truncate',
      anno: anno
    }
  }

  executeExpand (params, context) {
    let annos = this._getAnnotationsForSelection(params)
    let anno = annos[0]
    this._checkPrecondition(params, context, annos, this.canExpand)
    this._applyTransform(params, tx => {
      annotationHelpers.expandAnnotation(tx, anno, params.selection)
    })
    return {
      mode: 'expand',
      anno: anno
    }
  }

  executeDelete (params, context) {
    let annos = this._getAnnotationsForSelection(params)
    let anno = annos[0]
    this._checkPrecondition(params, context, annos, this.canDelete)
    this._applyTransform(params, tx => {
      return tx.delete(anno.id)
    })
    return {
      mode: 'delete',
      annoId: anno.id
    }
  }

  isAnnotationCommand () { return true }

  _checkPrecondition (params, context, annos, checker) {
    let sel = params.selection
    if (!checker.call(this, annos, sel, context)) {
      throw new Error("AnnotationCommand: can't execute command for selection " + sel.toString())
    }
  }

  _getAnnotationsForSelection (params) {
    const selectionState = params.selectionState
    return selectionState.annosByType.get(this.getAnnotationType()) || []
  }

  /**
    Apply an annotation transformation.

    @returns {Object} transformed annotations.
   */
  _applyTransform (params, transformFn) {
    const editorSession = params.editorSession
    const sel = params.selection
    if (sel.isNull()) return
    let result // to store transform result
    editorSession.setSelection(sel)
    editorSession.transaction(function (tx) {
      let out = transformFn(tx, params)
      if (out) result = out.result
    })
    return result
  }
}

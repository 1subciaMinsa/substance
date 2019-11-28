import isArrayEqual from '../util/isArrayEqual'
import isEqual from '../util/isEqual'
import cloneDeep from '../util/cloneDeep'
import _isDefined from '../util/_isDefined'
import { getTextForSelection } from './documentHelpers'
import Coordinate from './Coordinate'
import Selection from './Selection'
import Fragmenter from './Fragmenter'

export default function (DocumentNode) {
  class AbstractAnnotation extends DocumentNode {
    constructor (doc, props) {
      super(doc, _normalizedProps(props))

      // making sure that coordinates are Coordinate instances
      // '_set' does not trigger an operation
      this._set('start', new Coordinate(this.start))
      this._set('end', new Coordinate(this.end))
    }

    /* istanbul ignore start */

    get path () {
      console.warn('DEPRECATED: use annotation.start.path instead')
      return this.start.path
    }

    getPath () {
      return this.start.path
    }

    get startPath () {
      console.warn('DEPRECATED: use annotation.start.path instead.')
      return this.start.path
    }

    set startPath (path) {
      console.warn('DEPRECATED: use annotation.start.path instead.')
      this.start.path = path
    }

    get startOffset () {
      console.warn('DEPRECATED: use annotation.start.offset instead.')
      return this.start.offset
    }

    set startOffset (offset) {
      console.warn('DEPRECATED: use annotation.start.offset instead.')
      this.start.offset = offset
    }

    get endPath () {
      console.warn('DEPRECATED: use annotation.end.path instead.')
      return this.end.path
    }

    set endPath (path) {
      console.warn('DEPRECATED: use annotation.end.path instead.')
      this.end.path = path
    }

    get endOffset () {
      console.warn('DEPRECATED: use annotation.end.offset instead.')
      return this.end.offset
    }

    set endOffset (offset) {
      console.warn('DEPRECATED: use annotation.end.offset instead.')
      this.end.offset = offset
    }

    /* istanbul ignore end */

    /**
      Get the plain text spanned by this annotation.

      @return {String}
    */
    getText () {
      var doc = this.getDocument()
      if (!doc) {
        console.warn('Trying to use a Annotation which is not attached to the document.')
        return ''
      }
      return getTextForSelection(doc, this.getSelection())
    }

    isAnnotation () {
      return true
    }

    /**
      Determines if an annotation can be split e.g., when breaking a node.

      In these cases, a new annotation will be created attached to the created node.

      For certain annotation types,you may want to the annotation truncated
      rather than split, where you need to override this method returning `false`.
    */
    canSplit () {
      return true
    }

    /**
      Provides a selection which has the same range as this annotation.

      @return {model/ContainerSelection}
    */
    getSelection () {
      const doc = this.getDocument()
      // Guard: when this is called while this node has been detached already.
      if (!doc) {
        console.warn('Trying to use a ContainerAnnotation which is not attached to the document.')
        return Selection.nullSelection()
      }
      if (this.isContainerAnnotation()) {
        return doc.createSelection({
          type: 'container',
          containerPath: this.containerPath,
          startPath: this.start.path,
          startOffset: this.start.offset,
          endPath: this.end.path,
          endOffset: this.end.offset
        })
      } else {
        return this.getDocument().createSelection({
          type: 'property',
          path: this.start.path,
          startOffset: this.start.offset,
          endOffset: this.end.offset
        })
      }
    }

    _updateRange (tx, sel) {
      if (sel.isContainerSelection()) {
        // TODO: use coordinate ops
        if (!isEqual(this.start.path, sel.start.path)) {
          tx.set([this.id, 'start', 'path'], sel.start.path)
        }
        if (this.start.offset !== sel.start.offset) {
          tx.set([this.id, 'start', 'offset'], sel.start.offset)
        }
        if (!isEqual(this.end.path, sel.end.path)) {
          tx.set([this.id, 'end', 'path'], sel.end.path)
        }
        if (this.end.offset !== sel.end.offset) {
          tx.set([this.id, 'end', 'offset'], sel.end.offset)
        }
      } else if (sel.isPropertySelection()) {
        if (!isArrayEqual(this.start.path, sel.start.path)) {
          tx.set([this.id, 'path'], sel.start.path)
        }
        // TODO: these should be Coordinate ops
        if (this.start.offset !== sel.start.offset) {
          tx.set([this.id, 'start', 'offset'], sel.start.offset)
        }
        if (this.end.offset !== sel.end.offset) {
          tx.set([this.id, 'end', 'offset'], sel.end.offset)
        }
      } else {
        throw new Error('Invalid selection.')
      }
    }

    mustNotBeSplit () { return false }

    shouldNotBeSplit () { return false }

    _getFragmentWeight () {
      if (this.mustNotBeSplit()) return Fragmenter.MUST_NOT_SPLIT
      if (this.shouldNotBeSplit()) return Fragmenter.SHOULD_NOT_SPLIT
      if (this.getFragmentWeight) return this.getFragmentWeight()
      return Fragmenter.NORMAL
    }

    static isAnnotation () { return true }

    define () {
      return {
        type: '@annotation',
        start: { type: 'coordinate', default: { path: [], offset: 0 } },
        end: { type: 'coordinate', default: { path: [], offset: 0 } }
      }
    }
  }

  return AbstractAnnotation
}

function _normalizedProps (props) {
  // in the beginning we used startPath + endPath etc.
  // now we use coodinates start and end where each coordinate has path + offset
  if (!_isDefined(props.start)) {
    /*
      Instead of
        { path: [...], startOffset: 0, endOffset: 10 }
      use
        { start: { path: [], offset: 0 }, end: { path: [], offset: 10 } }
    */
    // TODO: it would be good if we could get rid of the normalization on the long run
    // console.warn('DEPRECATED: create Annotation with "start" and "end" coordinate instead.')
    let start, end
    if (_isDefined(props.startPath) || _isDefined(props.path)) {
      start = {
        path: props.startPath || props.path,
        offset: props.startOffset
      }
    }
    if (_isDefined(props.endPath) || _isDefined(props.endOffset)) {
      end = {
        path: props.endPath || props.path,
        offset: props.endOffset
      }
    }
    if (start && !end) {
      end = cloneDeep(start)
    }
    if (start) {
      props = Object.assign({}, props)
      delete props.path
      delete props.startPath
      delete props.endPath
      delete props.startOffset
      delete props.endOffset
      props.start = start
      props.end = end
    }
  } else if (_isDefined(props.end) && !props.end.path) {
    props.end.path = props.start.path
  }
  return props
}

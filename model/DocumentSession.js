import EventEmitter from '../util/EventEmitter'
import DocumentChange from './DocumentChange'

export default class DocumentSession extends EventEmitter {
  constructor (doc) {
    super()

    this._document = doc
    this._history = []

    // ATTENTION: we still allow to do operations on the document directly
    // these changes trigger a document:changed event which has to go into the history
    doc.on('document:changed', this._onDocumentChange, this)
  }

  dispose () {
    this._document.off(this)
  }

  getDocument () {
    return this._document
  }

  // EXPERIMENTAL: for certain cases it is useful to store volatile information on nodes
  // Then the data does not need to be disposed when a node is deleted.
  updateNodeStates (tuples, options = {}) {
    // using a pseudo change to get into the existing updating mechanism
    const doc = this._document
    let change = new DocumentChange([], {}, {})
    let info = { action: 'node-state-update' }
    change._extractInformation()
    change.info = info
    for (let [id, state] of tuples) {
      let node = doc.get(id)
      if (!node) continue
      if (!node.state) node.state = {}
      Object.assign(node.state, state)
      change.updated[id] = true
    }
    if (!options.silent) {
      doc._notifyChangeListeners(change, info)
      this.emit('change', change, info)
    }
  }

  _commitChange (change, info) {
    change.timestamp = Date.now()
    this._applyChange(change, info)
  }

  _applyChange (change, info) {
    if (!change) throw new Error('Invalid change')
    const doc = this.getDocument()
    // ATTENTION: the history is updated via document:changed listener
    doc._apply(change)
    doc._notifyChangeListeners(change, info)
    this.emit('change', change, info)
  }

  _onDocumentChange (change) {
    if (change && change.ops.length > 0) {
      this._history.push(change)
    }
  }
}

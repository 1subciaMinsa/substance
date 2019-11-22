import keys from '../util/keys'
import platform from '../util/platform'
import Component from '../dom/Component'

export default class AbstractIsolatedNodeComponent extends Component {
  constructor (...args) {
    super(...args)

    this.name = this.props.node.id
    this._state = { selectionFragment: null }

    this.handleAction('escape', this.escape)
    this.ContentClass = this._getContentClass()

    // NOTE: FF does not allow to navigate contenteditable isles
    const useBlocker = platform.isFF || !this.ContentClass.noBlocker
    this.blockingMode = useBlocker ? 'closed' : 'open'
  }

  getInitialState () {
    const sel = this.getEditorSession().getSelection()
    const selState = this.getEditorSession().getSelectionState()
    return this._deriveStateFromSelectionState(sel, selState)
  }

  getChildContext () {
    return {
      parentSurfaceId: this.getId(),
      isolatedNodeComponent: this,
      // Note: we clear 'surface' here so that we can detect quickly if
      // a child component has a parent surface
      surface: undefined
    }
  }

  didMount () {
    const editorState = this.context.editorSession.getEditorState()
    editorState.addObserver(['selection'], this._onSelectionChanged, this, { stage: 'render' })
  }

  dispose () {
    const editorState = this.context.editorSession.getEditorState()
    editorState.removeObserver(this)
  }

  renderContent ($$, node, options = {}) {
    const ComponentClass = this.ContentClass
    if (!ComponentClass) {
      console.error('Could not resolve a component for type: ' + node.type)
      return $$(this.__elementTag)
    } else {
      const props = Object.assign(this._getContentProps(), options)
      return $$(ComponentClass, props)
    }
  }

  getId () {
    // HACK: doing this lazily here instead of in the constructor.
    // This is because `getInitialState()` already needs this information
    if (!this._id) {
      this._id = this.context.parentSurfaceId + '/' + this.name
    }
    return this._id
  }

  get id () { return this.getId() }

  getMode () {
    return this.state.mode
  }

  escape () {
    // console.log('Escaping from IsolatedNode', this.id)
    this.selectNode()
  }

  isOpen () {
    return this.blockingMode === 'open'
  }

  isClosed () {
    return this.blockingMode === 'closed'
  }

  isNotSelected () {
    return !this.state.mode
  }

  isSelected () {
    return this.state.mode === 'selected'
  }

  isCoSelected () {
    return this.state.mode === 'co-selected'
  }

  isFocused () {
    return this.state.mode === 'focused'
  }

  isCoFocused () {
    return this.state.mode === 'co-focused'
  }

  getParentSurface () {
    return this.context.surface
  }

  getEditorSession () {
    return this.context.editorSession
  }

  getSurfaceManager () {
    return this.context.surfaceManager
  }

  _onSelectionChanged () {
    const editorSession = this.getEditorSession()
    const sel = editorSession.getSelection()
    const selState = editorSession.getSelectionState()
    const newState = this._deriveStateFromSelectionState(sel, selState)
    if (!newState && this.state.mode) {
      this.extendState({ mode: null })
    } else if (newState && newState.mode !== this.state.mode) {
      this.extendState(newState)
    }
  }

  onKeydown (event) {
    // console.log('####', event.keyCode, event.metaKey, event.ctrlKey, event.shiftKey);
    // TODO: while this works when we have an isolated node with input or CE,
    // there is no built-in way of receiving key events in other cases
    // We need a global event listener for keyboard events which dispatches to the current isolated node
    if (event.keyCode === keys.ESCAPE && this.state.mode === 'focused') {
      event.stopPropagation()
      event.preventDefault()
      this.escape()
    }
  }

  _getContentClass () {
    const node = this.props.node
    let ComponentClass
    // first try to get the component registered for this node
    ComponentClass = this.getComponent(node.type, true)
    // otherwise just use an empty Component
    if (!ComponentClass) ComponentClass = Component

    return ComponentClass
  }

  _getContentProps () {
    return {
      disabled: this.props.disabled,
      node: this.props.node,
      isolatedNodeState: this.state.mode,
      focused: (this.state.mode === 'focused')
    }
  }

  _getSurfaceForSelection (sel, selState) {
    // HACK: deriving additional information from the selection and
    // storing it into selState
    // TODO: this should be part of the regular selection state reducer
    let surface = selState.surface
    if (!surface) {
      if (sel && sel.surfaceId) {
        const surfaceManager = this.getSurfaceManager()
        surface = surfaceManager.getSurface(sel.surfaceId)
      } else {
        surface = null
      }
      selState.surface = surface
    }
    return surface
  }

  // compute the list of surfaces and isolated nodes
  // for the given selection
  _getIsolatedNodes (sel, selState) {
    // HACK: deriving additional information from the selection and
    // storing it into selState
    // TODO: this should be part of the regular selection state reducer
    let isolatedNodes = selState.isolatedNodes
    if (!isolatedNodes) {
      isolatedNodes = []
      if (sel && sel.surfaceId) {
        const surfaceManager = this.getSurfaceManager()
        const surface = surfaceManager.getSurface(sel.surfaceId)
        if (surface) {
          isolatedNodes = surface.getComponentPath().filter(comp => comp._isAbstractIsolatedNodeComponent)
        }
      }
      selState.isolatedNodes = isolatedNodes
    }
    return isolatedNodes
  }

  _shouldConsumeEvent (event) {
    const comp = Component.unwrap(event.currentTarget)
    const isolatedNodeComponent = this._getIsolatedNode(comp)
    return (isolatedNodeComponent === this)
  }

  _getIsolatedNode (comp) {
    if (comp._isAbstractIsolatedNodeComponent) {
      return this
    } else if (comp.context.isolatedNodeComponent) {
      return comp.context.isolatedNodeComponent
    } else if (comp.context.surface) {
      return comp.context.surface.context.isolatedNodeComponent
    }
  }

  get _isAbstractIsolatedNodeComponent () { return true }
}

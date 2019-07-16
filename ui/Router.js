import DefaultDOMElement from '../dom/DefaultDOMElement'
import EventEmitter from '../util/EventEmitter'
import forEach from '../util/forEach'
import isNil from '../util/isNil'

export default class Router extends EventEmitter {
  constructor (...args) {
    super(...args)
    this.__isStarted__ = false
  }

  /*
    Starts listening for hash-changes
  */
  start () {
    let window = DefaultDOMElement.getBrowserWindow()
    window.on('hashchange', this._onHashChange, this)
    this.__isStarted__ = true
  }

  /*
    Reads out the current route
  */
  readRoute () {
    if (!this.__isStarted__) this.start()
    return this.parseRoute(this.getRouteString())
  }

  /*
    Writes out a given route as a string url
  */
  writeRoute (route, opts = {}) {
    let routeString = this.stringifyRoute(route)
    if (!routeString) {
      this.clearRoute(opts)
    } else {
      this._writeRoute(routeString, opts)
    }
  }

  dispose () {
    let window = DefaultDOMElement.getBrowserWindow()
    window.off(this)
  }

  /*
    Maps a route URL to a route object

    @abstract
    @param String route content of the URL's hash fragment
  */
  parseRoute (routeString) {
    return Router.routeStringToObject(routeString)
  }

  /*
    Maps a route object to a route URL

    This can be overriden by an application specific router.

    @abstract
  */
  stringifyRoute (route) {
    return Router.objectToRouteString(route)
  }

  getRouteString () {
    let window = DefaultDOMElement.getBrowserWindow().getNativeElement()
    return window.location.hash.slice(1)
  }

  _writeRoute (route, opts) {
    let window = DefaultDOMElement.getBrowserWindow().getNativeElement()
    this.__isSaving__ = true
    try {
      if (opts.replace) {
        window.history.replaceState({}, '', `#${route}`)
      } else {
        window.history.pushState({}, '', `#${route}`)
      }
    } finally {
      this.__isSaving__ = false
    }
  }

  clearRoute (opts = {}) {
    this._writeRoute('', opts)
  }

  _onHashChange () {
    // console.log('_onHashChange');
    if (this.__isSaving__) {
      return
    }
    if (this.__isLoading__) {
      console.error('FIXME: router is currently applying a route.')
      return
    }
    this.__isLoading__ = true
    try {
      let routeString = this.getRouteString()
      let route = this.parseRoute(routeString)
      this.emit('route:changed', route)
    } finally {
      this.__isLoading__ = false
    }
  }

  static objectToRouteString (obj) {
    let frags = []
    forEach(obj, (val, key) => {
      if (!isNil(val)) {
        frags.push(`${key}=${val}`)
      }
    })
    return frags.join(',')
  }

  static routeStringToObject (routeStr) {
    let obj = {}
    // Empty route maps to empty route object
    if (!routeStr) return obj
    let params = routeStr.split(',')
    for (let param of params) {
      if (param.indexOf('=') >= 0) {
        let tuple = param.split('=')
        if (tuple.length !== 2) {
          throw new Error('Illegal route.')
        }
        obj[tuple[0].trim()] = tuple[1].trim()
      } else {
        obj[param] = true
      }
    }
    return obj
  }
}

import isNumber from '../util/isNumber'

export default class XPathNode {
  constructor (id, type) {
    this.id = id
    this.type = type
    this.prev = null
    this.property = null
    this.pos = null
  }

  toJSON () {
    const data = { id: this.id, type: this.type }
    if (this.property) data.property = this.property
    if (isNumber(this.pos)) data.pos = this.pos
    return data
  }

  toArray () {
    const result = [this.toJSON()]
    let current = this
    while (current.prev) {
      current = current.prev
      result.unshift(current.toJSON())
    }
    return result
  }
}

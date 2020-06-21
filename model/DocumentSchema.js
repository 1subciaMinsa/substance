import Schema from './Schema'
import DocumentNode from './DocumentNode'
import TextNode from './TextNode'
import Container from './Container'
import PropertyAnnotation from './PropertyAnnotation'
import ContainerAnnotation from './ContainerAnnotation'

export default class DocumentSchema extends Schema {
  constructor (schemaSpec) {
    super(schemaSpec)
    /* istanbul ignore next */
    if (!schemaSpec.DocumentClass) {
      throw new Error('DocumentClass is mandatory')
    }
    Object.assign(this, schemaSpec)
  }

  getDocumentClass () {
    return this.DocumentClass
  }

  /*
    @override
  */
  getBuiltIns () {
    return [DocumentNode, TextNode, PropertyAnnotation, Container, ContainerAnnotation]
  }
}

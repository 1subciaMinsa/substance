import isArray from '../util/isArray'
import uuid from '../util/uuid'

// We need to disambiguate ids if the target document
// contains a node with the same id.
// Unfortunately, this can be difficult in some cases,
// e.g. other nodes that have a reference to the re-named node
// We only fix annotations for now.
export default function _transferWithDisambiguatedIds (sourceDoc, targetDoc, id, visited, mappedTypes) {
  if (visited[id]) throw new Error('FIXME: dont call me twice')
  visited[id] = id
  const node = sourceDoc.get(id, 'strict')
  const nodeData = node.toJSON()
  const oldId = id
  let newId
  if (targetDoc.contains(id)) {
    // change the node id
    newId = uuid(node.type)
    nodeData.id = newId
  }
  const annotationIndex = sourceDoc.getIndex('annotations')
  const nodeSchema = node.getSchema()
  // collect annotations so that we can create them in the target doc afterwards
  const annos = []
  // now we iterate all properties of the node schema,
  // to see if there are owned references, which need to be created recursively,
  // and if there are text properties, where annotations could be attached to
  for (const prop of nodeSchema) {
    const name = prop.name
    if (name === 'id' || name === 'type') continue
    // Look for references to owned children and create recursively
    if (prop.isReference() && prop.isOwned()) {
      // NOTE: we need to recurse directly here, so that we can
      // update renamed references
      if (prop.isArray()) {
        const ids = nodeData[name]
        nodeData[name] = _transferArrayOfReferences(sourceDoc, targetDoc, ids, visited, mappedTypes)
      } else {
        const id = nodeData[name]
        if (!visited[id]) {
          nodeData[name] = _transferWithDisambiguatedIds(sourceDoc, targetDoc, id, visited, mappedTypes)
        }
      }
    // Look for text properties and create annotations in the target doc accordingly
    } else if (prop.isText()) {
      // This is really difficult in general
      // as we don't know where to look for.
      // TODO: ATM we only look for annotations.
      // We should also consider anchors / container-annotations
      // Probably we need a different approach, may
      const _annos = annotationIndex.get([oldId, prop.name])
      // TODO: avoid altering the original node directly
      for (let i = 0; i < _annos.length; i++) {
        const anno = _annos[i]
        if (anno.start.path[0] === oldId && newId) {
          anno.start.path[0] = newId
        }
        if (anno.end.path[0] === oldId && newId) {
          anno.end.path[0] = newId
        }
        annos.push(anno)
      }
    }
  }
  // replace types: this is used e.g. to map to the defaultTextType of a container
  if (mappedTypes[nodeData.type]) nodeData.type = mappedTypes[nodeData.type]
  targetDoc.create(nodeData)
  for (let i = 0; i < annos.length; i++) {
    _transferWithDisambiguatedIds(sourceDoc, targetDoc, annos[i].id, visited, mappedTypes)
  }
  return nodeData.id
}

function _transferArrayOfReferences (sourceDoc, targetDoc, arr, visited, mappedTypes) {
  const result = arr.slice(0)
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i]
    // multi-dimensional
    if (isArray(val)) {
      result[i] = _transferArrayOfReferences(sourceDoc, targetDoc, val, visited, mappedTypes)
    } else {
      const id = val
      if (id && !visited[id]) {
        result[i] = _transferWithDisambiguatedIds(sourceDoc, targetDoc, id, visited, mappedTypes)
      }
    }
  }
  return result
}

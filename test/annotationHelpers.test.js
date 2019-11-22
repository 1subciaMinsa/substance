import { test } from 'substance-test'
import { annotationHelpers, EditingInterface } from 'substance'
import createTestArticle from './shared/createTestArticle'
import simple from './fixture/simple'

const truncateAnnotation = annotationHelpers.truncateAnnotation
const expandAnnotation = annotationHelpers.expandAnnotation
const fuseAnnotation = annotationHelpers.fuseAnnotation

test('annotationHelpers: truncate property annotation with a given property selection', function (t) {
  const doc = fixture(A1)
  // Put cursor inside an the existing annotation
  const sel = doc.createSelection({
    type: 'property',
    path: ['p1', 'content'],
    startOffset: 1,
    endOffset: 2
  })
  const anno = doc.get('a1')
  truncateAnnotation(doc, anno, sel)
  t.equal(anno.start.offset, 0, 'startOffset should be 0')
  t.equal(anno.end.offset, 1, 'endOffset should have changed from 2 to 1')
  t.end()
})

test('annotationHelpers: truncate container annotation with a given property selection', function (t) {
  const doc = fixture(CA1)
  const sel = doc.createSelection({
    type: 'property',
    path: ['p3', 'content'],
    startOffset: 1,
    endOffset: 4
  })
  const anno = doc.get('ca1')
  truncateAnnotation(doc, anno, sel)
  t.equal(anno.end.offset, 1, 'endOffset should be 1')
  t.end()
})

test('annotationHelpers: truncate container annotation with a given container selection', function (t) {
  const doc = fixture(CA1)
  const sel = doc.createSelection({
    type: 'container',
    containerPath: ['body', 'nodes'],
    startPath: ['p2', 'content'],
    startOffset: 1,
    endPath: ['p3', 'content'],
    endOffset: 4
  })
  const anno = doc.get('ca1')
  truncateAnnotation(doc, anno, sel)
  t.deepEqual(anno.end.path, ['p2', 'content'], 'endPath should be p2.content')
  t.equal(anno.end.offset, 1, 'endOffset should be 1')
  t.end()
})

test('annotationHelpers: expand-right of property annotation for a given property selection', function (t) {
  const doc = fixture(A1)
  const sel = doc.createSelection({
    type: 'property',
    path: ['p1', 'content'],
    startOffset: 1,
    endOffset: 6
  })
  const anno = doc.get('a1')
  expandAnnotation(doc, anno, sel)
  t.equal(anno.start.offset, 0, 'startOffset should be 0')
  t.equal(anno.end.offset, 6, 'endOffset should have changed from 2 to 1')
  t.end()
})

test('annotationHelpers: expand container annotation for a given property selection (right expansion)', function (t) {
  const doc = fixture(CA1)
  const sel = doc.createSelection({
    type: 'property',
    path: ['p3', 'content'],
    startOffset: 1,
    endOffset: 6
  })
  const anno = doc.get('ca1')
  expandAnnotation(doc, anno, sel)
  t.equal(anno.end.offset, 6, 'endOffset should be 6')
  t.end()
})

test('annotationHelpers: expand container annotation for a given container selection (expand right)', function (t) {
  const doc = fixture(CA1)
  const sel = doc.createSelection({
    type: 'container',
    containerPath: ['body', 'nodes'],
    startPath: ['p2', 'content'],
    startOffset: 1,
    endPath: ['p3', 'content'],
    endOffset: 6
  })
  const anno = doc.get('ca1')
  expandAnnotation(doc, anno, sel)
  t.deepEqual(anno.end.path, ['p3', 'content'], 'endPath should be p2.content')
  t.equal(anno.end.offset, 6, 'endOffset should be 6')
  t.end()
})

test('annotationHelpers: fuse two property annotations for a given property selection', function (t) {
  const tx = new EditingInterface(fixture(A1, A2))
  // Put selection so that it touches both strong annotations
  tx.setSelection({
    type: 'property',
    path: ['p1', 'content'],
    startOffset: 1,
    endOffset: 6
  })
  const a1 = tx.get('a1')
  const a2 = tx.get('a2')
  fuseAnnotation(tx, [a1, a2])
  t.isNil(tx.get('a2'), 'a2 should be gone.')
  t.equal(a1.start.offset, 0, 'startOffset should be 0')
  t.equal(a1.end.offset, 6, 'endOffset should be 6')
  t.end()
})

test('annotationHelpers: fuse two conatiner annotations for a given property selection', function (t) {
  const tx = new EditingInterface(fixture(CA1, CA2))
  tx.setSelection({
    type: 'property',
    path: ['p3', 'content'],
    startOffset: 3,
    endOffset: 8
  })
  const ca1 = tx.get('ca1')
  const ca2 = tx.get('ca2')
  fuseAnnotation(tx, [ca1, ca2])
  t.isNil(tx.get('ca2'), 'ca2 should be gone.')
  t.deepEqual(ca1.start.path, ['p1', 'content'], 'start pPath should be p1.content')
  t.equal(ca1.start.offset, 5, 'start offset should be 5')
  t.deepEqual(ca1.end.path, ['p4', 'content'], 'end path should be p1.content')
  t.equal(ca1.end.offset, 9, 'end offset should be 9')
  t.end()
})

function fixture (...fns) {
  const doc = createTestArticle(simple)
  fns.forEach((fn) => {
    fn(doc)
  })
  return doc
}

function A1 (doc) {
  doc.create({
    type: 'strong',
    id: 'a1',
    start: {
      path: ['p1', 'content'],
      offset: 0
    },
    end: {
      offset: 2
    }
  })
}

function A2 (doc) {
  doc.create({
    id: 'a2',
    type: 'strong',
    start: {
      path: ['p1', 'content'],
      offset: 4
    },
    end: {
      offset: 6
    }
  })
}

function CA1 (doc) {
  doc.create({
    type: 'test-container-anno',
    id: 'ca1',
    start: {
      path: ['p1', 'content'],
      offset: 5
    },
    end: {
      path: ['p3', 'content'],
      offset: 4
    },
    containerPath: ['body', 'nodes']
  })
}

function CA2 (doc) {
  doc.create({
    type: 'test-container-anno',
    id: 'ca2',
    containerPath: ['body', 'nodes'],
    start: {
      path: ['p3', 'content'],
      offset: 7
    },
    end: {
      path: ['p4', 'content'],
      offset: 9
    }
  })
}

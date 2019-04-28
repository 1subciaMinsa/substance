import { test } from 'substance-test'
import setupEditor from './shared/setupEditor'
import simple from './fixture/simple'

test('CommandManager: Command state changing with selection', (t) => {
  let { editorSession } = setupEditor(t, simple)
  editorSession.setSelection({
    type: 'property',
    path: ['p1', 'content'],
    startOffset: 3,
    containerPath: ['body', 'nodes']
  })

  let commandStates = editorSession.getCommandStates()
  t.equal(commandStates.paragraph.active, true, 'Paragraph should be active for collapsed selection')
  t.equal(commandStates.paragraph.disabled, false, 'Paragraph should not be disabled for collapsed selection')
  t.equal(commandStates.strong.active, false, 'Strong should not be active for collapsed selection')
  t.equal(commandStates.strong.disabled, true, 'Strong should be disabled for collapsed selection')

  editorSession.setSelection({
    type: 'property',
    path: ['p1', 'content'],
    startOffset: 3,
    endOffset: 4,
    containerPath: ['body', 'nodes']
  })

  commandStates = editorSession.getCommandStates()
  t.equal(commandStates.strong.active, false, 'Strong should not be active for non-collapsed selection without strong annotation')
  t.equal(commandStates.strong.disabled, false, 'Strong should not be disabled for non-collapsed selection')

  t.end()
})

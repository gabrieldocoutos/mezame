<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { EditorView, keymap, lineNumbers, highlightActiveLineGutter,
           highlightSpecialChars, dropCursor, highlightActiveLine } from '@codemirror/view'
  import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
  import { foldGutter, indentOnInput, syntaxHighlighting,
           defaultHighlightStyle, bracketMatching, HighlightStyle } from '@codemirror/language'
  import { closeBrackets, autocompletion,
           closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
  import { highlightSelectionMatches, searchKeymap } from '@codemirror/search'
  import { EditorState } from '@codemirror/state'
  import { markdown } from '@codemirror/lang-markdown'
  import { tags as t } from '@lezer/highlight'

  interface Props {
    value: string
    onchange?: (value: string) => void
  }

  let { value = $bindable(''), onchange }: Props = $props()

  let el: HTMLDivElement
  let view: EditorView

  const mezameTheme = EditorView.theme(
    {
      '&': {
        color: '#d4d4d4',
        background: '#131313',
        height: '100%',
      },
      '.cm-editor': { height: '100%' },
      '.cm-scroller': {
        fontFamily: "'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
        fontSize: '13px',
        lineHeight: '1.6',
        overflow: 'auto',
      },
      '.cm-content': { padding: '14px 0', caretColor: '#4ec9b0' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#4ec9b0' },
      '&.cm-focused .cm-cursor': { borderLeftColor: '#4ec9b0' },
      '&.cm-focused': { outline: 'none' },

      // Active line
      '.cm-activeLine': { backgroundColor: '#1a1a1a' },
      '.cm-activeLineGutter': { backgroundColor: '#1a1a1a' },

      // Gutter
      '.cm-gutters': {
        background: '#131313',
        color: '#4a4a4a',
        border: 'none',
        borderRight: '1px solid #2a2a2a',
      },
      '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 8px', minWidth: '32px' },
      '.cm-foldGutter .cm-gutterElement': { padding: '0 2px' },

      // Matching brackets
      '&.cm-focused .cm-matchingBracket': {
        background: '#264f78',
        color: '#d4d4d4',
      },

      // Search match
      '.cm-searchMatch': { backgroundColor: '#3a3a2a' },
      '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#4a4a1a' },

      // Tooltip
      '.cm-tooltip': {
        background: '#1e1e1e',
        border: '1px solid #3d3d3d',
        color: '#d4d4d4',
      },
      '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
        background: '#1e2a29',
        color: '#4ec9b0',
      },
    },
  )

  const mezameHighlight = syntaxHighlighting(
    HighlightStyle.define([
      { tag: t.heading1, color: '#4ec9b0', fontWeight: 'bold', fontSize: '1.15em' },
      { tag: t.heading2, color: '#4ec9b0', fontWeight: 'bold' },
      { tag: t.heading3, color: '#4ec9b0', fontWeight: 'bold' },
      { tag: [t.heading4, t.heading5, t.heading6], color: '#4ec9b0' },
      { tag: t.emphasis, fontStyle: 'italic', color: '#d4d4d4' },
      { tag: t.strong, fontWeight: 'bold', color: '#d4d4d4' },
      { tag: t.strikethrough, textDecoration: 'line-through', color: '#6a6a6a' },
      { tag: t.link, color: '#569cd6', textDecoration: 'underline' },
      { tag: t.url, color: '#569cd6' },
      { tag: t.monospace, color: '#ce9178', fontFamily: 'inherit' },
      { tag: t.quote, color: '#9a9a9a', fontStyle: 'italic' },
      { tag: t.list, color: '#4ec9b0' },
      { tag: t.processingInstruction, color: '#6a9955' },
      { tag: t.keyword, color: '#569cd6' },
      { tag: [t.name, t.deleted, t.character, t.macroName], color: '#9cdcfe' },
      { tag: [t.propertyName], color: '#9cdcfe' },
      { tag: [t.function(t.variableName), t.labelName], color: '#dcdcaa' },
      { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: '#4fc1ff' },
      { tag: [t.definition(t.name), t.separator], color: '#d4d4d4' },
      { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.self, t.namespace], color: '#4ec9b0' },
      { tag: [t.operator, t.operatorKeyword, t.escape, t.regexp, t.special(t.string)], color: '#d7ba7d' },
      { tag: [t.meta, t.comment], color: '#6a9955', fontStyle: 'italic' },
      { tag: [t.atom, t.bool, t.special(t.variableName)], color: '#569cd6' },
      { tag: [t.string, t.inserted], color: '#ce9178' },
      { tag: t.invalid, color: '#f44747' },
    ])
  )

  // basicSetup minus drawSelection — we use native browser selection instead.
  // drawSelection intercepts and suppresses ::selection with Prec.highest, making
  // it impossible to style reliably. Native selection just works.
  const setup = [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    keymap.of([
      indentWithTab,
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...completionKeymap,
    ]),
  ]

  onMount(() => {
    view = new EditorView({
      doc: value,
      extensions: [
        setup,
        markdown(),
        mezameTheme,
        mezameHighlight,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newVal = update.state.doc.toString()
            value = newVal
            onchange?.(newVal)
          }
        }),
      ],
      parent: el,
    })
  })

  $effect(() => {
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      })
    }
  })

  onDestroy(() => {
    view?.destroy()
  })
</script>

<div bind:this={el} class="editor-host"></div>

<style>
  .editor-host {
    height: 100%;
    overflow: hidden;
  }

  .editor-host :global(.cm-editor) {
    height: 100%;
  }

  .editor-host :global(.cm-scroller) {
    overflow: auto;
  }

  /* Native browser selection — fully global to avoid Svelte scoping issues
     with ::selection. Explicit color ensures no teal-on-teal contrast problem. */
  :global(.cm-content ::selection) {
    background-color: #2a6b57 !important;
    color: #d4d4d4 !important;
  }
</style>

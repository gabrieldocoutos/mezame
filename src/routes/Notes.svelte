<script lang="ts">
  import { onMount } from 'svelte'
  import { invoke } from '@tauri-apps/api/core'
  import { open, save } from '@tauri-apps/plugin-dialog'
  import { FolderOpen, FilePlus, Save, X } from 'lucide-svelte'
  import Editor from './Editor.svelte'

  interface Props {
    isDirty?: boolean
    isActive?: boolean
  }

  let { isDirty = $bindable(false), isActive = false }: Props = $props()

  let recentFiles = $state<string[]>([])
  let currentFile = $state<string | null>(null)
  let content = $state('')
  let savedContent = $state('')

  $effect(() => {
    isDirty = content !== savedContent
  })

  function basename(path: string): string {
    return path.split('/').pop() ?? path
  }

  async function loadRecents() {
    recentFiles = await invoke<string[]>('get_recent_files')
  }

  async function openFile(path: string) {
    if (isDirty) {
      const ok = confirm(`Save changes to ${basename(currentFile!)} before opening another file?`)
      if (ok) await saveCurrentFile()
    }
    try {
      const text = await invoke<string>('read_file', { path })
      currentFile = path
      content = text
      savedContent = text
      await invoke('add_recent_file', { path })
      await loadRecents()
    } catch (e) {
      alert(`Could not open file: ${e}`)
    }
  }

  async function handleOpen() {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    })
    if (selected && typeof selected === 'string') {
      await openFile(selected)
    }
  }

  async function handleNew() {
    const path = await save({
      filters: [{ name: 'Markdown', extensions: ['md'] }],
      defaultPath: 'untitled.md',
    })
    if (!path) return
    try {
      await invoke('write_file', { path, content: '' })
      await openFile(path)
    } catch (e) {
      alert(`Could not create file: ${e}`)
    }
  }

  async function saveCurrentFile() {
    if (!currentFile) return
    try {
      await invoke('write_file', { path: currentFile, content })
      savedContent = content
    } catch (e) {
      alert(`Could not save file: ${e}`)
    }
  }

  async function handleRemoveRecent(path: string, e: MouseEvent) {
    e.stopPropagation()
    await invoke('remove_recent_file', { path })
    await loadRecents()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!isActive) return
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault()
      saveCurrentFile()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
      e.preventDefault()
      handleNew()
    }
  }

  onMount(() => {
    loadRecents()
  })
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="notes-container">
  <div class="sidebar">
    <div class="sidebar-actions">
      <button class="icon-btn" title="Open file (⌘O)" onclick={handleOpen}>
        <FolderOpen size={14} />
        <span>Open</span>
      </button>
      <button class="icon-btn" title="New file (⌘N)" onclick={handleNew}>
        <FilePlus size={14} />
        <span>New</span>
      </button>
    </div>

    <div class="sidebar-label">Recent</div>

    {#if recentFiles.length === 0}
      <div class="empty-state">No recent files.<br />Open or create a .md file.</div>
    {:else}
      <ul class="file-list">
        {#each recentFiles as path}
          <li
            class="file-item"
            class:active={path === currentFile}
            title={path}
            onclick={() => openFile(path)}
          >
            <span class="file-name">{basename(path)}</span>
            <button
              class="remove-btn"
              title="Remove from recents"
              onclick={(e) => handleRemoveRecent(path, e)}
            >
              <X size={11} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="editor-area">
    <div class="editor-toolbar">
      <span class="filename">
        {#if currentFile}
          {basename(currentFile)}{isDirty ? ' •' : ''}
        {:else}
          <span class="no-file">No file open</span>
        {/if}
      </span>
      <button
        class="save-btn"
        disabled={!isDirty || !currentFile}
        onclick={saveCurrentFile}
        title="Save (⌘S)"
      >
        <Save size={13} />
        Save
      </button>
    </div>

    {#if currentFile}
      <div class="editor-wrapper">
        <Editor bind:value={content} />
      </div>
    {:else}
      <div class="placeholder">
        <p>Open a .md file to start editing</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .notes-container {
    display: flex;
    height: 100%;
    background: #131313;
    color: #d4d4d4;
    font-family: 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace;
    overflow: hidden;
  }

  /* Sidebar */
  .sidebar {
    width: 200px;
    min-width: 200px;
    border-right: 1px solid #2a2a2a;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .sidebar-actions {
    display: flex;
    gap: 4px;
    padding: 10px 8px 6px;
    border-bottom: 1px solid #2a2a2a;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 8px;
    background: #1e1e1e;
    border: 1px solid #3d3d3d;
    border-radius: 4px;
    color: #d4d4d4;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    flex: 1;
    justify-content: center;
  }

  .icon-btn:hover {
    background: #2a2a2a;
    border-color: #4ec9b0;
    color: #4ec9b0;
  }

  .sidebar-label {
    padding: 8px 10px 4px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6a6a6a;
  }

  .empty-state {
    padding: 10px;
    font-size: 11px;
    color: #555;
    line-height: 1.6;
  }

  .file-list {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
  }

  .file-item {
    display: flex;
    align-items: center;
    padding: 5px 6px 5px 10px;
    cursor: pointer;
    font-size: 12px;
    color: #b0b0b0;
    gap: 4px;
  }

  .file-item:hover {
    background: #1e1e1e;
    color: #d4d4d4;
  }

  .file-item.active {
    background: #1e2a29;
    color: #4ec9b0;
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove-btn {
    background: none;
    border: none;
    color: #555;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .remove-btn:hover {
    color: #e06c75;
    background: #2a1a1a;
  }

  /* Editor area */
  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-bottom: 1px solid #2a2a2a;
    height: 34px;
    flex-shrink: 0;
  }

  .filename {
    font-size: 12px;
    color: #9a9a9a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .no-file {
    color: #555;
  }

  .save-btn {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    background: #1e2a29;
    border: 1px solid #4ec9b0;
    border-radius: 4px;
    color: #4ec9b0;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .save-btn:hover:not(:disabled) {
    background: #264040;
  }

  .save-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .editor-wrapper {
    flex: 1;
    overflow: hidden;
  }

  .placeholder {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #444;
    font-size: 13px;
  }
</style>

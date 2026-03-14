<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { open, save } from "@tauri-apps/plugin-dialog"; 

  let content = $state("");
  let filePath = $state<string | null>(null);
  let savedContent = $state("");

  const isDirty = $derived(content !== savedContent);
  const title = $derived(
    (filePath ? filePath.split("/").at(-1) : "Untitled") + (isDirty ? " •" : "")
  );

  async function newFile() {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    content = "";
    savedContent = "";
    filePath = null;
  }

  async function openFile() {
    if (isDirty && !confirm("Discard unsaved changes?")) return;
    const selected = await open({ multiple: false, directory: false });
    if (!selected) return;
    const path = typeof selected === "string" ? selected : selected[0];
    try {
      const text = await invoke<string>("read_file", { path });
      content = text;
      savedContent = text;
      filePath = path;
    } catch (e) {
      alert("Could not open file: " + e);
    }
  }

  async function saveFile() {
    if (!filePath) return saveAs();
    try {
      await invoke("write_file", { path: filePath, content });
      savedContent = content;
    } catch (e) {
      alert("Could not save file: " + e);
    }
  }

  async function saveAs() {
    const path = await save({
      defaultPath: filePath ?? "untitled.txt",
      filters: [{ name: "Text", extensions: ["txt", "md", "json", "js", "ts", "rs", "*"] }],
    });
    if (!path) return;
    filePath = path;
    await saveFile();
  }

  function onKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (e.shiftKey) saveAs();
      else saveFile();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "o") {
      e.preventDefault();
      openFile();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "n") {
      e.preventDefault();
      newFile();
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="app">
  <header>
    <span class="filename">{title}</span>
    <div class="actions">
      <button onclick={newFile}>New</button>
      <button onclick={openFile}>Open</button>
      <button onclick={saveFile} disabled={!isDirty}>Save</button>
      <button onclick={saveAs}>Save As</button>
    </div>
  </header>

  <textarea
    bind:value={content}
    spellcheck="false"
    autocomplete="off"
    autocorrect="off"
    autocapitalize="off"
    placeholder="Start typing..."
  ></textarea>
</div>

<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    overflow: hidden;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: "Menlo", "Monaco", "Courier New", monospace;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: #2d2d2d;
    border-bottom: 1px solid #3d3d3d;
    flex-shrink: 0;
    user-select: none;
  }

  .filename {
    font-size: 13px;
    color: #aaa;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60%;
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  button {
    background: #3a3a3a;
    color: #d4d4d4;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 3px 10px;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
  }

  button:hover:not(:disabled) {
    background: #4a4a4a;
  }

  button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  textarea {
    flex: 1;
    width: 100%;
    padding: 16px 20px;
    background: #1e1e1e;
    color: #d4d4d4;
    border: none;
    outline: none;
    resize: none;
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    font-size: 14px;
    line-height: 1.6;
    tab-size: 2;
  }

  textarea::placeholder {
    color: #555;
  }
</style>

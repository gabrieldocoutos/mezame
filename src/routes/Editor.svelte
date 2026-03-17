<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";

  let { isDirty = $bindable(false), isActive }: { isDirty?: boolean; isActive: boolean } = $props();

  let content = $state("");
  let savedContent = $state("");

  $effect(() => {
    isDirty = content !== savedContent;
  });

  $effect(() => {
    invoke<string>("load_notes").then((text) => {
      content = text;
      savedContent = text;
    });
  });

  async function save() {
    try {
      await invoke("save_notes", { content });
      savedContent = content;
    } catch (e) {
      alert("Could not save: " + e);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!isActive) return;
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      save();
    }
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<textarea
  bind:value={content}
  spellcheck="false"
  autocomplete="off"
  placeholder="Start typing..."
  onkeydown={(e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      content = content.slice(0, start) + '    ' + content.slice(end);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      });
    }
  }}
></textarea>

<style>
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

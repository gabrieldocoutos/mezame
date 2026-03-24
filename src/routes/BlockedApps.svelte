<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { X } from "lucide-svelte";
  let {
    apps,
    onSave,
  }: {
    apps: string[];
    onSave: (apps: string[]) => Promise<void>;
  } = $props();

  let local = $state<string[]>([]);
  let installedApps = $state<string[]>([]);
  let newApp = $state("");
  let error = $state<string | null>(null);
  let showSuggestions = $state(false);

  $effect(() => {
    local = [...apps];
  });

  $effect(() => {
    invoke<string[]>("list_installed_apps").then((list) => {
      installedApps = list;
    });
  });

  let filtered = $derived(
    newApp.trim()
      ? installedApps
          .filter(
            (a) =>
              a.toLowerCase().includes(newApp.trim().toLowerCase()) &&
              !local.includes(a),
          )
          .slice(0, 8)
      : [],
  );

  async function add(name?: string) {
    const app = (name ?? newApp).trim();
    if (!app || local.includes(app)) return;
    local = [...local, app];
    newApp = "";
    showSuggestions = false;
    error = null;
    try {
      await onSave(local);
    } catch (e: unknown) {
      error = "Could not save: " + String(e);
    }
  }

  async function remove(app: string) {
    local = local.filter((a) => a !== app);
    error = null;
    try {
      await onSave(local);
    } catch (e: unknown) {
      error = "Could not save: " + String(e);
    }
  }

  function onInputKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") add();
  }
</script>

<div class="blocked">
  <div class="add-row">
    <div class="input-wrap">
      <input
        bind:value={newApp}
        onkeydown={onInputKeyDown}
        onfocus={() => (showSuggestions = true)}
        onblur={() => setTimeout(() => (showSuggestions = false), 150)}
        placeholder="App name"
        spellcheck="false"
        autocomplete="off"
      />
      {#if showSuggestions && filtered.length > 0}
        <ul class="suggestions">
          {#each filtered as suggestion (suggestion)}
            <li>
              <button
                class="suggestion-btn"
                onmousedown={() => add(suggestion)}
              >
                {suggestion}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    <button onclick={() => add()} disabled={!newApp.trim()}>Add</button>
  </div>

  {#if local.length === 0}
    <p class="empty">No blocked apps.</p>
  {:else}
    <ul>
      {#each local as app (app)}
        <li>
          <span class="app-name">{app}</span>
          <button class="remove" onclick={() => remove(app)}
            ><X size={12} /></button
          >
        </li>
      {/each}
    </ul>
  {/if}

  {#if error}
    <div class="footer">
      <span class="error">{error}</span>
    </div>
  {/if}
</div>

<style>
  .blocked {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: "Menlo", "Monaco", "Courier New", monospace;
    overflow: hidden;
  }

  .add-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .input-wrap {
    flex: 1;
    position: relative;
  }

  input {
    width: 100%;
    background: #2d2d2d;
    color: #d4d4d4;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 5px 10px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }

  input:focus {
    border-color: #4ec9b0;
  }

  input::placeholder {
    color: #555;
  }

  .suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #2d2d2d;
    border: 1px solid #555;
    border-top: none;
    border-radius: 0 0 4px 4px;
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
  }

  .suggestion-btn {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: none;
    border-radius: 0;
    color: #d4d4d4;
    padding: 5px 10px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
  }

  .suggestion-btn:hover {
    background: #3a3a3a;
    color: #4ec9b0;
  }

  ul {
    list-style: none;
    overflow-y: auto;
    flex: 1;
    margin: 0;
  }

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 13px;
  }

  li:hover {
    background: #2a2a2a;
  }

  .app-name {
    color: #a8e6cf;
  }

  .empty {
    font-size: 13px;
    color: #555;
    margin: 8px 0;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 16px;
    padding-top: 12px;
    padding-right: 84px;
    border-top: 1px solid #3d3d3d;
    flex-shrink: 0;
  }

  .error {
    font-size: 12px;
    color: #f48771;
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

  .remove {
    background: transparent;
    border-color: transparent;
    color: #666;
    padding: 2px 6px;
    font-size: 11px;
  }

  .remove:hover:not(:disabled) {
    background: #3a2020;
    border-color: #6b3030;
    color: #f48771;
  }
</style>

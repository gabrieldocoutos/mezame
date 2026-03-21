<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";

  type Reminder = { id: string; title: string };

  let reminders = $state<Reminder[]>([]);
  let completing = $state(new Set<string>());
  let loading = $state(false);
  let error = $state('');
  let newTitle = $state('');
  let creating = $state(false);

  async function load() {
    loading = true;
    error = '';
    try {
      reminders = await invoke<Reminder[]>("get_reminders");
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }

  async function create() {
    const title = newTitle.trim();
    if (!title) return;
    creating = true;
    try {
      await invoke("create_reminder", { title });
      newTitle = '';
      await load();
    } catch (e) {
      error = String(e);
    } finally {
      creating = false;
    }
  }

  async function complete(id: string) {
    completing = new Set([...completing, id]);
    try {
      await invoke("complete_reminder", { id });
      reminders = reminders.filter(r => r.id !== id);
    } catch (e) {
      error = String(e);
      completing = new Set([...completing].filter(x => x !== id));
    }
  }

  $effect(() => { load(); });
</script>

<div class="reminders">
  <form class="add-form" onsubmit={(e) => { e.preventDefault(); create(); }}>
    <input
      class="add-input"
      type="text"
      placeholder="New reminder…"
      bind:value={newTitle}
      disabled={creating}
    />
    <button type="submit" class="add-btn" disabled={creating || !newTitle.trim()}>Add</button>
    <button type="button" class="refresh-btn" onclick={load} disabled={loading} title="Refresh">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.65 2.35A8 8 0 1 0 15 8h-2a6 6 0 1 1-1.05-3.38L10 6h5V1l-1.35 1.35Z" fill="currentColor"/>
      </svg>
    </button>
  </form>

  <div class="toolbar">
    <span class="count">{loading ? '…' : `${reminders.length} reminder${reminders.length === 1 ? '' : 's'}`}</span>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {:else if loading}
    <p class="hint">Loading…</p>
  {:else if reminders.length === 0}
    <p class="hint">No pending reminders.</p>
  {:else}
    <ul>
      {#each reminders as reminder (reminder.id)}
        <li
          class:completing={completing.has(reminder.id)}
          onclick={() => complete(reminder.id)}
          title="Click to mark as done"
        >
          <span class="circle">{completing.has(reminder.id) ? '✓' : '○'}</span>
          {reminder.title}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .reminders {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 12px 16px;
    overflow: hidden;
  }

  .add-form {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
    flex-shrink: 0;
  }

  .add-input {
    flex: 1;
    background: #1e1e1e;
    border: 1px solid #555;
    border-radius: 4px;
    color: #d4d4d4;
    font-family: inherit;
    font-size: 12px;
    padding: 5px 8px;
    outline: none;
  }

  .add-input:focus {
    border-color: #4ec9b0;
  }

  .add-btn {
    padding: 5px 12px;
    font-size: 12px;
    border: none;
    background: #4ec9b0;
    color: #fff;
    border-radius: 6px;
  }

  .add-btn:hover:not(:disabled) {
    background: #3dab96;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: none;
    color: #666;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .refresh-btn:hover:not(:disabled) {
    background: #2a2a2a;
    color: #aaa;
  }

  .refresh-btn:disabled {
    opacity: 0.3;
  }

  .toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    flex-shrink: 0;
  }

  .count {
    font-size: 11px;
    color: #888;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    flex: 1;
  }

  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    font-size: 13px;
    color: #d4d4d4;
    border-bottom: 1px solid #2d2d2d;
    cursor: pointer;
    transition: background 0.1s;
  }

  li:hover {
    background: #2a2a2a;
  }

  li.completing {
    opacity: 0.45;
    text-decoration: line-through;
    pointer-events: none;
  }

  .circle {
    color: #4ec9b0;
    flex-shrink: 0;
    width: 12px;
  }

  .hint {
    font-size: 12px;
    color: #666;
    text-align: center;
    margin-top: 40px;
  }

  .error {
    font-size: 11px;
    color: #f48771;
    margin-top: 12px;
    white-space: pre-wrap;
  }
</style>

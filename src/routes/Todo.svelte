<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { Circle, Check, ChevronDown, ChevronRight, X } from "lucide-svelte";

  type Reminder = { id: number; title: string };

  let reminders = $state<Reminder[]>([]);
  let completed = $state<Reminder[]>([]);
  let completing = $state(new Set<number>());
  let deleting = $state(new Set<number>());
  let loading = $state(false);
  let error = $state('');
  let newTitle = $state('');
  let creating = $state(false);
  let showCompleted = $state(true);

  async function load() {
    loading = true;
    error = '';
    try {
      const [active, done] = await Promise.all([
        invoke<Reminder[]>("get_reminders"),
        invoke<Reminder[]>("get_completed_reminders"),
      ]);
      reminders = active;
      completed = done;
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

  async function complete(id: number) {
    completing = new Set([...completing, id]);
    const item = reminders.find(r => r.id === id);
    try {
      await invoke("complete_reminder", { id });
      reminders = reminders.filter(r => r.id !== id);
      if (item) completed = [item, ...completed];
    } catch (e) {
      error = String(e);
    } finally {
      completing = new Set([...completing].filter(x => x !== id));
    }
  }

  async function remove(id: number) {
    deleting = new Set([...deleting, id]);
    try {
      await invoke("delete_reminder", { id });
      completed = completed.filter(r => r.id !== id);
    } catch (e) {
      error = String(e);
    } finally {
      deleting = new Set([...deleting].filter(x => x !== id));
    }
  }

  async function clearAll() {
    try {
      await invoke("clear_completed_reminders");
      completed = [];
    } catch (e) {
      error = String(e);
    }
  }

  $effect(() => { load(); });
</script>

<div class="todo">
  <form class="add-form" onsubmit={(e) => { e.preventDefault(); create(); }}>
    <input
      class="add-input"
      type="text"
      placeholder="New todo…"
      bind:value={newTitle}
      disabled={creating}
    />
    <button type="submit" class="add-btn" disabled={creating || !newTitle.trim()}>Add</button>
  </form>

  <div class="toolbar">
    <span class="count">{loading ? '…' : `${reminders.length} todo${reminders.length === 1 ? '' : 's'}`}</span>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {:else if loading}
    <p class="hint">Loading…</p>
  {:else}
    <div class="lists">
      {#if reminders.length === 0}
        <p class="hint">No pending todos.</p>
      {:else}
        <ul>
          {#each reminders as reminder (reminder.id)}
            <li
              class:completing={completing.has(reminder.id)}
              onclick={() => complete(reminder.id)}
              title="Click to mark as done"
            >
              <span class="circle">{#if completing.has(reminder.id)}<Check size={12} />{:else}<Circle size={12} />{/if}</span>
              {reminder.title}
            </li>
          {/each}
        </ul>
      {/if}

      {#if completed.length > 0}
        <div class="completed-bar">
          <button class="completed-header" onclick={() => showCompleted = !showCompleted}>
            <span class="chevron">{#if showCompleted}<ChevronDown size={12} />{:else}<ChevronRight size={12} />{/if}</span>
            Completed ({completed.length})
          </button>
          <button class="clear-all-btn" onclick={clearAll}>Clear all</button>
        </div>

        {#if showCompleted}
          <ul class="completed-list">
            {#each completed as item (item.id)}
              <li class="completed-item" class:removing={deleting.has(item.id)}>
                <span class="check-icon"><Check size={12} /></span>
                <span class="completed-title">{item.title}</span>
                <button
                  class="delete-btn"
                  onclick={() => remove(item.id)}
                  disabled={deleting.has(item.id)}
                  title="Delete permanently"
                ><X size={11} /></button>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .todo {
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

  .lists {
    overflow-y: auto;
    flex: 1;
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
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

  /* Completed section */
  .completed-bar {
    display: flex;
    align-items: center;
    border-top: 1px solid #2d2d2d;
    margin-top: 4px;
  }

  .completed-header {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    background: none;
    border: none;
    color: #666;
    font-size: 11px;
    font-family: inherit;
    padding: 8px 10px;
    cursor: pointer;
  }

  .completed-header:hover {
    color: #888;
    background: none;
  }

  .clear-all-btn {
    background: none;
    border: none;
    color: #555;
    font-size: 10px;
    font-family: inherit;
    padding: 4px 10px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .clear-all-btn:hover {
    color: #f48771;
    background: none;
  }

  .chevron {
    display: flex;
    align-items: center;
    color: #555;
  }

  .completed-item {
    cursor: default;
    color: #555;
    text-decoration: line-through;
  }

  .completed-item:hover {
    background: #252525;
  }

  .check-icon {
    color: #555;
    flex-shrink: 0;
    width: 12px;
  }

  .completed-title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .delete-btn {
    background: none;
    border: none;
    color: #555;
    padding: 2px;
    cursor: pointer;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.1s, color 0.1s;
    flex-shrink: 0;
  }

  .completed-item:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: #f48771;
    background: #3a2020;
  }

  .delete-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .completed-item.removing {
    opacity: 0.3;
    pointer-events: none;
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

<script lang="ts">
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { onDestroy } from 'svelte';

  const ROUND_SIZE = 4;

  let mode = $state<'work' | 'break'>('work');
  let remaining = $state(25 * 60);
  let running = $state(false);
  let completedSessions = $state(0);

  const minutes = $derived(String(Math.floor(remaining / 60)).padStart(2, '0'));
  const seconds = $derived(String(remaining % 60).padStart(2, '0'));
  const doneInRound = $derived(completedSessions % ROUND_SIZE);

  type Payload = { mode: string; remaining: number; running: boolean; completed_sessions: number };

  function applyState(s: Payload) {
    mode = s.mode as 'work' | 'break';
    remaining = s.remaining;
    running = s.running;
    completedSessions = s.completed_sessions;
  }

  invoke<Payload>('pomodoro_get_state').then(applyState);

  const unlisten = listen<Payload>('pomodoro-tick', ({ payload }) => applyState(payload));

  onDestroy(async () => { (await unlisten)(); });

  function toggle() { invoke('pomodoro_toggle'); }
  function reset() { invoke('pomodoro_reset'); }
  function skipBreak() { invoke('pomodoro_skip_break'); }
</script>

<div class="pomodoro">
  <div class="mode">{mode === 'work' ? 'WORK' : 'BREAK'}</div>
  <div class="timer">{minutes}:{seconds}</div>
  <div class="controls">
    <button onclick={toggle}>{running ? 'Pause' : 'Start'}</button>
    <button onclick={reset}>Reset</button>
    {#if mode === 'break'}
      <button onclick={skipBreak}>Skip</button>
    {/if}
  </div>
  <div class="sessions">
    <span>Round {Math.floor(completedSessions / ROUND_SIZE) + 1}</span>
    <span class="dots">
      {#each Array(ROUND_SIZE) as _, i}
        <span class:filled={i < doneInRound}>◦</span>
      {/each}
    </span>
    <span>{completedSessions} done</span>
  </div>
</div>

<style>
  .pomodoro {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 28px;
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: "Menlo", "Monaco", "Courier New", monospace;
  }

  .mode {
    font-size: 12px;
    letter-spacing: 0.25em;
    color: #569cd6;
  }

  .timer {
    font-size: 80px;
    font-weight: 200;
    letter-spacing: 0.04em;
    color: #e8e8e8;
    line-height: 1;
  }

  .controls {
    display: flex;
    gap: 10px;
  }

  button {
    background: #3a3a3a;
    color: #d4d4d4;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 6px 20px;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    min-width: 80px;
  }

  button:hover {
    background: #4a4a4a;
  }

  .sessions {
    font-size: 12px;
    color: #666;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .dots {
    display: flex;
    gap: 4px;
    font-size: 18px;
  }

  .dots span {
    color: #444;
    transition: color 0.3s;
  }

  .dots span.filled {
    color: #569cd6;
  }
</style>

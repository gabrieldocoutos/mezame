<script lang="ts">
  import { check } from "@tauri-apps/plugin-updater";
  import { relaunch } from "@tauri-apps/plugin-process";

  let update = $state<Awaited<ReturnType<typeof check>> | null>(null);
  let installing = $state(false);
  let dismissed = $state(false);

  $effect(() => {
    check().then((u) => {
      if (u) update = u;
    }).catch(() => {
      // No update available or endpoint unreachable — silently ignore
    });
  });

  async function install() {
    if (!update) return;
    installing = true;
    try {
      await update.downloadAndInstall();
      await relaunch();
    } catch {
      installing = false;
    }
  }
</script>

{#if update && !dismissed}
  <div class="modal-backdrop" role="presentation" onclick={() => (dismissed = true)}>
    <div class="modal" role="dialog" onclick={(e) => e.stopPropagation()}>
      <p class="modal-title">Update available</p>
      <p class="modal-sub">Version {update.version} is ready to install.</p>
      <div class="modal-actions">
        <button onclick={() => (dismissed = true)} disabled={installing}>Later</button>
        <button class="modal-confirm" onclick={install} disabled={installing}>
          {installing ? "Installing..." : "Update Now"}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: #0008;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    background: #2d2d2d;
    border: 1px solid #3d3d3d;
    border-radius: 8px;
    padding: 20px;
    width: 280px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 8px 32px #0008;
    font-family: "Inter", sans-serif;
  }

  .modal-title {
    font-family: "Space Grotesk", "Inter", sans-serif;
    font-size: 13px;
    color: #d4d4d4;
    font-weight: 600;
  }

  .modal-sub {
    font-size: 11px;
    color: #888;
    line-height: 1.4;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
  }

  .modal-actions button {
    background: #3d3d3d;
    border: 1px solid #555;
    border-radius: 4px;
    color: #d4d4d4;
    font-family: inherit;
    font-size: 12px;
    padding: 5px 14px;
    cursor: pointer;
  }

  .modal-confirm {
    background: #4ec9b0;
    border-color: #4ec9b0;
    color: #fff;
  }

  .modal-confirm:hover:not(:disabled) {
    background: #3dab96;
  }
</style>

<script>
  let { node, onchange } = $props();
  let open = $state(node.data.open || false);

  function toggle() {
    open = !open;
    node.data.open = open;
    onchange();
  }
</script>

<div class="collapse-node">
  <button class="collapse-header" onclick={toggle}>
    <span>{open ? '▾' : '▸'}</span>
    <span>{node.text || '摺疊區塊'}</span>
  </button>
  {#if open}
    <textarea
      placeholder="輸入內容..."
      value={node.data.text || ''}
      oninput={(e) => { node.data.text = e.target.value; onchange(); }}
      rows="3"
    ></textarea>
  {/if}
</div>

<style>
  .collapse-node {
    margin: 6px 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .collapse-header {
    width: 100%;
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 8px 12px;
    background: var(--bg-secondary);
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    text-align: left;
  }
  textarea {
    width: 100%;
    border: none;
    padding: 10px 12px;
    font-size: 13px;
    background: var(--bg);
    color: var(--text);
    resize: vertical;
    outline: none;
  }
</style>
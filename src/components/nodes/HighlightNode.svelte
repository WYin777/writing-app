<script>
  let { node, onchange } = $props();

  const COLORS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa'];

  function setColor(c) {
    node.data.color = c;
    onchange();
  }
</script>

<div class="highlight-node">
  <input
    type="text"
    placeholder="高亮文字..."
    value={node.data.text || node.text || ''}
    oninput={(e) => { node.data.text = e.target.value; node.text = e.target.value; onchange(); }}
    style="background: {node.data.color || '#fef08a'}"
  />
  <div class="colors">
    {#each COLORS as c}
      <button
        class="swatch"
        class:selected={node.data.color === c}
        style="background: {c}"
        onclick={() => setColor(c)}
      ></button>
    {/each}
  </div>
</div>

<style>
  .highlight-node {
    margin: 6px 0;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  input {
    flex: 1;
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    color: #111827;
    outline: none;
  }
  .colors {
    display: flex;
    gap: 3px;
  }
  .swatch {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid var(--border);
  }
  .swatch.selected {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
</style>
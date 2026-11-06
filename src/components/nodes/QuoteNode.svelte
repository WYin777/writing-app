<script>
  let { node, onchange } = $props();
</script>

<div class="quote-node">
  <textarea
    placeholder="輸入引用內容..."
    value={node.data.text || node.text || ''}
    oninput={(e) => { node.data.text = e.target.value; onchange(); }}
    rows="2"
  ></textarea>
  <input
    type="text"
    class="source"
    placeholder="出處（可選）"
    value={node.data.source || ''}
    oninput={(e) => { node.data.source = e.target.value; onchange(); }}
  />
</div>

<style>
  .quote-node {
    margin: 8px 0;
    padding: 8px 12px;
    border-left: 3px solid var(--accent);
    background: var(--bg-secondary);
    border-radius: 0 var(--radius) var(--radius) 0;
  }
  textarea {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 14px;
    font-style: italic;
    color: var(--text);
    resize: vertical;
    outline: none;
    line-height: 1.5;
  }
  .source {
    width: 100%;
    border: none;
    background: transparent;
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
    outline: none;
  }
</style>
<script>
  let { node, onchange } = $props();

  function handleInput(e) {
    node.data.code = e.target.value;
    onchange();
  }
</script>

<div class="code-node">
  <div class="code-header">
    <input
      type="text"
      class="lang-input"
      placeholder="語言（如 js、python）"
      value={node.data.language || ''}
      oninput={(e) => { node.data.language = e.target.value; onchange(); }}
    />
  </div>
  <textarea
    placeholder="輸入程式碼..."
    value={node.data.code || ''}
    oninput={handleInput}
    rows="5"
    spellcheck="false"
  ></textarea>
</div>

<style>
  .code-node {
    margin: 8px 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-secondary);
  }
  .code-header {
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }
  .lang-input {
    border: none;
    background: transparent;
    font-size: 12px;
    color: var(--text-secondary);
    outline: none;
    width: 100%;
  }
  textarea {
    width: 100%;
    border: none;
    padding: 10px;
    background: transparent;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 13px;
    color: var(--text);
    resize: vertical;
    outline: none;
    line-height: 1.5;
  }
</style>
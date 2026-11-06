<script>
  let { node, onchange } = $props();

  let rows = $state(node.data.rows || 2);
  let cols = $state(node.data.cols || 3);
  let cells = $state(node.data.cells || []);

  function ensureCells() {
    const newCells = [];
    for (let r = 0; r < rows; r++) {
      newCells.push([]);
      for (let c = 0; c < cols; c++) {
        newCells[r][c] = cells[r]?.[c] || '';
      }
    }
    cells = newCells;
    node.data.cells = newCells;
    node.data.rows = rows;
    node.data.cols = cols;
    onchange();
  }

  $effect(() => {
    if (!node.data.cells) {
      node.data.rows = rows;
      node.data.cols = cols;
      ensureCells();
    }
  });

  function updateCell(r, c, value) {
    cells[r][c] = value;
    node.data.cells = cells;
    onchange();
  }

  function addRow() {
    rows++;
    ensureCells();
  }

  function addCol() {
    cols++;
    ensureCells();
  }

  function removeRow() {
    if (rows > 1) { rows--; ensureCells(); }
  }

  function removeCol() {
    if (cols > 1) { cols--; ensureCells(); }
  }
</script>

<div class="table-node">
  <div class="table-controls">
    <button onclick={addRow}>＋列</button>
    <button onclick={removeRow}>－列</button>
    <button onclick={addCol}>＋欄</button>
    <button onclick={removeCol}>－欄</button>
    <span class="info">{rows} × {cols}</span>
  </div>
  <table>
    <tbody>
      {#each Array(rows) as _, r}
        <tr>
          {#each Array(cols) as _, c}
            <td>
              <input
                type="text"
                value={cells[r]?.[c] || ''}
                oninput={(e) => updateCell(r, c, e.target.value)}
                placeholder="..."
              />
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .table-node {
    margin: 8px 0;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .table-controls {
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    align-items: center;
  }
  .table-controls button {
    padding: 3px 8px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--text);
  }
  .table-controls button:hover {
    background: var(--bg-hover);
  }
  .info {
    margin-left: auto;
    color: var(--text-secondary);
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  td {
    border: 1px solid var(--border);
    padding: 0;
  }
  td input {
    width: 100%;
    padding: 6px 8px;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: var(--text);
  }
  td input:focus {
    background: var(--bg-hover);
  }
</style>
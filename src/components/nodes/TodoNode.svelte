<script>
  let { node, onchange } = $props();

  function toggle() {
    node.data.checked = !node.data.checked;
    onchange();
  }
</script>

<div class="todo-node">
  <input type="checkbox" checked={node.data.checked || false} onchange={toggle} />
  <span class:done={node.data.checked}>{node.text || '待辦事項'}</span>
</div>

<style>
  .todo-node {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: 14px;
  }
  .todo-node input {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }
  .done {
    text-decoration: line-through;
    color: var(--text-secondary);
  }
</style>
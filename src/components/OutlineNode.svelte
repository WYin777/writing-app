<script>
  import ImageNode from './nodes/ImageNode.svelte';
  import TodoNode from './nodes/TodoNode.svelte';
  import CodeNode from './nodes/CodeNode.svelte';
  import TableNode from './nodes/TableNode.svelte';
  import QuoteNode from './nodes/QuoteNode.svelte';
  import DividerNode from './nodes/DividerNode.svelte';
  import HighlightNode from './nodes/HighlightNode.svelte';
  import CollapseNode from './nodes/CollapseNode.svelte';

  let {
    node,
    level = 0,
    outline,
    onchange,
    ondelete,
    onmove
  } = $props();

  let editing = $state(false);
  let editText = $state(node.text);
  let editingNote = $state(false);
  let noteText = $state(node.note || '');
  let showColorPicker = $state(false);
  let showMenu = $state(false);
  let inputEl = $state(null);
  let noteEl = $state(null);
  let dragOverPos = $state(null); // 'before' | 'inside' | 'after'

  const COLORS = [
    { name: '預設', value: null },
    { name: '紅', value: '#ef4444' },
    { name: '橙', value: '#f59e0b' },
    { name: '綠', value: '#10b981' },
    { name: '藍', value: '#3b82f6' },
    { name: '紫', value: '#8b5cf6' },
    { name: '灰', value: '#6b7280' }
  ];

  function startEdit() {
    editing = true;
    editText = node.text;
    setTimeout(() => inputEl?.focus(), 0);
  }

  function saveEdit() {
    editing = false;
    if (editText !== node.text) {
      node.text = editText;
      onchange();
    }
  }

  function startNoteEdit() {
    editingNote = true;
    noteText = node.note || '';
    setTimeout(() => noteEl?.focus(), 0);
  }

  function saveNote() {
    editingNote = false;
    if (noteText !== node.note) {
      node.note = noteText;
      onchange();
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
      onchange('addSibling', node.id);
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      saveEdit();
      startNoteEdit();
    } else if (e.key === 'Escape') {
      editing = false;
      editText = node.text;
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveEdit();
      onchange(e.shiftKey ? 'outdent' : 'indent', node.id);
    } else if (e.key === 'Backspace' && editText === '' && !node.children?.length) {
      e.preventDefault();
      ondelete(node.id);
    }
  }

  function handleNoteKeydown(e) {
    if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
      e.preventDefault();
      saveNote();
    }
  }

  function toggleCollapse() {
    node.collapsed = !node.collapsed;
    onchange();
  }

  function setColor(color) {
    node.color = color;
    showColorPicker = false;
    onchange();
  }

  function toggleBold() {
    node.bold = !node.bold;
    onchange();
  }

  function insertType(type) {
    onchange('insert', node.id, type);
    showMenu = false;
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    if (y < h * 0.3) dragOverPos = 'before';
    else if (y > h * 0.7) dragOverPos = 'after';
    else dragOverPos = 'inside';
    e.dataTransfer.dropEffect = 'move';
  }

  function handleDragLeave() {
    dragOverPos = null;
  }

  function handleDrop(e) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    const pos = dragOverPos;
    dragOverPos = null;
    if (!draggedId || draggedId === node.id) return;
    onmove(draggedId, node.id, pos);
  }

  function renderText() {
    if (node.type === 'text') return node.text || '（空白節點，點擊編輯）';
    if (node.type === 'todo') return node.text || '（待辦事項）';
    if (node.type === 'image') return '🖼 圖片';
    if (node.type === 'code') return '💻 程式碼';
    if (node.type === 'table') return '📊 表格';
    if (node.type === 'quote') return '❝ 引用';
    if (node.type === 'divider') return '――― 分隔線';
    if (node.type === 'highlight') return '🖍 高亮';
    if (node.type === 'collapse') return '📦 摺疊區塊';
    return node.text;
  }
</script>

<div class="node">
  <div
    class="node-row"
    class:drag-before={dragOverPos === 'before'}
    class:drag-inside={dragOverPos === 'inside'}
    class:drag-after={dragOverPos === 'after'}
    style="padding-left: {level * 20}px"
    draggable="true"
    ondragstart={handleDragStart}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <div class="controls">
      {#if node.children?.length}
        <button class="arrow" onclick={toggleCollapse} tabindex="-1">
          {node.collapsed ? '▸' : '▾'}
        </button>
      {:else}
        <span class="arrow-placeholder"></span>
      {/if}
      <span class="handle" title="拖曳排序">⋮⋮</span>
    </div>

    <div
      class="content"
      style="color: {node.color || 'inherit'}; font-weight: {node.bold ? '600' : 'normal'}"
    >
      {#if node.type === 'image'}
        <ImageNode {node} onchange={() => onchange()} />
      {:else if node.type === 'todo'}
        <TodoNode {node} onchange={() => onchange()} />
      {:else if node.type === 'code'}
        <CodeNode {node} onchange={() => onchange()} />
      {:else if node.type === 'table'}
        <TableNode {node} onchange={() => onchange()} />
      {:else if node.type === 'quote'}
        <QuoteNode {node} onchange={() => onchange()} />
      {:else if node.type === 'divider'}
        <DividerNode />
      {:else if node.type === 'highlight'}
        <HighlightNode {node} onchange={() => onchange()} />
      {:else if node.type === 'collapse'}
        <CollapseNode {node} onchange={() => onchange()} />
      {:else if editing}
        <input
          bind:this={inputEl}
          bind:value={editText}
          onblur={saveEdit}
          onkeydown={handleKeydown}
          class="edit-input"
        />
      {:else}
        <span
          class="text"
          onclick={startEdit}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && startEdit()}
        >
          {renderText()}
        </span>
      {/if}
    </div>

    <div class="actions">
      <button onclick={() => showColorPicker = !showColorPicker} title="顏色">🎨</button>
      <button onclick={toggleBold} title="粗體" class:active={node.bold}>B</button>
      <button onclick={() => showMenu = !showMenu} title="插入">＋</button>
      <button onclick={startNoteEdit} title="備註">💬</button>
      <button onclick={() => ondelete(node.id)} title="刪除">🗑</button>
    </div>
  </div>

  {#if showColorPicker}
    <div class="color-picker" style="margin-left: {level * 20 + 40}px">
      {#each COLORS as c}
        <button
          class="color-swatch"
          class:selected={node.color === c.value}
          style="background: {c.value || 'transparent'}"
          onclick={() => setColor(c.value)}
          title={c.name}
        ></button>
      {/each}
    </div>
  {/if}

  {#if showMenu}
    <div class="insert-menu" style="margin-left: {level * 20 + 40}px">
      <button onclick={() => insertType('image')}>🖼 圖片</button>
      <button onclick={() => insertType('todo')}>☑ 待辦</button>
      <button onclick={() => insertType('code')}>💻 程式碼</button>
      <button onclick={() => insertType('table')}>📊 表格</button>
      <button onclick={() => insertType('quote')}>❝ 引用</button>
      <button onclick={() => insertType('divider')}>――― 分隔線</button>
      <button onclick={() => insertType('highlight')}>🖍 高亮</button>
      <button onclick={() => insertType('collapse')}>📦 摺疊區塊</button>
    </div>
  {/if}

  {#if editingNote}
    <div class="note-edit" style="margin-left: {level * 20 + 40}px">
      <textarea
        bind:this={noteEl}
        bind:value={noteText}
        onblur={saveNote}
        onkeydown={handleNoteKeydown}
        placeholder="備註（Esc 或 Enter 儲存）"
        rows="2"
      ></textarea>
    </div>
  {:else if node.note}
    <div
      class="note"
      style="margin-left: {level * 20 + 40}px"
      onclick={startNoteEdit}
      role="button"
      tabindex="0"
      onkeydown={(e) => e.key === 'Enter' && startNoteEdit()}
    >
      💬 {node.note}
    </div>
  {/if}

  {#if !node.collapsed && node.children?.length}
    {#each node.children as child (child.id)}
      <svelte:self
        node={child}
        level={level + 1}
        {outline}
        {onchange}
        {ondelete}
        {onmove}
      />
    {/each}
  {/if}
</div>

<style>
  .node {
    position: relative;
  }

  .node-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 4px;
    min-height: 32px;
    border-top: 2px solid transparent;
    border-bottom: 2px solid transparent;
  }

  .node-row:hover {
    background: var(--bg-hover);
  }

  .node-row.drag-before {
    border-top-color: var(--accent);
  }

  .node-row.drag-after {
    border-bottom-color: var(--accent);
  }

  .node-row.drag-inside {
    background: var(--bg-hover);
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .arrow {
    width: 18px;
    height: 18px;
    font-size: 10px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .arrow:hover {
    color: var(--text);
  }

  .arrow-placeholder {
    width: 18px;
    display: inline-block;
  }

  .handle {
    color: var(--text-secondary);
    cursor: grab;
    font-size: 11px;
    opacity: 0;
    width: 12px;
  }

  .node-row:hover .handle {
    opacity: 0.6;
  }

  .content {
    flex: 1;
    min-width: 0;
    font-size: 14px;
    line-height: 1.5;
  }

  .text {
    display: block;
    cursor: text;
    padding: 2px 0;
    word-break: break-word;
  }

  .edit-input {
    width: 100%;
    border: 1px solid var(--accent);
    border-radius: 3px;
    padding: 2px 6px;
    background: var(--bg);
    outline: none;
    font-size: 14px;
    color: var(--text);
  }

  .actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    flex-shrink: 0;
  }

  .node-row:hover .actions {
    opacity: 1;
  }

  .actions button {
    width: 24px;
    height: 24px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .actions button:hover {
    background: var(--bg);
    color: var(--text);
  }

  .actions button.active {
    background: var(--bg);
    color: var(--accent);
    font-weight: 700;
  }

  .color-picker,
  .insert-menu {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 6px 10px;
    margin: 4px 0 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    max-width: 320px;
  }

  .color-swatch {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid var(--border);
  }

  .color-swatch.selected {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }

  .insert-menu button {
    padding: 4px 8px;
    font-size: 12px;
    border-radius: 3px;
    color: var(--text);
  }

  .insert-menu button:hover {
    background: var(--bg-hover);
  }

  .note {
    font-size: 12px;
    color: var(--text-secondary);
    padding: 4px 0 4px 4px;
    font-style: italic;
    cursor: text;
    border-left: 2px solid var(--border);
    margin-bottom: 4px;
  }

  .note:hover {
    color: var(--text);
    border-left-color: var(--accent);
  }

  .note-edit {
    margin: 4px 0 4px;
  }

  .note-edit textarea {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--accent);
    border-radius: 3px;
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    resize: vertical;
    outline: none;
    font-family: inherit;
  }
</style>
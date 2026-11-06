<script>
  import ChoiceEditor from './ChoiceEditor.svelte';
  import { makeOutlineNode } from '../../lib/db.js';

  let {
    node,
    level = 0,
    characters = [],
    allNodes = [],
    onchange,
    ondelete,
    onmove
  } = $props();

  let collapsed = $state(node.collapsed || false);
  let showTypes = $state(false);
  let dragOver = $state(false);

  const KINDS = [
    { value: 'scene', label: '場景', icon: '🎬' },
    { value: 'dialogue', label: '對話', icon: '💬' },
    { value: 'choice', label: '選擇', icon: '🔀' },
    { value: 'event', label: '事件', icon: '⚡' },
    { value: 'ending', label: '結局', icon: '🏁' }
  ];

  function kindInfo(k) {
    return KINDS.find(x => x.value === k) || KINDS[0];
  }

  function updateText(e) {
    node.text = e.target.value;
    onchange();
  }

  function updateDesc(e) {
    node.data = { ...(node.data || {}), description: e.target.value };
    onchange();
  }

  function setKind(kind) {
    node.nodeKind = kind;
    showTypes = false;
    if (kind === 'choice' && (!node.choices || node.choices.length === 0)) {
      node.choices = [];
    }
    onchange();
  }

  function updateChoices(choices) {
    node.choices = choices;
    onchange();
  }

  function toggleCollapse() {
    collapsed = !collapsed;
    node.collapsed = collapsed;
    onchange();
  }

  function addChild() {
    if (!node.children) node.children = [];
    node.children.push(makeOutlineNode({ nodeKind: 'scene', text: '新場景' }));
    node.collapsed = false;
    collapsed = false;
    onchange();
  }

  function updateEnding(e) {
    node.endingTag = e.target.value;
    onchange();
  }

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    dragOver = false;
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== node.id) {
      onmove(draggedId, node.id);
    }
  }

  const info = $derived(kindInfo(node.nodeKind));
</script>

<div
  class="game-node"
  class:drag-over={dragOver}
  style="margin-left: {level * 16}px"
  draggable="true"
  ondragstart={handleDragStart}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
>
  <div class="node-header" style="border-left-color: {node.color || 'var(--accent)'}">
    <button class="collapse-btn" onclick={toggleCollapse}>
      {collapsed ? '▸' : '▾'}
    </button>

    <div class="kind-select">
      <button class="kind-btn" onclick={() => showTypes = !showTypes}>
        {info.icon} {info.label} ▾
      </button>
      {#if showTypes}
        <div class="kind-menu">
          {#each KINDS as k}
            <button
              class:active={node.nodeKind === k.value}
              onclick={() => setKind(k.value)}
            >{k.icon} {k.label}</button>
          {/each}
        </div>
      {/if}
    </div>

    <input
      class="node-title"
      value={node.text || ''}
      placeholder="節點名稱..."
      oninput={updateText}
    />

    <div class="node-actions">
      <button onclick={addChild} title="新增子節點">＋</button>
      <button onclick={() => ondelete(node.id)} title="刪除">🗑</button>
    </div>
  </div>

  {#if !collapsed}
    <div class="node-body">
      <textarea
        class="desc"
        placeholder="描述、對白、旁白..."
        value={node.data?.description || ''}
        oninput={updateDesc}
        rows="2"
      ></textarea>

      {#if node.nodeKind === 'choice'}
        <div class="section">
          <div class="section-title">🔀 選擇分歧</div>
          <ChoiceEditor
            choices={node.choices || []}
            {characters}
            {allNodes}
            onchange={updateChoices}
          />
        </div>
      {/if}

      {#if node.nodeKind === 'ending'}
        <div class="section">
          <div class="section-title">🏁 結局標記</div>
          <input
            class="ending-input"
            value={node.endingTag || ''}
            placeholder="結局名稱（如：好結局、隱藏結局）"
            oninput={updateEnding}
          />
        </div>
      {/if}
    </div>

    {#if node.children?.length}
      <div class="children">
        {#each node.children as child (child.id)}
          <svelte:self
            node={child}
            level={level + 1}
            {characters}
            {allNodes}
            {onchange}
            {ondelete}
            {onmove}
          />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .game-node {
    margin-bottom: 4px;
  }

  .game-node.drag-over {
    outline: 2px dashed var(--accent);
    border-radius: var(--radius);
  }

  .node-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius);
  }

  .collapse-btn {
    font-size: 10px;
    color: var(--text-secondary);
    width: 16px;
  }

  .kind-select {
    position: relative;
  }

  .kind-btn {
    padding: 3px 8px;
    font-size: 11px;
    border-radius: 3px;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    white-space: nowrap;
  }

  .kind-btn:hover {
    border-color: var(--accent);
  }

  .kind-menu {
    position: absolute;
    top: 26px;
    left: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 4px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    min-width: 110px;
  }

  .kind-menu button {
    padding: 6px 10px;
    text-align: left;
    font-size: 12px;
    border-radius: 3px;
    color: var(--text);
    white-space: nowrap;
  }

  .kind-menu button:hover,
  .kind-menu button.active {
    background: var(--bg-hover);
  }

  .node-title {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    outline: none;
    min-width: 0;
  }

  .node-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
  }

  .node-header:hover .node-actions {
    opacity: 1;
  }

  .node-actions button {
    width: 22px;
    height: 22px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .node-actions button:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .node-body {
    padding: 8px 12px 8px 26px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .desc {
    width: 100%;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    resize: vertical;
    outline: none;
    font-family: inherit;
    line-height: 1.5;
  }

  .desc:focus {
    border-color: var(--accent);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .ending-input {
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    outline: none;
    font-family: inherit;
  }

  .ending-input:focus {
    border-color: var(--accent);
  }

  .children {
    margin-top: 4px;
  }
</style>
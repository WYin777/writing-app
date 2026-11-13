<script>
  import {
    currentRelation, currentProject, appView,
    currentProjectRelations, currentProjectCharacters
  } from '../lib/stores.js';
  import { db } from '../lib/db.js';
  import { loadAll } from '../lib/data.js';
  import { formatDate } from '../lib/utils.js';

  const rel = $derived($currentRelation);

  let editMode = $state(false);
  let nameValue = $state('');
  let nodes = $state([]);
  let edges = $state([]);
  let selectedNode = $state(null);
  let connectingFrom = $state(null);
  let dragState = $state(null);
  let saving = $state(false);

  $effect(() => {
    if (rel) {
      nameValue = rel.name || '';
      nodes = rel.nodes ? JSON.parse(JSON.stringify(rel.nodes)) : [];
      edges = rel.edges ? JSON.parse(JSON.stringify(rel.edges)) : [];
    }
  });

  function goBack() {
    currentRelation.set(null);
    appView.set('project');
  }

  function selectRel(r) {
    currentRelation.set(r);
    editMode = false;
    selectedNode = null;
    connectingFrom = null;
  }

  function startEdit() { editMode = true; }

  function cancelEdit() {
    editMode = false;
    if (rel) {
      nameValue = rel.name || '';
      nodes = rel.nodes ? JSON.parse(JSON.stringify(rel.nodes)) : [];
      edges = rel.edges ? JSON.parse(JSON.stringify(rel.edges)) : [];
    }
    selectedNode = null;
    connectingFrom = null;
  }

  async function persist() {
    if (!rel) return;
    const payload = JSON.parse(JSON.stringify({
      name: nameValue.trim() || '未命名關係圖',
      nodes: [...nodes],
      edges: [...edges],
      updatedAt: Date.now()
    }));
    await db.relations.update(rel.id, payload);
    await loadAll();
  }

  async function save() {
    saving = true;
    try {
      await persist();
      editMode = false;
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!rel) return;
    if (!confirm(`確定刪除「${rel.name}」？`)) return;
    await db.relations.delete(rel.id);
    await loadAll();
    goBack();
  }

  async function toggleFavorite() {
    if (!rel) return;
    await db.relations.update(rel.id, { favorite: !rel.favorite, updatedAt: Date.now() });
    await loadAll();
    currentRelation.update(r => ({ ...r, favorite: !r.favorite }));
  }

  function addNode(charId) {
    if (!charId) return;
    const id = Number(charId);
    if (nodes.some(n => String(n.characterId) === String(id))) {
      alert('這個角色已在圖中');
      return;
    }
    const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x || 0)) : 100;
    nodes = [...nodes, {
      id: crypto.randomUUID(),
      characterId: id,
      x: maxX + 120,
      y: 120
    }];
    persist();
  }

  function removeNode(nodeId) {
    nodes = nodes.filter(n => n.id !== nodeId);
    edges = edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    if (selectedNode === nodeId) selectedNode = null;
    persist();
  }

  function charName(charId) {
    if (charId === null || charId === undefined) return '?';
    const found = $currentProjectCharacters.find(c => String(c.id) === String(charId));
    return found?.name || '?';
  }

  function charAvatar(charId) {
    if (charId === null || charId === undefined) return null;
    const found = $currentProjectCharacters.find(c => String(c.id) === String(charId));
    return found?.avatar || null;
  }

  function charColor(charId) {
    if (charId === null || charId === undefined) return null;
    const found = $currentProjectCharacters.find(c => String(c.id) === String(charId));
    return found?.representColor || null;
  }

  function handleCanvasClick() {
    if (connectingFrom) connectingFrom = null;
    else selectedNode = null;
  }

  function handleNodeClick(e, node) {
    e.stopPropagation();
    if (connectingFrom) {
      if (connectingFrom !== node.id) {
        const label = prompt('關係標籤（如：青梅竹馬、宿敵）') || '';
        if (label !== null) {
          edges = [...edges, {
            id: crypto.randomUUID(),
            from: connectingFrom,
            to: node.id,
            label
          }];
          persist();
        }
        connectingFrom = null;
      }
    } else {
      selectedNode = selectedNode === node.id ? null : node.id;
    }
  }

  function startConnect(e, node) {
    e.stopPropagation();
    connectingFrom = node.id;
  }

  function startDrag(e, node) {
    e.stopPropagation();
    if (e.button !== 0 || !editMode) return;
    const canvas = e.currentTarget.closest('.canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - node.x;
    const offsetY = e.clientY - rect.top - node.y;
    dragState = { nodeId: node.id, offsetX, offsetY };

    const moveHandler = (ev) => {
      if (!dragState) return;
      const x = Math.max(0, ev.clientX - rect.left - dragState.offsetX);
      const y = Math.max(0, ev.clientY - rect.top - dragState.offsetY);
      nodes = nodes.map(n => n.id === dragState.nodeId ? { ...n, x, y } : n);
    };

    const upHandler = () => {
      dragState = null;
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', upHandler);
      persist();
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
  }

  function updateEdgeLabel(edgeId, label) {
    edges = edges.map(e => e.id === edgeId ? { ...e, label } : e);
    persist();
  }

  function removeEdge(edgeId) {
    edges = edges.filter(e => e.id !== edgeId);
    persist();
  }

  const selectedEdges = $derived(
    selectedNode
      ? edges.filter(e => e.from === selectedNode || e.to === selectedNode)
      : []
  );

  function edgeMidpoint(edge) {
    const from = nodes.find(n => n.id === edge.from);
    const to = nodes.find(n => n.id === edge.to);
    if (!from || !to) return { x: 0, y: 0 };
    return { x: (from.x + to.x) / 2 + 40, y: (from.y + to.y) / 2 + 20 };
  }

  function availableChars() {
    const usedIds = nodes.map(n => String(n.characterId));
    return $currentProjectCharacters.filter(c => !usedIds.includes(String(c.id)));
  }
</script>

{#if rel}
  <div class="relation-page">
    <div class="topbar">
      <button class="back-btn" onclick={goBack}>← {$currentProject?.name || '返回'}</button>
      <div class="center">
        {#if editMode}
          <input
            class="name-input"
            bind:value={nameValue}
            placeholder="關係圖名稱"
          />
        {:else}
          <span class="name-display">{rel.name}</span>
        {/if}
      </div>
      <div class="actions">
        <button
          class="btn icon-only"
          class:active={rel.favorite}
          onclick={toggleFavorite}
          title="我的最愛"
        >{rel.favorite ? '⭐' : '☆'}</button>

        {#if editMode}
          <button class="btn" onclick={cancelEdit}>取消</button>
          <button class="btn primary" onclick={save} disabled={saving}>
            {saving ? '儲存中...' : '💾 儲存'}
          </button>
        {:else}
          <button class="btn danger" onclick={handleDelete}>🗑 刪除</button>
          <button class="btn primary" onclick={startEdit}>✏ 編輯</button>
        {/if}
      </div>
    </div>

    <div class="main-grid">
      <aside class="rel-list">
        {#each $currentProjectRelations as r (r.id)}
          <div
            class="rel-item"
            class:active={r.id === rel.id}
            onclick={() => selectRel(r)}
          >
            <span class="rel-name">{r.name}</span>
            <span class="rel-count">{r.nodes?.length || 0}</span>
            {#if r.favorite}<span class="fav">⭐</span>{/if}
          </div>
        {/each}
      </aside>

      <div class="canvas-area">
        {#if editMode}
          <div class="toolbar">
            <span class="hint">
              {connectingFrom ? '點另一個角色完成連線' : (selectedNode ? '點「🔗」開始連線' : '拖曳角色可移動位置')}
            </span>
            <select
              class="add-char-select"
              onchange={(e) => { addNode(e.target.value); e.target.value = ''; }}
            >
              <option value="">＋ 加入角色</option>
              {#each availableChars() as c (c.id)}
                <option value={c.id}>{c.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="canvas" class:readonly={!editMode} onclick={handleCanvasClick}>
          <svg class="edges-layer">
            {#each edges as edge (edge.id)}
              {@const from = nodes.find(n => n.id === edge.from)}
              {@const to = nodes.find(n => n.id === edge.to)}
              {#if from && to}
                {@const mid = edgeMidpoint(edge)}
                <line
                  x1={from.x + 40}
                  y1={from.y + 40}
                  x2={to.x + 40}
                  y2={to.y + 40}
                  class="edge-line"
                />
                <text
                  x={mid.x}
                  y={mid.y}
                  class="edge-label"
                  onclick={(e) => {
                    if (!editMode) return;
                    e.stopPropagation();
                    const newLabel = prompt('關係標籤', edge.label || '');
                    if (newLabel !== null) updateEdgeLabel(edge.id, newLabel);
                  }}
                  oncontextmenu={(e) => {
                    if (!editMode) return;
                    e.preventDefault();
                    if (confirm('刪除這條連線？')) removeEdge(edge.id);
                  }}
                >
                  {edge.label || '?'}
                </text>
              {/if}
            {/each}
          </svg>

          {#each nodes as node (node.id)}
            <div
              class="node"
              class:selected={selectedNode === node.id}
              class:connecting={connectingFrom === node.id}
              class:readonly={!editMode}
              style="left: {node.x}px; top: {node.y}px; border-color: {charColor(node.characterId) || 'var(--border)'};"
              onmousedown={(e) => startDrag(e, node)}
              onclick={(e) => editMode && handleNodeClick(e, node)}
              role="button"
              tabindex="0"
            >
              <div class="avatar">
                {#if charAvatar(node.characterId)}
                  <img src={charAvatar(node.characterId)} alt={charName(node.characterId)} />
                {:else}
                  <span>🎭</span>
                {/if}
              </div>
              <div class="name">{charName(node.characterId)}</div>
              {#if editMode && selectedNode === node.id}
                <div class="node-actions">
                  <button
                    class="action-btn"
                    onclick={(e) => startConnect(e, node)}
                    title="連線"
                  >🔗</button>
                  <button
                    class="action-btn danger"
                    onclick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                    title="移除"
                  >×</button>
                </div>
              {/if}
            </div>
          {/each}

          {#if nodes.length === 0}
            <div class="canvas-empty">
              <p>🕸</p>
              <p>還沒有角色</p>
              {#if editMode}
                <p class="hint">點右上角「＋ 加入角色」開始</p>
              {:else}
                <p class="hint">點「✏ 編輯」開始建立</p>
              {/if}
            </div>
          {/if}
        </div>

        {#if editMode && selectedNode}
          <div class="info-panel">
            <div class="info-header">連線（{selectedEdges.length}）</div>
            {#if selectedEdges.length === 0}
              <div class="info-empty">這個角色還沒有連線</div>
            {:else}
              {#each selectedEdges as edge (edge.id)}
                <div class="edge-item">
                  <span class="edge-text">
                    {charName(nodes.find(n => n.id === edge.from)?.characterId)}
                    ↔
                    {charName(nodes.find(n => n.id === edge.to)?.characterId)}
                  </span>
                  <input
                    class="edge-input"
                    value={edge.label || ''}
                    placeholder="關係標籤"
                    onblur={(e) => updateEdgeLabel(edge.id, e.target.value)}
                  />
                  <button class="mini-del" onclick={() => removeEdge(edge.id)}>×</button>
                </div>
              {/each}
            {/if}
          </div>
        {/if}

        <div class="view-meta">
          <span>建立：{formatDate(rel.createdAt)}</span>
          <span>更新：{formatDate(rel.updatedAt)}</span>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .relation-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
    gap: 12px;
  }

  .back-btn {
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .back-btn:hover { background: var(--bg-hover); color: var(--text); }

  .center { flex: 1; display: flex; justify-content: center; min-width: 0; }

  .name-input {
    width: 100%;
    max-width: 320px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    outline: none;
    text-align: center;
    font-family: inherit;
  }

  .name-input:focus { border-color: var(--accent); }

  .name-display {
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .actions { display: flex; gap: 6px; flex-shrink: 0; }

  .btn {
    padding: 7px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }

  .btn:hover { background: var(--bg-hover); }
  .btn.primary { background: var(--accent); color: white; border-color: var(--accent); }
  .btn.primary:hover { background: var(--accent-hover); }
  .btn.danger { color: var(--danger); }
  .btn.danger:hover { background: var(--danger-soft); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn.icon-only { padding: 7px 10px; font-size: 14px; }
  .btn.active { color: var(--warning); border-color: var(--warning); }

  .main-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 200px 1fr;
    overflow: hidden;
  }

  .rel-list {
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
    overflow-y: auto;
  }

  .rel-item {
    padding: 10px 12px;
    cursor: pointer;
    border-left: 3px solid transparent;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .rel-item:hover { background: var(--bg-hover); }
  .rel-item.active { background: var(--bg-hover); border-left-color: var(--accent); }

  .rel-name {
    flex: 1;
    font-size: 12px;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rel-count {
    font-size: 10px;
    color: var(--text-secondary);
    background: var(--bg-hover);
    padding: 1px 6px;
    border-radius: 8px;
  }

  .fav { font-size: 11px; }

  .canvas-area {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
    flex-shrink: 0;
    gap: 8px;
  }

  .hint {
    font-size: 12px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .add-char-select {
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    outline: none;
    font-family: inherit;
    cursor: pointer;
    flex-shrink: 0;
  }

  .add-char-select:focus { border-color: var(--accent); }

  .canvas {
    flex: 1;
    position: relative;
    overflow: auto;
    background: var(--bg);
    background-image: radial-gradient(circle, var(--border) 1px, transparent 1px);
    background-size: 24px 24px;
    min-height: 400px;
  }

  .canvas.readonly { background-image: none; }

  .edges-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  .edge-line {
    stroke: var(--text-secondary);
    stroke-width: 1.5;
    opacity: 0.5;
  }

  .edge-label {
    fill: var(--text-secondary);
    font-size: 11px;
    pointer-events: auto;
    user-select: none;
  }

  .canvas:not(.readonly) .edge-label {
    cursor: pointer;
  }

  .canvas:not(.readonly) .edge-label:hover {
    fill: var(--accent);
    font-weight: 600;
  }

  .node {
    position: absolute;
    width: 80px;
    padding: 8px;
    background: var(--bg-card);
    border: 2px solid var(--border);
    border-radius: var(--radius);
    text-align: center;
    user-select: none;
    box-shadow: var(--shadow-sm);
    z-index: 2;
    cursor: default;
  }

  .node:not(.readonly) { cursor: grab; }
  .node:hover { box-shadow: var(--shadow); }

  .node.selected { box-shadow: 0 0 0 2px var(--accent); }
  .node.connecting { box-shadow: 0 0 0 2px var(--warning); }

  .node .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 22px;
    margin: 0 auto 6px;
  }

  .node .avatar img { width: 100%; height: 100%; object-fit: cover; }

  .node .name {
    font-size: 11px;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-actions {
    position: absolute;
    top: -10px;
    right: -10px;
    display: flex;
    gap: 2px;
  }

  .action-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--text);
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }

  .action-btn:hover { background: var(--accent); color: white; border-color: var(--accent); }
  .action-btn.danger { color: var(--danger); }
  .action-btn.danger:hover { background: var(--danger); border-color: var(--danger); color: white; }

  .canvas-empty {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    pointer-events: none;
  }

  .canvas-empty p:first-child { font-size: 40px; }
  .canvas-empty .hint { font-size: 11px; opacity: 0.7; }

  .info-panel {
    border-top: 1px solid var(--border);
    background: var(--bg-secondary);
    padding: 8px 16px;
    max-height: 160px;
    overflow-y: auto;
    flex-shrink: 0;
  }

  .info-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .info-empty {
    font-size: 12px;
    color: var(--text-secondary);
    font-style: italic;
    padding: 4px;
  }

  .edge-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    font-size: 12px;
  }

  .edge-text {
    flex-shrink: 0;
    color: var(--text);
    font-weight: 500;
  }

  .edge-input {
    flex: 1;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    outline: none;
    font-family: inherit;
    min-width: 0;
  }

  .edge-input:focus { border-color: var(--accent); }

  .mini-del {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    color: var(--text-secondary);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mini-del:hover { color: var(--danger); background: var(--bg); }

  .view-meta {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: var(--text-muted);
    padding: 8px 16px;
    border-top: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .main-grid {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
    }
    .rel-list {
      max-height: 60px;
      display: flex;
      overflow-x: auto;
      overflow-y: hidden;
      border-right: none;
      border-bottom: 1px solid var(--border);
    }
    .rel-item {
      min-width: 100px;
      border-left: none;
      border-bottom: 3px solid transparent;
    }
    .rel-item.active { border-left: none; border-bottom-color: var(--accent); }
    .topbar { padding: 8px 12px; gap: 8px; }
    .name-input, .name-display { font-size: 13px; }
    .back-btn { max-width: 80px; font-size: 12px; }
    .btn { padding: 6px 10px; font-size: 12px; }
    .btn.danger { display: none; }
    .rel-name { font-size: 11px; }
  }
</style>
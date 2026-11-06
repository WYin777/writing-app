<script>
  import { onMount } from 'svelte';
  import { db, getFoldersByType } from '../lib/db.js';
  import { relationFolders, relationFolderFilter } from '../lib/stores.js';
  import FolderTree from './FolderTree.svelte';
  import AllFolders from './AllFolders.svelte';

  let relations = $state([]);
  let characters = $state([]);
  let currentId = $state(null);
  let showForm = $state(false);
  let saving = $state(false);
  let errorMsg = $state('');
  let formName = $state('');
  let formFolderId = $state(null);

  let nodes = $state([]);
  let edges = $state([]);
  let selectedNode = $state(null);
  let connectingFrom = $state(null);
  let dragState = $state(null);

  async function load() {
    try {
      relations = await db.relations.toArray();
      characters = await db.characters.toArray();
      const folders = await getFoldersByType('relation');
      relationFolders.set(folders);
    } catch (e) {
      console.error('載入失敗', e);
    }
  }

  onMount(() => {
    load();
  });

  $effect(() => {
    const fid = $relationFolderFilter;
    if (fid !== null) {
      currentId = null;
      showForm = false;
    }
  });

  const filteredRelations = $derived(
    relations.filter(r => {
      const fid = $relationFolderFilter;
      return fid === null || r.folderId === fid;
    })
  );

  const current = $derived(
    currentId ? relations.find(r => r.id === currentId) : null
  );

  $effect(() => {
    if (current) {
      nodes = current.nodes ? JSON.parse(JSON.stringify(current.nodes)) : [];
      edges = current.edges ? JSON.parse(JSON.stringify(current.edges)) : [];
    } else {
      nodes = [];
      edges = [];
    }
  });

  function startNew() {
    formName = '';
    formFolderId = $relationFolderFilter;
    currentId = null;
    showForm = true;
    nodes = [];
    edges = [];
    errorMsg = '';
  }

  function startEdit(rel) {
    formName = rel.name || '未命名關係圖';
    formFolderId = rel.folderId ?? null;
    currentId = rel.id;
    showForm = true;
    errorMsg = '';
  }

  function cancelForm() {
    showForm = false;
    formName = '';
  }

  async function saveRelation() {
    if (saving) return;
    errorMsg = '';
    if (!formName.trim()) {
      errorMsg = '請填寫關係圖名稱';
      return;
    }
    saving = true;
    try {
      const now = Date.now();
      const payload = {
        name: formName.trim(),
        folderId: formFolderId ?? null,
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
        updatedAt: now
      };
      if (currentId) {
        await db.relations.update(currentId, payload);
      } else {
        const newId = await db.relations.add({
          ...payload,
          createdAt: now
        });
        currentId = newId;
      }
      await load();
      showForm = false;
      formName = '';
    } catch (e) {
      console.error('儲存失敗', e);
      errorMsg = '儲存失敗：' + (e?.message || e);
    } finally {
      saving = false;
    }
  }

  async function deleteRelation(id) {
    if (!confirm('確定刪除這張關係圖？')) return;
    await db.relations.delete(id);
    if (currentId === id) currentId = null;
    await load();
  }

  async function moveToFolder(rel, newFolderId) {
    await db.relations.update(rel.id, { folderId: newFolderId, updatedAt: Date.now() });
    await load();
  }

  async function persistChanges() {
    if (!currentId) return;
    await db.relations.update(currentId, {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      updatedAt: Date.now()
    });
    await load();
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
    persistChanges();
  }

  function removeNode(nodeId) {
    nodes = nodes.filter(n => n.id !== nodeId);
    edges = edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    if (selectedNode === nodeId) selectedNode = null;
    persistChanges();
  }

  function charName(charId) {
    if (charId === null || charId === undefined) return '?';
    const found = characters.find(c => String(c.id) === String(charId));
    return found?.name || '?';
  }

  function charAvatar(charId) {
    if (charId === null || charId === undefined) return null;
    const found = characters.find(c => String(c.id) === String(charId));
    return found?.avatar || null;
  }

  function handleCanvasClick(e) {
    if (connectingFrom) {
      connectingFrom = null;
    } else {
      selectedNode = null;
    }
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
          persistChanges();
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
    if (e.button !== 0) return;
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
      persistChanges();
    };

    window.addEventListener('mousemove', moveHandler);
    window.addEventListener('mouseup', upHandler);
  }

  function updateEdgeLabel(edgeId, label) {
    edges = edges.map(e => e.id === edgeId ? { ...e, label } : e);
    persistChanges();
  }

  function removeEdge(edgeId) {
    edges = edges.filter(e => e.id !== edgeId);
    persistChanges();
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
    return {
      x: (from.x + to.x) / 2 + 40,
      y: (from.y + to.y) / 2 + 20
    };
  }

  function availableChars() {
    const usedIds = nodes.map(n => String(n.characterId));
    return characters.filter(c => !usedIds.includes(String(c.id)));
  }

  function onSelectFolder(id) {
    relationFolderFilter.set(id);
    currentId = null;
    showForm = false;
  }
</script>

<div class="relation-manager">
  <aside class="folder-panel">
    <FolderTree
      type="relation"
      folders={$relationFolders}
      selectedId={$relationFolderFilter}
      onSelect={onSelectFolder}
      onRefresh={load}
      label="關係圖資料夾"
    />
    <AllFolders />
  </aside>

  <aside class="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">🕸 關係圖</span>
      <button class="new-btn" onclick={startNew}>＋ 新增</button>
    </div>

    {#if filteredRelations.length === 0}
      <div class="empty-hint">還沒有關係圖</div>
    {:else}
      <div class="rel-list">
        {#each filteredRelations as rel (rel.id)}
          <div
            class="rel-item"
            class:active={currentId === rel.id}
            onclick={() => { currentId = rel.id; showForm = false; }}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && (currentId = rel.id, showForm = false)}
          >
            <div class="rel-name">{rel.name}</div>
            <div class="rel-meta">{rel.nodes?.length || 0} 個角色</div>
          </div>
        {/each}
      </div>
    {/if}
  </aside>

  <div class="main">
    {#if showForm}
      <div class="form-wrapper">
        <div class="form-header">
          <h2>{currentId ? '編輯關係圖' : '新增關係圖'}</h2>
          <div class="form-actions">
            <button class="cancel-btn" onclick={cancelForm}>取消</button>
            <button class="save-btn" onclick={saveRelation} disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>

        {#if errorMsg}
          <div class="error-msg">{errorMsg}</div>
        {/if}

        <div class="field">
          <label>關係圖名稱</label>
          <input bind:value={formName} placeholder="例如：主角人際關係" />
        </div>

        <div class="field">
          <label>資料夾</label>
          <select bind:value={formFolderId}>
            <option value={null}>（無資料夾）</option>
            {#each $relationFolders as f (f.id)}
              <option value={f.id}>
                {#if f.parentId}　└ {/if}{f.name}
              </option>
            {/each}
          </select>
        </div>
      </div>
    {:else if current}
      <div class="toolbar">
        <div class="toolbar-left">
          <span class="rel-title">{current.name}</span>
          <span class="hint">
            {connectingFrom ? '點另一個角色完成連線' : (selectedNode ? '點「🔗」開始連線' : '拖曳角色可移動位置')}
          </span>
        </div>
        <div class="toolbar-right">
          <select
            class="add-char-select"
            onchange={(e) => { addNode(e.target.value); e.target.value = ''; }}
          >
            <option value="">＋ 加入角色</option>
            {#each availableChars() as c (c.id)}
              <option value={c.id}>{c.name}</option>
            {/each}
          </select>
          <button class="icon-btn" onclick={() => startEdit(current)} title="重新命名">✏</button>
          <button class="icon-btn danger" onclick={() => deleteRelation(current.id)} title="刪除">🗑</button>
        </div>
      </div>

      <div class="folder-change">
        <label>📁 資料夾：</label>
        <select
          value={current.folderId ?? null}
          onchange={(e) => {
            const v = e.target.value;
            moveToFolder(current, v === 'null' ? null : Number(v));
          }}
        >
          <option value={null}>（無資料夾）</option>
          {#each $relationFolders as f (f.id)}
            <option value={f.id}>
              {#if f.parentId}　└ {/if}{f.name}
            </option>
          {/each}
        </select>
      </div>

      <div class="canvas" onclick={handleCanvasClick}>
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
                  e.stopPropagation();
                  const newLabel = prompt('關係標籤', edge.label || '');
                  if (newLabel !== null) updateEdgeLabel(edge.id, newLabel);
                }}
                oncontextmenu={(e) => {
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
            style="left: {node.x}px; top: {node.y}px;"
            onmousedown={(e) => startDrag(e, node)}
            onclick={(e) => handleNodeClick(e, node)}
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
            {#if selectedNode === node.id}
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
            <p class="hint">點右上角「＋ 加入角色」開始</p>
          </div>
        {/if}
      </div>

      {#if selectedNode}
        <div class="info-panel">
          <div class="info-header">
            <span>連線（{selectedEdges.length}）</span>
          </div>
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
    {:else}
      <div class="empty">
        <p>🕸</p>
        <p>選擇左側關係圖查看</p>
        <p class="hint">或點「＋ 新增」建立關係圖</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .relation-manager {
    display: flex;
    height: 100%;
    width: 100%;
  }

  .folder-panel {
    width: 220px;
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
    overflow-y: auto;
    flex-shrink: 0;
  }

  .sidebar {
    width: 220px;
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .sidebar-header {
    padding: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .new-btn {
    padding: 5px 10px;
    background: var(--accent);
    color: white;
    border-radius: var(--radius);
    font-size: 12px;
  }

  .new-btn:hover { background: var(--accent-hover); }

  .rel-list { flex: 1; overflow-y: auto; }

  .rel-item {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    border-left: 3px solid transparent;
  }

  .rel-item:hover { background: var(--bg-hover); }

  .rel-item.active {
    background: var(--bg-hover);
    border-left-color: var(--accent);
  }

  .rel-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
  }

  .rel-meta {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg);
  }

  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
    gap: 12px;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
  }

  .rel-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }

  .hint {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .toolbar-right {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .add-char-select {
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    outline: none;
    font-family: inherit;
    cursor: pointer;
  }

  .add-char-select:focus { border-color: var(--accent); }

  .icon-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover { border-color: var(--accent); color: var(--accent); }

  .icon-btn.danger { color: var(--danger); }
  .icon-btn.danger:hover { background: var(--danger); color: white; border-color: var(--danger); }

  .folder-change {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
  }

  .folder-change select {
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    outline: none;
    font-family: inherit;
  }

  .folder-change select:focus { border-color: var(--accent); }

  .canvas {
    flex: 1;
    position: relative;
    overflow: auto;
    background: var(--bg);
    background-image:
      radial-gradient(circle, var(--border) 1px, transparent 1px);
    background-size: 24px 24px;
    min-height: 400px;
  }

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
    cursor: pointer;
    user-select: none;
  }

  .edge-label:hover {
    fill: var(--accent);
    font-weight: 600;
  }

  .node {
    position: absolute;
    width: 80px;
    padding: 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    text-align: center;
    cursor: grab;
    user-select: none;
    box-shadow: 0 2px 6px rgba(0,0,0,0.05);
    z-index: 2;
  }

  .node:hover {
    border-color: var(--accent);
  }

  .node.selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent);
  }

  .node.connecting {
    border-color: #f59e0b;
    box-shadow: 0 0 0 2px #f59e0b;
  }

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

  .node .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

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
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .action-btn:hover {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

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
    padding: 8px 12px;
    max-height: 180px;
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

  .form-wrapper {
    padding: 24px;
    max-width: 600px;
    margin: 0 auto;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .form-header h2 { font-size: 18px; font-weight: 600; }

  .form-actions { display: flex; gap: 8px; }

  .cancel-btn,
  .save-btn {
    padding: 7px 14px;
    border-radius: var(--radius);
    font-size: 13px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
  }

  .save-btn {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .save-btn:hover:not(:disabled) { background: var(--accent-hover); }
  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .cancel-btn:hover { background: var(--bg-hover); }

  .error-msg {
    padding: 8px 12px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: var(--radius);
    font-size: 12px;
    margin-bottom: 12px;
  }

  :global([data-theme="dark"]) .error-msg {
    background: #7f1d1d;
    color: #fecaca;
    border-color: #991b1b;
  }

  .field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }

  .field label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .field input,
  .field select {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    font-size: 13px;
    color: var(--text);
    outline: none;
    font-family: inherit;
  }

  .field input:focus,
  .field select:focus { border-color: var(--accent); }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
    font-size: 14px;
    gap: 8px;
    padding: 24px;
    text-align: center;
  }

  .empty p:first-child { font-size: 40px; }
  .empty .hint { font-size: 12px; opacity: 0.7; }

  .empty-hint {
    padding: 24px 16px;
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
    font-style: italic;
  }
</style>
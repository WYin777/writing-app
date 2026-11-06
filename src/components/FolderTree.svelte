<script>
  import { createFolder, renameFolder, deleteFolder } from '../lib/db.js';

  let {
    type,
    folders = [],
    selectedId = null,
    onSelect,
    onRefresh,
    label = '資料夾'
  } = $props();

  let addingParentId = $state(undefined); // undefined = 未新增, null = 根層, id = 子層
  let newName = $state('');
  let editingId = $state(null);
  let editingName = $state('');
  let expanded = $state(new Set());

  function rootFolders() {
    return folders.filter(f => !f.parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function childFolders(parentId) {
    return folders.filter(f => f.parentId === parentId).sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function toggleExpand(id) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  }

  function startAdd(parentId) {
    addingParentId = parentId;
    newName = '';
  }

  async function confirmAdd() {
    const name = newName.trim();
    if (!name) { addingParentId = undefined; return; }
    await createFolder(name, type, addingParentId);
    newName = '';
    addingParentId = undefined;
    await onRefresh();
  }

  function startRename(folder, e) {
    e.stopPropagation();
    editingId = folder.id;
    editingName = folder.name;
  }

  async function confirmRename() {
    const name = editingName.trim();
    if (!name) { editingId = null; return; }
    await renameFolder(editingId, name);
    editingId = null;
    await onRefresh();
  }

  async function handleDelete(folder, e) {
    e.stopPropagation();
    if (!confirm(`刪除資料夾「${folder.name}」？裡面的項目會移到上一層。`)) return;
    await deleteFolder(folder.id);
    if (selectedId === folder.id) onSelect(null);
    await onRefresh();
  }
</script>

<div class="folder-tree">
  <div class="folder-header">
    <span class="folder-title">📁 {label}</span>
    <button class="add-btn" onclick={() => startAdd(null)} title="新增資料夾">＋</button>
  </div>

  <div
    class="folder-item root"
    class:active={selectedId === null}
    onclick={() => onSelect(null)}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && onSelect(null)}
  >
    <span class="icon">📚</span>
    <span>全部</span>
  </div>

  {#if addingParentId === null}
    <div class="input-row">
      <input
        class="small-input"
        placeholder="資料夾名稱..."
        bind:value={newName}
        onkeydown={(e) => {
          if (e.key === 'Enter') confirmAdd();
          if (e.key === 'Escape') addingParentId = undefined;
        }}
        autofocus
      />
    </div>
  {/if}

  {#each rootFolders() as folder (folder.id)}
    <div class="folder-group">
      {#if editingId === folder.id}
        <div class="input-row">
          <input
            class="small-input"
            bind:value={editingName}
            onblur={confirmRename}
            onkeydown={(e) => {
              if (e.key === 'Enter') confirmRename();
              if (e.key === 'Escape') editingId = null;
            }}
            autofocus
          />
        </div>
      {:else}
        <div
          class="folder-item"
          class:active={selectedId === folder.id}
          onclick={() => onSelect(folder.id)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && onSelect(folder.id)}
        >
          <button
            class="expand-btn"
            onclick={(e) => { e.stopPropagation(); toggleExpand(folder.id); }}
          >
            {expanded.has(folder.id) ? '▾' : '▸'}
          </button>
          <span class="icon">📁</span>
          <span class="flex-1">{folder.name}</span>
          <button class="row-btn" onclick={(e) => startRename(folder, e)} title="重新命名">✏</button>
          <button class="row-btn" onclick={(e) => handleDelete(folder, e)} title="刪除">🗑</button>
          <button class="row-btn" onclick={(e) => { e.stopPropagation(); startAdd(folder.id); }} title="新增子資料夾">＋</button>
        </div>
      {/if}

      {#if expanded.has(folder.id)}
        {#if addingParentId === folder.id}
          <div class="input-row sub">
            <input
              class="small-input"
              placeholder="子資料夾名稱..."
              bind:value={newName}
              onkeydown={(e) => {
                if (e.key === 'Enter') confirmAdd();
                if (e.key === 'Escape') addingParentId = undefined;
              }}
              autofocus
            />
          </div>
        {/if}
        {#each childFolders(folder.id) as child (child.id)}
          {#if editingId === child.id}
            <div class="input-row sub">
              <input
                class="small-input"
                bind:value={editingName}
                onblur={confirmRename}
                onkeydown={(e) => {
                  if (e.key === 'Enter') confirmRename();
                  if (e.key === 'Escape') editingId = null;
                }}
                autofocus
              />
            </div>
          {:else}
            <div
              class="folder-item sub"
              class:active={selectedId === child.id}
              onclick={() => onSelect(child.id)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && onSelect(child.id)}
            >
              <span class="icon">📄</span>
              <span class="flex-1">{child.name}</span>
              <button class="row-btn" onclick={(e) => startRename(child, e)} title="重新命名">✏</button>
              <button class="row-btn" onclick={(e) => handleDelete(child, e)} title="刪除">🗑</button>
            </div>
          {/if}
        {/each}
      {/if}
    </div>
  {/each}
</div>

<style>
  .folder-tree {
    padding: 8px;
  }

  .folder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 10px 8px;
  }

  .folder-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .add-btn {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-btn:hover {
    background: var(--bg-hover);
    color: var(--accent);
  }

  .folder-group {
    margin-bottom: 2px;
  }

  .folder-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: var(--radius);
    font-size: 13px;
    cursor: pointer;
    color: var(--text);
    user-select: none;
  }

  .folder-item:hover {
    background: var(--bg-hover);
  }

  .folder-item.active {
    background: var(--bg-hover);
    color: var(--accent);
    font-weight: 500;
  }

  .folder-item.sub {
    padding-left: 26px;
  }

  .expand-btn {
    width: 14px;
    height: 14px;
    font-size: 9px;
    color: var(--text-secondary);
  }

  .icon {
    font-size: 13px;
    width: 16px;
    flex-shrink: 0;
  }

  .flex-1 {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .row-btn {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    font-size: 11px;
    color: var(--text-secondary);
    opacity: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .folder-item:hover .row-btn {
    opacity: 1;
  }

  .row-btn:hover {
    background: var(--bg);
    color: var(--text);
  }

  .input-row {
    padding: 4px 10px;
  }

  .input-row.sub {
    padding-left: 26px;
  }

  .small-input {
    width: 100%;
    padding: 5px 8px;
    border: 1px solid var(--accent);
    border-radius: 3px;
    background: var(--bg);
    font-size: 12px;
    color: var(--text);
    outline: none;
  }
</style>
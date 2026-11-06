<script>
  import { allFolders, openFolder, articleFolders, characterFolders, timelineFolders, relationFolders } from '../lib/stores.js';
  import { getFoldersByType } from '../lib/db.js';

  let expanded = $state(false);
  let typeExpanded = $state({ article: true, character: true, timeline: true });

  async function loadAll() {
  const [a, c, t, r] = await Promise.all([
    getFoldersByType('article'),
    getFoldersByType('character'),
    getFoldersByType('timeline'),
    getFoldersByType('relation')
  ]);
  articleFolders.set(a);
  characterFolders.set(c);
  timelineFolders.set(t);
  relationFolders.set(r);
  allFolders.set([...a, ...c, ...t, ...r]);
}

  $effect(() => {
    loadAll();
  });

  function toggle() {
    expanded = !expanded;
  }

  function toggleType(type) {
    typeExpanded = { ...typeExpanded, [type]: !typeExpanded[type] };
  }

  function foldersOfType(type) {
    return $allFolders
      .filter(f => f.type === type && !f.parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function childFolders(parentId) {
    return $allFolders
      .filter(f => f.parentId === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function handleClick(folder) {
    openFolder(folder);
  }

  const TYPE_META = {
    article: { label: '文章', icon: '📄' },
    character: { label: '角色', icon: '🎭' },
    timeline: { label: '時間軸', icon: '⏳' },
    relation: { label: '關係圖', icon: '🕸' }
  };
</script>

<div class="all-folders">
  <button class="toggle-btn" onclick={toggle}>
    <span class="arrow">{expanded ? '▾' : '▸'}</span>
    <span>🗂 全部資料夾</span>
  </button>

  {#if expanded}
    <div class="types">
      {#each ['article', 'character', 'timeline', 'relation'] as type}
        <div class="type-group">
          <button class="type-header" onclick={() => toggleType(type)}>
            <span class="arrow">{typeExpanded[type] ? '▾' : '▸'}</span>
            <span>{TYPE_META[type].icon} {TYPE_META[type].label}</span>
            <span class="type-count">{foldersOfType(type).length}</span>
          </button>

          {#if typeExpanded[type]}
            {#if foldersOfType(type).length === 0}
              <div class="empty-hint">尚無資料夾</div>
            {:else}
              {#each foldersOfType(type) as folder (folder.id)}
                <div
                  class="folder-item"
                  onclick={() => handleClick(folder)}
                  role="button"
                  tabindex="0"
                  onkeydown={(e) => e.key === 'Enter' && handleClick(folder)}
                >
                  <span class="icon">📁</span>
                  <span class="flex-1">{folder.name}</span>
                </div>
                {#each childFolders(folder.id) as child (child.id)}
                  <div
                    class="folder-item sub"
                    onclick={() => handleClick(child)}
                    role="button"
                    tabindex="0"
                    onkeydown={(e) => e.key === 'Enter' && handleClick(child)}
                  >
                    <span class="icon">📄</span>
                    <span class="flex-1">{child.name}</span>
                  </div>
                {/each}
              {/each}
            {/if}
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .all-folders {
    border-top: 1px solid var(--border);
    padding-top: 8px;
  }

  .toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    width: 100%;
    border-radius: var(--radius);
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .toggle-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .arrow {
    font-size: 10px;
    width: 10px;
    display: inline-block;
    color: var(--text-secondary);
  }

  .types {
    padding: 4px 0;
  }

  .type-group {
    margin-bottom: 4px;
  }

  .type-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    width: 100%;
    border-radius: 3px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .type-header:hover {
    background: var(--bg-hover);
  }

  .type-count {
    margin-left: auto;
    font-size: 10px;
    background: var(--bg-hover);
    padding: 0 6px;
    border-radius: 8px;
  }

  .folder-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px 5px 28px;
    border-radius: 3px;
    font-size: 12px;
    cursor: pointer;
    color: var(--text);
  }

  .folder-item:hover {
    background: var(--bg-hover);
    color: var(--accent);
  }

  .folder-item.sub {
    padding-left: 42px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .icon {
    font-size: 12px;
    width: 14px;
    flex-shrink: 0;
  }

  .flex-1 {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-hint {
    padding: 4px 28px;
    font-size: 11px;
    color: var(--text-secondary);
    font-style: italic;
  }
</style>
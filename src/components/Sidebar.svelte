<script>
  import {
    tags, filterType, filterFolderId, filterTag,
    resetFilter, articles, articleFolders
  } from '../lib/stores.js';
  import { collectTags, getFoldersByType } from '../lib/db.js';
  import FolderTree from './FolderTree.svelte';
  import AllFolders from './AllFolders.svelte';

  async function refreshTags() {
    const list = await collectTags();
    tags.set(list);
  }

  async function loadFolders() {
    const folders = await getFoldersByType('article');
    articleFolders.set(folders);
  }

  $effect(() => {
    refreshTags();
    loadFolders();
  });

  function selectAll() {
    resetFilter();
  }

  function selectFavorite() {
    filterType.set('favorite');
    filterFolderId.set(null);
    filterTag.set(null);
  }

  function selectFolder(id) {
    if (id === null) {
      selectAll();
      return;
    }
    filterType.set('folder');
    filterFolderId.set(id);
    filterTag.set(null);
  }

  function selectTag(name) {
    filterType.set('tag');
    filterTag.set(name);
    filterFolderId.set(null);
  }
</script>

<nav class="sidebar">
  <div class="section">
    <button
      class="nav-item"
      class:active={$filterType === 'all'}
      onclick={selectAll}
    >
      <span class="icon">📚</span>
      <span class="flex-1">全部文章</span>
      <span class="count">{$articles.length}</span>
    </button>
    <button
      class="nav-item"
      class:active={$filterType === 'favorite'}
      onclick={selectFavorite}
    >
      <span class="icon">⭐</span>
      <span class="flex-1">我的最愛</span>
    </button>
  </div>

  <div class="section">
    <FolderTree
      type="article"
      folders={$articleFolders}
      selectedId={$filterType === 'folder' ? $filterFolderId : null}
      onSelect={selectFolder}
      onRefresh={loadFolders}
      label="文章資料夾"
    />
  </div>

  <div class="section">
    <div class="section-header">
      <span class="section-title">🏷 標籤</span>
      <button class="add-btn" onclick={refreshTags} title="重新整理">↻</button>
    </div>
    {#if $tags.length === 0}
      <div class="empty-hint">尚無標籤</div>
    {:else}
      {#each $tags as tag (tag.name)}
        <div
          class="nav-item sub"
          class:active={$filterType === 'tag' && $filterTag === tag.name}
          onclick={() => selectTag(tag.name)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && selectTag(tag.name)}
        >
          <span class="tag-dot"></span>
          <span class="flex-1">{tag.name}</span>
          <span class="count">{tag.count}</span>
        </div>
      {/each}
    {/if}
  </div>

  <AllFolders />
</nav>

<style>
  .sidebar {
    padding: 8px;
    overflow-y: auto;
  }

  .section {
    margin-bottom: 16px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 10px 6px;
  }

  .section-title {
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

  .nav-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    border-radius: var(--radius);
    font-size: 13px;
    cursor: pointer;
    color: var(--text);
    width: 100%;
    text-align: left;
    user-select: none;
  }

  .nav-item:hover {
    background: var(--bg-hover);
  }

  .nav-item.active {
    background: var(--bg-hover);
    color: var(--accent);
    font-weight: 500;
  }

  .nav-item.sub {
    padding-left: 14px;
  }

  .flex-1 {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .icon {
    font-size: 14px;
    width: 18px;
    flex-shrink: 0;
  }

  .tag-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    margin-left: 5px;
    margin-right: 5px;
    flex-shrink: 0;
  }

  .count {
    font-size: 11px;
    color: var(--text-secondary);
    background: var(--bg-hover);
    padding: 1px 6px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .nav-item.active .count {
    background: var(--bg);
  }

  .empty-hint {
    font-size: 12px;
    color: var(--text-secondary);
    padding: 4px 14px;
    font-style: italic;
  }
</style>
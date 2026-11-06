<script>
  import {
    filteredArticles, currentArticle, articles,
    filterType, filterFolderId, filterTag,
    favorites, toggleFavorite, articleFolders
  } from '../lib/stores.js';
  import { formatDate } from '../lib/utils.js';
  import { createArticle, getAllArticles } from '../lib/db.js';

  async function handleNew() {
    const folderId = $filterType === 'folder' ? $filterFolderId : null;
    const id = await createArticle({ title: '未命名文章', folderId });
    const list = await getAllArticles();
    articles.set(list);
    const newArticle = list.find(a => a.id === id);
    currentArticle.set(newArticle);
  }

  function selectArticle(article) {
    currentArticle.set(article);
  }

  function toggleFav(e, article) {
    e.stopPropagation();
    toggleFavorite(article.id);
  }

  let listTitle = $derived.by(() => {
    if ($filterType === 'favorite') return '我的最愛';
    if ($filterType === 'folder') {
      const f = $articleFolders.find(x => x.id === $filterFolderId);
      return f ? `📁 ${f.name}` : '資料夾';
    }
    if ($filterType === 'tag') return `#${$filterTag}`;
    return '全部文章';
  });
</script>

<div class="article-list">
  <div class="list-header">
    <span>{listTitle}（{$filteredArticles.length}）</span>
    <button class="new-btn" onclick={handleNew}>＋ 新增</button>
  </div>

  {#if $filteredArticles.length === 0}
    <div class="empty">
      <p>這裡還沒有文章</p>
      <p class="hint">點「＋ 新增」開始寫作</p>
    </div>
  {:else}
    {#each $filteredArticles as article (article.id)}
      <div
        class="article-item"
        class:active={$currentArticle?.id === article.id}
        onclick={() => selectArticle(article)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && selectArticle(article)}
      >
        <div class="title-row">
          <span class="title">{article.title}</span>
          <button
            class="fav-btn"
            class:active={$favorites.has(article.id)}
            onclick={(e) => toggleFav(e, article)}
            title="我的最愛"
          >{$favorites.has(article.id) ? '★' : '☆'}</button>
        </div>
        <div class="meta">
          <span class="type-tag">{article.outlineType === 'game' ? '🎮 遊戲' : '📖 書籍'}</span>
          <span class="status {article.status}">{article.status}</span>
          <span>{formatDate(article.updatedAt)}</span>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .article-list {
    flex: 1;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .new-btn {
    font-size: 12px;
    color: var(--accent);
    font-weight: 500;
  }

  .new-btn:hover {
    text-decoration: underline;
  }

  .empty {
    padding: 24px 16px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .empty .hint {
    font-size: 12px;
    margin-top: 4px;
    opacity: 0.7;
  }

  .article-item {
    padding: 10px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
  }

  .article-item:hover {
    background: var(--bg-hover);
  }

  .article-item.active {
    background: var(--bg-hover);
    border-left: 3px solid var(--accent);
    padding-left: 9px;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .title {
    flex: 1;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fav-btn {
    font-size: 14px;
    color: var(--text-secondary);
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .fav-btn.active {
    color: #f59e0b;
  }

  .fav-btn:hover {
    color: #f59e0b;
  }

  .meta {
    display: flex;
    gap: 6px;
    font-size: 11px;
    color: var(--text-secondary);
    align-items: center;
    flex-wrap: wrap;
  }

  .type-tag {
    font-size: 10px;
  }

  .status {
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--bg);
    font-size: 10px;
  }

  .status.draft { color: #6b7280; }
  .status.writing { color: #f59e0b; }
  .status.done { color: #10b981; }
</style>
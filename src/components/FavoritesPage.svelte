<script>
  import {
    favoriteArticles, favoriteCharacters, favoriteTimeline, favoriteRelations,
    projects, appView, currentProject, currentArticle, currentCharacter,
    currentTimelineEvent, currentRelation, activeView
  } from '../lib/stores.js';
  import { formatDate } from '../lib/utils.js';

  let activeTab = $state('articles');

  const TABS = [
    { key: 'articles',   label: '📄 文章' },
    { key: 'characters', label: '🎭 角色' },
    { key: 'timeline',   label: '⏳ 時間軸' },
    { key: 'relations',  label: '🕸 關係圖' }
  ];

  function tabCount(key) {
    if (key === 'articles') return $favoriteArticles.length;
    if (key === 'characters') return $favoriteCharacters.length;
    if (key === 'timeline') return $favoriteTimeline.length;
    if (key === 'relations') return $favoriteRelations.length;
    return 0;
  }

  function projectName(projectId) {
    return $projects.find(p => p.id === projectId)?.name || '未知專案';
  }

  function openArticle(art) {
    const proj = $projects.find(p => p.id === art.projectId);
    if (!proj) return;
    currentProject.set(proj);
    currentArticle.set(art);
    activeView.set('outline');
    appView.set('article');
  }

  function openCharacter(char) {
    const proj = $projects.find(p => p.id === char.projectId);
    if (!proj) return;
    currentProject.set(proj);
    currentCharacter.set(char);
    appView.set('character');
  }

  function openTimelineEvent(evt) {
    const proj = $projects.find(p => p.id === evt.projectId);
    if (!proj) return;
    currentProject.set(proj);
    currentTimelineEvent.set(evt);
    appView.set('timeline');
  }

  function openRelation(rel) {
    const proj = $projects.find(p => p.id === rel.projectId);
    if (!proj) return;
    currentProject.set(proj);
    currentRelation.set(rel);
    appView.set('relation');
  }

  const totalCount = $derived(
    $favoriteArticles.length + $favoriteCharacters.length +
    $favoriteTimeline.length + $favoriteRelations.length
  );
</script>

<div class="favorites-page">
  <div class="page-header">
    <h1>⭐ 我的最愛</h1>
    <p class="subtitle">共 {totalCount} 個項目</p>
  </div>

  <div class="tabs">
    {#each TABS as tab}
      <button
        class:active={activeTab === tab.key}
        onclick={() => activeTab = tab.key}
      >
        {tab.label}（{tabCount(tab.key)}）
      </button>
    {/each}
  </div>

  <div class="content">
    {#if activeTab === 'articles'}
      {#if $favoriteArticles.length === 0}
        <div class="empty">
          <p>還沒有最愛的文章</p>
          <p class="hint">在文章屬性面板點 ⭐ 標記</p>
        </div>
      {:else}
        <div class="item-list">
          {#each $favoriteArticles as art (art.id)}
            <div class="item-row" onclick={() => openArticle(art)}>
              <span class="item-icon">📄</span>
              <div class="item-info">
                <div class="item-title">{art.title}</div>
                <div class="item-meta">
                  <span class="project-tag">{projectName(art.projectId)}</span>
                  <span>{formatDate(art.updatedAt)}</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'characters'}
      {#if $favoriteCharacters.length === 0}
        <div class="empty">
          <p>還沒有最愛的角色卡</p>
          <p class="hint">在角色編輯頁點 ⭐ 標記</p>
        </div>
      {:else}
        <div class="char-grid">
          {#each $favoriteCharacters as char (char.id)}
            <div class="char-card" onclick={() => openCharacter(char)}>
              <div class="char-avatar">
                {#if char.avatar}
                  <img src={char.avatar} alt={char.name} />
                {:else}
                  <span>🎭</span>
                {/if}
              </div>
              <div class="char-name">{char.name}</div>
              <div class="char-project">{projectName(char.projectId)}</div>
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'timeline'}
      {#if $favoriteTimeline.length === 0}
        <div class="empty">
          <p>還沒有最愛的時間軸事件</p>
          <p class="hint">在事件編輯頁點 ⭐ 標記</p>
        </div>
      {:else}
        <div class="item-list">
          {#each $favoriteTimeline as evt (evt.id)}
            <div class="item-row" onclick={() => openTimelineEvent(evt)}>
              <span class="item-icon">⏳</span>
              <div class="item-info">
                <div class="item-title">{evt.title}</div>
                <div class="item-meta">
                  <span class="project-tag">{projectName(evt.projectId)}</span>
                  {#if evt.time}<span>{evt.time}</span>{/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}

    {:else if activeTab === 'relations'}
      {#if $favoriteRelations.length === 0}
        <div class="empty">
          <p>還沒有最愛的關係圖</p>
          <p class="hint">在關係圖編輯頁點 ⭐ 標記</p>
        </div>
      {:else}
        <div class="item-list">
          {#each $favoriteRelations as rel (rel.id)}
            <div class="item-row" onclick={() => openRelation(rel)}>
              <span class="item-icon">🕸</span>
              <div class="item-info">
                <div class="item-title">{rel.name}</div>
                <div class="item-meta">
                  <span class="project-tag">{projectName(rel.projectId)}</span>
                  <span>{rel.nodes?.length || 0} 個角色</span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .favorites-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
  }

  .page-header {
    margin-bottom: 24px;
  }

  h1 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .subtitle {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
    overflow-x: auto;
  }

  .tabs button {
    padding: 10px 16px;
    font-size: 14px;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    font-weight: 500;
    white-space: nowrap;
  }

  .tabs button:hover {
    color: var(--text);
  }

  .tabs button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .item-list {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .item-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }

  .item-row:last-child {
    border-bottom: none;
  }

  .item-row:hover {
    background: var(--bg-hover);
  }

  .item-icon {
    font-size: 16px;
    width: 24px;
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  .item-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 4px;
  }

  .item-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: var(--text-secondary);
    align-items: center;
    flex-wrap: wrap;
  }

  .project-tag {
    padding: 1px 6px;
    background: var(--accent-soft);
    color: var(--accent-text);
    border-radius: 3px;
    font-size: 10px;
    font-weight: 500;
  }

  .char-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .char-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .char-card:hover {
    border-color: var(--accent);
    box-shadow: var(--shadow-sm);
  }

  .char-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin: 0 auto 8px;
    overflow: hidden;
  }

  .char-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .char-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 2px;
  }

  .char-project {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-secondary);
    background: var(--bg-card);
    border: 1px dashed var(--border);
    border-radius: var(--radius);
  }

  .empty .hint {
    font-size: 12px;
    margin-top: 6px;
    color: var(--text-muted);
  }

  @media (max-width: 768px) {
    .favorites-page {
      padding: 16px;
    }

    .char-grid {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
  }
</style>
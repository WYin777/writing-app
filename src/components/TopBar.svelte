<script>
  import {
    searchQuery, theme, currentArticle, articles, appView,
    mobileSidebarOpen, isMobile
  } from '../lib/stores.js';
  import { createArticle, getAllArticles } from '../lib/db.js';
  import { exportMarkdown, exportTxt } from '../lib/export.js';

  let { onToggleTheme } = $props();
  let showExportMenu = $state(false);

  async function handleNew() {
    const id = await createArticle({ title: '未命名文章' });
    const list = await getAllArticles();
    articles.set(list);
    const newArticle = list.find(a => a.id === id);
    currentArticle.set(newArticle);
    appView.set('articles');
  }

  function handleExport(type) {
    if (!$currentArticle) {
      alert('請先選擇一篇文章');
      return;
    }
    if (type === 'md') exportMarkdown($currentArticle);
    if (type === 'txt') exportTxt($currentArticle);
    showExportMenu = false;
  }

  function toggleSidebar() {
    mobileSidebarOpen.update(v => !v);
  }
</script>

<header class="topbar">
  <div class="left">
    {#if $isMobile}
      <button class="hamburger" onclick={toggleSidebar} title="選單">
        ☰
      </button>
    {/if}
    <span class="logo">{#if $isMobile}📝{:else}📝 我的寫作庫{/if}</span>

    {#if !$isMobile}
      <nav class="view-nav">
        <button
          class:active={$appView === 'articles'}
          onclick={() => appView.set('articles')}
        >文章</button>
        <button
          class:active={$appView === 'characters'}
          onclick={() => appView.set('characters')}
        >角色卡</button>
        <button
          class:active={$appView === 'timeline'}
          onclick={() => appView.set('timeline')}
        >時間軸</button>
        <button
          class:active={$appView === 'relations'}
          onclick={() => appView.set('relations')}
        >關係圖</button>
      </nav>
    {/if}
  </div>

  <div class="center">
    <input
      type="text"
      class="search"
      placeholder="🔍 搜尋..."
      bind:value={$searchQuery}
    />
  </div>

  <div class="right">
    <button class="icon-btn" onclick={onToggleTheme} title="切換主題">
      {$theme === 'light' ? '🌙' : '☀️'}
    </button>

    {#if !$isMobile}
      <div class="export-wrapper">
        <button class="icon-btn" onclick={() => showExportMenu = !showExportMenu} title="匯出">⬇</button>
        {#if showExportMenu}
          <div class="export-menu">
            <button onclick={() => handleExport('md')}>📄 Markdown</button>
            <button onclick={() => handleExport('txt')}>📝 TXT</button>
          </div>
        {/if}
      </div>
    {/if}

    <button class="icon-btn primary" onclick={handleNew} title="新增文章">＋</button>
  </div>
</header>

{#if $isMobile}
  <div class="mobile-tabs">
    <button
      class:active={$appView === 'articles'}
      onclick={() => appView.set('articles')}
    >📄 文章</button>
    <button
      class:active={$appView === 'characters'}
      onclick={() => appView.set('characters')}
    >🎭 角色</button>
    <button
      class:active={$appView === 'timeline'}
      onclick={() => appView.set('timeline')}
    >⏳ 時間</button>
    <button
      class:active={$appView === 'relations'}
      onclick={() => appView.set('relations')}
    >🕸 關係</button>
  </div>
{/if}

<style>
  .topbar {
    height: 52px;
    display: flex;
    align-items: center;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    gap: 16px;
    flex-shrink: 0;
  }

  .left {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .hamburger {
    width: 36px;
    height: 36px;
    font-size: 20px;
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius);
  }

  .hamburger:hover {
    background: var(--bg-hover);
  }

  .logo {
    font-weight: 600;
    font-size: 15px;
    white-space: nowrap;
  }

  .view-nav {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: var(--bg-secondary);
    border-radius: var(--radius);
  }

  .view-nav button {
    padding: 5px 12px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .view-nav button:hover {
    color: var(--text);
  }

  .view-nav button.active {
    background: var(--bg);
    color: var(--text);
    font-weight: 500;
  }

  .center {
    flex: 1;
    display: flex;
    justify-content: center;
    min-width: 0;
  }

  .search {
    width: 100%;
    max-width: 400px;
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-secondary);
    outline: none;
    font-size: 13px;
    color: var(--text);
  }

  .search:focus {
    border-color: var(--accent);
  }

  .right {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
    align-items: center;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: var(--text);
  }

  .icon-btn:hover {
    background: var(--bg-hover);
  }

  .icon-btn.primary {
    background: var(--accent);
    color: white;
  }

  .icon-btn.primary:hover {
    background: var(--accent-hover);
  }

  .export-wrapper {
    position: relative;
  }

  .export-menu {
    position: absolute;
    top: 44px;
    right: 0;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 4px;
    display: flex;
    flex-direction: column;
    min-width: 140px;
    z-index: 100;
  }

  .export-menu button {
    padding: 8px 12px;
    text-align: left;
    font-size: 13px;
    border-radius: 3px;
    color: var(--text);
  }

  .export-menu button:hover {
    background: var(--bg-hover);
  }

  .mobile-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
  }

  .mobile-tabs button {
    flex: 1;
    padding: 12px 4px;
    font-size: 12px;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
  }

  .mobile-tabs button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    font-weight: 500;
  }

  @media (max-width: 768px) {
    .topbar {
      padding: 0 8px;
      gap: 8px;
    }

    .search {
      font-size: 14px;
      padding: 8px 10px;
    }
  }
</style>
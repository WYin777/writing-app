<script>
  import { onMount } from 'svelte';
  import {
    db, getAllArticles, collectTags, getFoldersByType
  } from './lib/db.js';
  import {
    articles, theme, currentArticle, activeView, tags, appView,
    articleFolders, characterFolders, timelineFolders, relationFolders, allFolders,
    mobileSidebarOpen, mobilePropsOpen, isMobile
  } from './lib/stores.js';
  import TopBar from './components/TopBar.svelte';
  import Sidebar from './components/Sidebar.svelte';
  import ArticleList from './components/ArticleList.svelte';
  import OutlineEditor from './components/OutlineEditor.svelte';
  import GameOutlineEditor from './components/GameOutlineEditor.svelte';
  import RichTextEditor from './components/RichTextEditor.svelte';
  import PropertiesPanel from './components/PropertiesPanel.svelte';
  import CharacterManager from './components/CharacterManager.svelte';
  import TimelineManager from './components/TimelineManager.svelte';
  import RelationManager from './components/RelationManager.svelte';

  onMount(async () => {
    const settings = await db.settings.get('main');
    if (settings?.theme) theme.set(settings.theme);

    const list = await getAllArticles();
    articles.set(list);

    const tagList = await collectTags();
    tags.set(tagList);

    const [aFolders, cFolders, tFolders, rFolders] = await Promise.all([
      getFoldersByType('article'),
      getFoldersByType('character'),
      getFoldersByType('timeline'),
      getFoldersByType('relation')
    ]);
    articleFolders.set(aFolders);
    characterFolders.set(cFolders);
    timelineFolders.set(tFolders);
    relationFolders.set(rFolders);
    allFolders.set([...aFolders, ...cFolders, ...tFolders, ...rFolders]);

    if (list.length > 0) {
      currentArticle.set(list[0]);
    }
  });

  async function toggleTheme() {
    const newTheme = $theme === 'light' ? 'dark' : 'light';
    theme.set(newTheme);
    await db.settings.update('main', { theme: newTheme });
  }

  function closeMobilePanels() {
    mobileSidebarOpen.set(false);
    mobilePropsOpen.set(false);
  }
</script>

<div class="app">
  <TopBar onToggleTheme={toggleTheme} />

  {#if $appView === 'articles'}
    <div class="main">
      <!-- 左側欄：桌面顯示，手機抽屜 -->
      {#if !$isMobile}
        <aside class="left">
          <Sidebar />
          <ArticleList />
        </aside>
      {:else if $mobileSidebarOpen}
        <div class="mobile-overlay" onclick={closeMobilePanels}></div>
        <aside class="mobile-drawer left">
          <Sidebar />
          <ArticleList />
        </aside>
      {/if}

      <section class="center">
        {#if $currentArticle}
          <div class="view-tabs">
            <button
              class:active={$activeView === 'outline'}
              onclick={() => activeView.set('outline')}
            >大綱</button>
            <button
              class:active={$activeView === 'content'}
              onclick={() => activeView.set('content')}
            >正文</button>
            {#if $isMobile}
              <button
                class="mobile-props-btn"
                onclick={() => mobilePropsOpen.set(true)}
              >⚙ 屬性</button>
            {/if}
          </div>

          <div class="editor-area" class:with-editor={$activeView === 'content'}>
            {#if $activeView === 'outline'}
              {#if $currentArticle.outlineType === 'game'}
                <GameOutlineEditor />
              {:else}
                <OutlineEditor />
              {/if}
            {:else}
              <RichTextEditor />
            {/if}
          </div>
        {:else}
          <div class="empty">
            <p>還沒有文章</p>
            <p class="hint">點右上角「＋新增」開始寫作</p>
          </div>
        {/if}
      </section>

      <!-- 右側屬性面板：桌面顯示，手機底部彈出 -->
      {#if !$isMobile}
        <aside class="right">
          {#if $currentArticle}
            <PropertiesPanel />
          {/if}
        </aside>
      {:else if $mobilePropsOpen}
        <div class="mobile-overlay" onclick={closeMobilePanels}></div>
        <aside class="mobile-bottom-panel">
          <div class="panel-header">
            <span>文章屬性</span>
            <button class="close-btn" onclick={() => mobilePropsOpen.set(false)}>×</button>
          </div>
          <div class="panel-body">
            {#if $currentArticle}
              <PropertiesPanel />
            {/if}
          </div>
        </aside>
      {/if}
    </div>
  {:else if $appView === 'characters'}
    <div class="full-view">
      <CharacterManager />
    </div>
  {:else if $appView === 'timeline'}
    <div class="full-view">
      <TimelineManager />
    </div>
  {:else if $appView === 'relations'}
    <div class="full-view">
      <RelationManager />
    </div>
  {/if}
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .main {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  .full-view {
    flex: 1;
    overflow: hidden;
  }

  .left {
    width: 260px;
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .center {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .view-tabs {
    display: flex;
    gap: 4px;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    align-items: center;
    flex-shrink: 0;
  }

  .view-tabs button {
    padding: 6px 14px;
    border-radius: var(--radius);
    color: var(--text-secondary);
    font-size: 14px;
  }

  .view-tabs button.active {
    background: var(--bg-hover);
    color: var(--text);
    font-weight: 500;
  }

  .mobile-props-btn {
    margin-left: auto;
    color: var(--accent) !important;
    font-size: 13px !important;
  }

  .editor-area {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
  }

  .editor-area.with-editor {
    align-items: stretch;
    justify-content: stretch;
  }

  .right {
    width: 280px;
    border-left: 1px solid var(--border);
    background: var(--bg-secondary);
    overflow: auto;
    flex-shrink: 0;
  }

  .empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    gap: 8px;
    padding: 24px;
    text-align: center;
  }

  .hint {
    font-size: 13px;
  }

  /* 手機版 */
  .mobile-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .mobile-drawer {
    position: fixed;
    top: 52px;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 85vw;
    background: var(--bg-secondary);
    z-index: 101;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 2px 0 12px rgba(0,0,0,0.15);
    animation: slideInLeft 0.25s ease;
  }

  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  .mobile-bottom-panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 80vh;
    background: var(--bg-secondary);
    z-index: 101;
    border-radius: 16px 16px 0 0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -4px 16px rgba(0,0,0,0.15);
    animation: slideUp 0.25s ease;
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 20px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    background: var(--bg-hover);
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .view-tabs {
      padding: 6px 12px;
    }

    .view-tabs button {
      padding: 8px 16px;
      font-size: 15px;
      min-height: 40px;
    }
  }
</style>
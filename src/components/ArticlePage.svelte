<script>
  import { onMount } from 'svelte';
  import {
    currentArticle, currentProject, activeView, appView, articles,
    isMobile, mobilePropsOpen
  } from '../lib/stores.js';
  import { updateArticle, deleteArticle } from '../lib/db.js';
  import { loadAll } from '../lib/data.js';
  import OutlineEditor from './OutlineEditor.svelte';
  import GameOutlineEditor from './GameOutlineEditor.svelte';
  import RichTextEditor from './RichTextEditor.svelte';
  import PropertiesPanel from './PropertiesPanel.svelte';

  const article = $derived($currentArticle);

  function goBack() {
    currentArticle.set(null);
    appView.set('project');
  }

  async function handleDelete() {
    if (!confirm(`確定刪除「${article.title}」？`)) return;
    await deleteArticle(article.id);
    await loadAll();
    goBack();
  }

  async function toggleFavorite() {
    await updateArticle(article.id, { favorite: !article.favorite });
    await loadAll();
    currentArticle.update(a => ({ ...a, favorite: !a.favorite }));
  }
</script>

{#if article}
  <div class="article-page">
    <div class="topbar">
      <div class="left">
        <button class="back-btn" onclick={goBack}>
          ← {$currentProject?.name || '返回'}
        </button>
        <div class="view-tabs">
          <button
            class:active={$activeView === 'outline'}
            onclick={() => activeView.set('outline')}
          >大綱</button>
          <button
            class:active={$activeView === 'content'}
            onclick={() => activeView.set('content')}
          >正文</button>
        </div>
      </div>

      <div class="right">
        <button
          class="icon-btn"
          class:active={article.favorite}
          onclick={toggleFavorite}
          title="我的最愛"
        >{article.favorite ? '★' : '☆'}</button>
        {#if $isMobile}
          <button class="icon-btn" onclick={() => mobilePropsOpen.set(true)} title="屬性">⚙</button>
        {/if}
        <button class="icon-btn danger" onclick={handleDelete} title="刪除">🗑</button>
      </div>
    </div>

    <div class="article-body">
      <div class="editor-area" class:with-editor={$activeView === 'content'}>
        {#if $activeView === 'outline'}
          {#if article.outlineType === 'game'}
            <GameOutlineEditor />
          {:else}
            <OutlineEditor />
          {/if}
        {:else}
          <RichTextEditor />
        {/if}
      </div>

      {#if !$isMobile}
        <aside class="props-panel">
          <PropertiesPanel />
        </aside>
      {/if}
    </div>

    {#if $isMobile && $mobilePropsOpen}
      <div class="mobile-overlay" onclick={() => mobilePropsOpen.set(false)}></div>
      <aside class="mobile-bottom-panel">
        <div class="panel-header">
          <span>文章屬性</span>
          <button class="close-btn" onclick={() => mobilePropsOpen.set(false)}>×</button>
        </div>
        <div class="panel-body">
          <PropertiesPanel />
        </div>
      </aside>
    {/if}
  </div>
{/if}

<style>
  .article-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
    gap: 12px;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
  }

  .back-btn {
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  .back-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .view-tabs {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
  }

  .view-tabs button {
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .view-tabs button.active {
    background: var(--bg-card);
    color: var(--text);
    box-shadow: var(--shadow-sm);
  }

  .right {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }

  .icon-btn {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-sm);
    font-size: 15px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .icon-btn.active {
    color: var(--warning);
  }

  .icon-btn.danger:hover {
    background: var(--danger-soft);
    color: var(--danger);
  }

  .article-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .editor-area {
    flex: 1;
    overflow: auto;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    min-width: 0;
  }

  .editor-area.with-editor {
    align-items: stretch;
    justify-content: stretch;
  }

  .props-panel {
    width: 280px;
    border-left: 1px solid var(--border);
    background: var(--bg-secondary);
    overflow: auto;
    flex-shrink: 0;
  }

  .mobile-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
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
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.15);
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
  }

  .panel-body {
    flex: 1;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
  .topbar {
    padding: 8px 12px;
    gap: 8px;
  }

  .back-btn {
    max-width: 100px;
    font-size: 12px;
    padding: 6px 8px;
  }

  .view-tabs button {
    padding: 5px 10px;
    font-size: 12px;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
</style>
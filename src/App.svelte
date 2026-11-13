<script>
  import { onMount } from 'svelte';
  import { db } from './lib/db.js';
  import {
    theme, appView, currentProject, currentArticle,
    currentCharacter, currentTimelineEvent, currentRelation,
    projects, articles, characters, timelineEvents, relations
  } from './lib/stores.js';
  import { loadAll } from './lib/data.js';
  import Home from './components/Home.svelte';
  import ProjectPage from './components/ProjectPage.svelte';
  import ArticlePage from './components/ArticlePage.svelte';
  import CharacterPage from './components/CharacterPage.svelte';
  import TimelinePage from './components/TimelinePage.svelte';
  import RelationPage from './components/RelationPage.svelte';
  import FavoritesPage from './components/FavoritesPage.svelte';
  import BackupPage from './components/BackupPage.svelte';

  function saveNavState() {
    if (typeof localStorage === 'undefined') return;
    const state = {
      appView: $appView,
      projectId: $currentProject?.id || null,
      articleId: $currentArticle?.id || null,
      characterId: $currentCharacter?.id || null,
      timelineId: $currentTimelineEvent?.id || null,
      relationId: $currentRelation?.id || null
    };
    localStorage.setItem('nav_state', JSON.stringify(state));
  }

  function restoreNavState() {
    if (typeof localStorage === 'undefined') return false;
    try {
      const raw = localStorage.getItem('nav_state');
      if (!raw) return false;
      const state = JSON.parse(raw);

      const proj = state.projectId ? $projects.find(p => p.id === state.projectId) : null;
      if (!proj) return false;
      currentProject.set(proj);

      if (state.appView === 'article' && state.articleId) {
        const art = $articles.find(a => a.id === state.articleId);
        if (art) {
          currentArticle.set(art);
          appView.set('article');
          return true;
        }
      }
      if (state.appView === 'character' && state.characterId) {
        const c = $characters.find(x => x.id === state.characterId);
        if (c) {
          currentCharacter.set(c);
          appView.set('character');
          return true;
        }
      }
      if (state.appView === 'timeline' && state.timelineId) {
        const t = $timelineEvents.find(x => x.id === state.timelineId);
        if (t) {
          currentTimelineEvent.set(t);
          appView.set('timeline');
          return true;
        }
      }
      if (state.appView === 'relation' && state.relationId) {
        const r = $relations.find(x => x.id === state.relationId);
        if (r) {
          currentRelation.set(r);
          appView.set('relation');
          return true;
        }
      }
      if (state.appView === 'project') {
        appView.set('project');
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async function toggleTheme() {
    const newTheme = $theme === 'light' ? 'dark' : 'light';
    theme.set(newTheme);
    await db.settings.update('main', { theme: newTheme });
  }

  onMount(async () => {
    const settings = await db.settings.get('main');
    if (settings?.theme) theme.set(settings.theme);
    await loadAll();
    restoreNavState();
  });

  $effect(() => {
    $appView; $currentProject; $currentArticle;
    $currentCharacter; $currentTimelineEvent; $currentRelation;
    saveNavState();
  });
</script>

<div class="app">
  <header class="topbar">
    <div class="left">
      <span class="logo">📝 我的寫作庫</span>
    </div>
    <div class="right">
      <button class="top-btn" onclick={() => appView.set('home')}>🏠 首頁</button>
      <button class="top-btn" onclick={() => appView.set('favorites')}>⭐ 最愛</button>
      <button class="top-btn" onclick={() => appView.set('backup')}>💾 備份</button>
      <button class="top-btn theme-btn" onclick={toggleTheme}>
        {$theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  </header>

  <main class="main">
    {#if $appView === 'home'}
      <Home />
    {:else if $appView === 'project'}
      <ProjectPage />
    {:else if $appView === 'article'}
      <ArticlePage />
    {:else if $appView === 'character'}
      <CharacterPage />
    {:else if $appView === 'timeline'}
      <TimelinePage />
    {:else if $appView === 'relation'}
      <RelationPage />
    {:else if $appView === 'favorites'}
      <FavoritesPage />
    {:else if $appView === 'backup'}
      <BackupPage />
    {:else}
      <div class="coming">這個頁面不存在</div>
    {/if}
  </main>
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .topbar {
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
    gap: 12px;
  }

  .logo {
    font-weight: 600;
    font-size: 15px;
  }

  .right {
    display: flex;
    gap: 4px;
  }

  .top-btn {
    padding: 6px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text);
    white-space: nowrap;
  }

  .top-btn:hover {
    background: var(--bg-hover);
  }

  .theme-btn {
    width: 36px;
    padding: 6px;
  }

  .main {
    flex: 1;
    overflow: auto;
  }

  .coming {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .topbar {
      padding: 0 8px;
      gap: 4px;
    }

    .logo {
      font-size: 13px;
    }

    .top-btn {
      padding: 6px 6px;
      font-size: 11px;
    }
  }
</style>
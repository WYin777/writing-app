import { writable, derived } from 'svelte/store';

// ── 主題 ──
export const theme = writable('light');

theme.subscribe(value => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', value);
  }
});

// ── 全域資料 ──
export const projects = writable([]);
export const currentProject = writable(null);
export const articles = writable([]);
export const characters = writable([]);
export const timelineEvents = writable([]);
export const relations = writable([]);
export const settings = writable({});

// ── 當前選中 ──
export const currentArticle = writable(null);
export const currentCharacter = writable(null);
export const currentTimelineEvent = writable(null);
export const currentRelation = writable(null);

// ── 檢視狀態 ──
export const appView = writable('home');           // home / project / favorites / settings
export const projectTab = writable('articles');    // articles / characters / timeline / relations
export const activeView = writable('outline');     // outline / content
export const searchQuery = writable('');

// ── 手機 UI ──
export const mobileSidebarOpen = writable(false);
export const mobilePropsOpen = writable(false);
export const isMobile = writable(false);

if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(max-width: 768px)');
  isMobile.set(mq.matches);
  mq.addEventListener('change', (e) => isMobile.set(e.matches));
}

// ── 專案統計（給專案卡片用）──
export const projectStats = derived(
  [projects, articles, characters, timelineEvents, relations],
  ([$projects, $articles, $characters, $timeline, $relations]) => {
    return $projects.map(p => ({
      ...p,
      articleCount: $articles.filter(a => a.projectId === p.id).length,
      characterCount: $characters.filter(c => c.projectId === p.id).length,
      timelineCount: $timeline.filter(t => t.projectId === p.id).length,
      relationCount: $relations.filter(r => r.projectId === p.id).length
    }));
  }
);

// ── 當前專案的文章 ──
export const currentProjectArticles = derived(
  [currentProject, articles],
  ([$currentProject, $articles]) => {
    if (!$currentProject) return [];
    return $articles
      .filter(a => a.projectId === $currentProject.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
);

export const currentProjectCharacters = derived(
  [currentProject, characters],
  ([$currentProject, $characters]) => {
    if (!$currentProject) return [];
    return $characters.filter(c => c.projectId === $currentProject.id);
  }
);

export const currentProjectTimeline = derived(
  [currentProject, timelineEvents],
  ([$currentProject, $timeline]) => {
    if (!$currentProject) return [];
    return $timeline
      .filter(t => t.projectId === $currentProject.id)
      .sort((a, b) => (a.timeOrder || 0) - (b.timeOrder || 0));
  }
);

export const currentProjectRelations = derived(
  [currentProject, relations],
  ([$currentProject, $relations]) => {
    if (!$currentProject) return [];
    return $relations.filter(r => r.projectId === $currentProject.id);
  }
);

// ── 我的最愛（跨專案）──
export const favoriteArticles = derived(articles, $articles =>
  $articles.filter(a => a.favorite)
);
export const favoriteCharacters = derived(characters, $characters =>
  $characters.filter(c => c.favorite)
);
export const favoriteTimeline = derived(timelineEvents, $timeline =>
  $timeline.filter(t => t.favorite)
);
export const favoriteRelations = derived(relations, $relations =>
  $relations.filter(r => r.favorite)
);

// ── 最近編輯 ──
export const recentEdits = derived(
  [projects, articles, characters, timelineEvents, relations],
  ([$projects, $articles, $characters, $timeline, $relations]) => {
    const items = [];

    for (const a of $articles) {
      const proj = $projects.find(p => p.id === a.projectId);
      if (proj) {
        items.push({
          type: 'article',
          projectId: a.projectId,
          projectName: proj.name,
          id: a.id,
          title: a.title,
          updatedAt: a.updatedAt
        });
      }
    }

    for (const c of $characters) {
      const proj = $projects.find(p => p.id === c.projectId);
      if (proj) {
        items.push({
          type: 'character',
          projectId: c.projectId,
          projectName: proj.name,
          id: c.id,
          title: c.name,
          updatedAt: c.updatedAt
        });
      }
    }

    return items.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  }
);

// ── 工具函式 ──
export function toggleFavorite(type, item) {
  if (type === 'article') {
    articles.update(list => list.map(x => x.id === item.id ? { ...x, favorite: !x.favorite } : x));
    currentArticle.update(a => a && a.id === item.id ? { ...a, favorite: !a.favorite } : a);
  } else if (type === 'character') {
    characters.update(list => list.map(x => x.id === item.id ? { ...x, favorite: !x.favorite } : x));
  } else if (type === 'timeline') {
    timelineEvents.update(list => list.map(x => x.id === item.id ? { ...x, favorite: !x.favorite } : x));
  } else if (type === 'relation') {
    relations.update(list => list.map(x => x.id === item.id ? { ...x, favorite: !x.favorite } : x));
  }
}
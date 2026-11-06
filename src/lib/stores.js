import { writable, derived } from 'svelte/store';

export const currentArticle = writable(null);
export const articles = writable([]);
export const categories = writable([]);
export const tags = writable([]);
export const theme = writable('light');
export const searchQuery = writable('');
export const activeView = writable('outline');
export const sidebarOpen = writable(true);
export const relationFolders = writable([]);
export const relationFolderFilter = writable(null);

// 篩選
export const filterType = writable('all');           // all / favorite / folder / tag
export const filterFolderId = writable(null);
export const filterTag = writable(null);
export const favorites = writable(new Set());

// 檢視
export const appView = writable('articles');

// 資料夾
export const articleFolders = writable([]);
export const characterFolders = writable([]);
export const timelineFolders = writable([]);

// 載入我的最愛
if (typeof localStorage !== 'undefined') {
  try {
    const stored = JSON.parse(localStorage.getItem('favorites') || '[]');
    favorites.set(new Set(stored));
  } catch (e) {}
}

favorites.subscribe(value => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('favorites', JSON.stringify([...value]));
  }
});

theme.subscribe(value => {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', value);
  }
});

// 文章篩選
export const filteredArticles = derived(
  [articles, searchQuery, filterType, filterFolderId, filterTag, favorites],
  ([$articles, $query, $type, $folderId, $tag, $favs]) => {
    let list = $articles;

    if ($type === 'favorite') {
      list = list.filter(a => $favs.has(a.id));
    } else if ($type === 'folder') {
      list = list.filter(a => a.folderId === $folderId);
    } else if ($type === 'tag') {
      list = list.filter(a => (a.tags || []).includes($tag));
    }

    if ($query.trim()) {
      const q = $query.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.summary || '').toLowerCase().includes(q) ||
        (a.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    return list;
  }
);

export function resetFilter() {
  filterType.set('all');
  filterFolderId.set(null);
  filterTag.set(null);
}

export function toggleFavorite(articleId) {
  favorites.update(set => {
    const newSet = new Set(set);
    if (newSet.has(articleId)) newSet.delete(articleId);
    else newSet.add(articleId);
    return newSet;
  });
}

// 所有資料夾（三類合併）
export const allFolders = writable([]);

// 跨頁切換：點資料夾時觸發
export function openFolder(folder) {
  if (!folder) return;
  if (folder.type === 'article') {
    appView.set('articles');
    filterType.set('folder');
    filterFolderId.set(folder.id);
    filterTag.set(null);
  } else if (folder.type === 'character') {
    appView.set('characters');
    characterFolderFilter.set(folder.id);
  } else if (folder.type === 'timeline') {
    appView.set('timeline');
    timelineFolderFilter.set(folder.id);
  } else if (folder.type === 'relation') {
    appView.set('relations');
    relationFolderFilter.set(folder.id);
  }
}

// 需要新增這兩個 store（如果還沒有）
export const characterFolderFilter = writable(null);
export const timelineFolderFilter = writable(null);

// 手機版 UI 狀態
export const mobileSidebarOpen = writable(false);   // 左側抽屜
export const mobilePropsOpen = writable(false);     // 右側屬性面板（底部彈出）
export const isMobile = writable(false);

// 偵測螢幕尺寸
if (typeof window !== 'undefined') {
  const mq = window.matchMedia('(max-width: 768px)');
  isMobile.set(mq.matches);
  mq.addEventListener('change', (e) => isMobile.set(e.matches));
}
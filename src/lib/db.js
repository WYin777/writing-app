import Dexie from 'dexie';

export const db = new Dexie('WritingApp');

db.version(3).stores({
  articles: '++id, title, categoryId, folderId, status, outlineType, createdAt, updatedAt, *tags',
  categories: '++id, name, parentId, order',
  tags: '++id, name, color',
  folders: '++id, name, type, parentId, order',
  characters: '++id, name, folderId, createdAt, *tags',
  timelineEvents: '++id, title, folderId, timeOrder, createdAt',
  relations: '++id, updatedAt',
  branches: '++id, articleId, updatedAt',
  attachments: '++id, name, type, createdAt',
  settings: 'key'
});

// 從 version 2 升級到 version 3
db.version(3).upgrade(async (tx) => {
  // 文章加上 folderId
  await tx.table('articles').toCollection().modify((article) => {
    if (article.folderId === undefined) article.folderId = null;
  });
  // 角色卡加上 folderId
  await tx.table('characters').toCollection().modify((char) => {
    if (char.folderId === undefined) char.folderId = null;
  });
  // 時間軸加上 folderId
  await tx.table('timelineEvents').toCollection().modify((evt) => {
    if (evt.folderId === undefined) evt.folderId = null;
  });
});

db.version(4).stores({
  articles: '++id, title, categoryId, folderId, status, outlineType, createdAt, updatedAt, *tags',
  categories: '++id, name, parentId, order',
  tags: '++id, name, color',
  folders: '++id, name, type, parentId, order',
  characters: '++id, name, folderId, createdAt, *tags',
  timelineEvents: '++id, title, folderId, timeOrder, createdAt',
  relations: '++id, name, folderId, updatedAt',
  branches: '++id, articleId, updatedAt',
  attachments: '++id, name, type, createdAt',
  settings: 'key'
});

// 從 version 3 升級到 version 4
db.version(4).upgrade(async (tx) => {
  await tx.table('relations').toCollection().modify((rel) => {
    if (rel.folderId === undefined) rel.folderId = null;
    if (!rel.name) rel.name = '未命名關係圖';
  });
});

export async function initSettings() {
  const existing = await db.settings.get('main');
  if (!existing) {
    await db.settings.put({
      key: 'main',
      theme: 'light',
      fontFamily: 'system',
      fontSize: 16,
      outlineColors: [
        '#ef4444', '#f59e0b', '#10b981',
        '#3b82f6', '#8b5cf6', '#6b7280'
      ]
    });
  }
}

export function makeOutlineNode(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    text: '',
    color: null,
    bold: false,
    collapsed: false,
    note: '',
    type: 'text',
    data: {},
    children: [],
    nodeKind: 'scene',
    choices: [],
    affection: {},
    conditions: [],
    flags: [],
    items: [],
    endingTag: null,
    ...overrides
  };
}

export function makeChoice(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    text: '',
    affection: {},
    conditions: [],
    flags: [],
    items: [],
    jumpTo: null,
    ...overrides
  };
}

export async function createArticle(data = {}) {
  const now = Date.now();
  const outlineType = data.outlineType || 'book';
  return await db.articles.add({
    title: data.title || '未命名文章',
    categoryId: data.categoryId || null,
    folderId: data.folderId || null,
    tags: data.tags || [],
    status: data.status || 'draft',
    outlineType,
    coverImage: data.coverImage || null,
    summary: data.summary || '',
    outline: data.outline || [
      makeOutlineNode({
        text: '第一章',
        nodeKind: 'scene'
      })
    ],
    content: data.content || '<p></p>',
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now
  });
}

export async function updateArticle(id, changes) {
  return await db.articles.update(id, {
    ...changes,
    updatedAt: Date.now()
  });
}

export async function deleteArticle(id) {
  return await db.articles.delete(id);
}

export async function getAllArticles() {
  return await db.articles.orderBy('updatedAt').reverse().toArray();
}

export async function getArticle(id) {
  return await db.articles.get(Number(id));
}

// 分類
export async function createCategory(name, parentId = null) {
  const order = await db.categories.count();
  return await db.categories.add({
    name,
    parentId,
    order
  });
}

export async function renameCategory(id, name) {
  return await db.categories.update(id, { name });
}

export async function deleteCategory(id) {
  await db.articles.where('categoryId').equals(id).modify({ categoryId: null });
  return await db.categories.delete(id);
}

export async function getAllCategories() {
  return await db.categories.orderBy('order').toArray();
}

// 從文章收集標籤
export async function collectTags() {
  const allArticles = await db.articles.toArray();
  const tagMap = new Map();
  for (const a of allArticles) {
    for (const t of (a.tags || [])) {
      if (!tagMap.has(t)) {
        tagMap.set(t, { name: t, count: 0 });
      }
      tagMap.get(t).count++;
    }
  }
  return Array.from(tagMap.values()).sort((a, b) => b.count - a.count);
}

export async function clearAllData() {
  await db.articles.clear();
  await db.categories.clear();
  await db.tags.clear();
  await db.folders.clear();
  await db.characters.clear();
  await db.timelineEvents.clear();
  await db.relations.clear();
  await db.branches.clear();
  await db.attachments.clear();
}

// ── 統一資料夾 ──
// type: 'article' | 'character' | 'timeline'

export async function createFolder(name, type, parentId = null) {
  const count = await db.folders.where('type').equals(type).count();
  return await db.folders.add({
    name,
    type,
    parentId,
    order: count
  });
}

export async function renameFolder(id, name) {
  return await db.folders.update(id, { name });
}

export async function deleteFolder(id) {
  const folder = await db.folders.get(id);
  if (!folder) return;
  // 把子資料夾與項目的 parentId 設為 null
  const children = await db.folders.where('parentId').equals(id).toArray();
  for (const child of children) {
    await db.folders.update(child.id, { parentId: folder.parentId });
  }
  if (folder.type === 'article') {
    await db.articles.where('folderId').equals(id).modify({ folderId: null });
  } else if (folder.type === 'character') {
    await db.characters.where('folderId').equals(id).modify({ folderId: null });
  } else if (folder.type === 'timeline') {
    await db.timelineEvents.where('folderId').equals(id).modify({ folderId: null });
  }
  return await db.folders.delete(id);
}

export async function getFoldersByType(type) {
  return await db.folders.where('type').equals(type).sortBy('order');
}
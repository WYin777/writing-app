import Dexie from 'dexie';

export const db = new Dexie('WritingApp');

// ── 保留舊版本歷史（不要刪） ──
db.version(3).stores({
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

db.version(4).upgrade(async (tx) => {
  await tx.table('relations').toCollection().modify((rel) => {
    if (rel.folderId === undefined) rel.folderId = null;
    if (!rel.name) rel.name = '未命名關係圖';
  });
});

// ── 新的 version 5：專案系統 ──
db.version(5).stores({
  projects: '++id, name, type, status, createdAt, updatedAt, *tags',
  articles: '++id, projectId, title, outlineType, status, favorite, createdAt, updatedAt, *tags',
  characters: '++id, projectId, name, favorite, createdAt, updatedAt, *tags',
  timelineEvents: '++id, projectId, title, timeOrder, favorite, createdAt, updatedAt',
  relations: '++id, projectId, name, favorite, updatedAt',
  branches: '++id, articleId, updatedAt',
  attachments: '++id, name, type, createdAt',
  settings: 'key'
});

db.version(5).upgrade(async (tx) => {
  // 建立預設專案
  const defaultProjectId = await tx.table('projects').add({
    name: '預設專案',
    type: 'other',
    coverImage: null,
    summary: '原有資料已遷移到此專案',
    status: 'writing',
    tags: [],
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // 所有文章歸到預設專案
  await tx.table('articles').toCollection().modify((a) => {
    a.projectId = defaultProjectId;
    if (a.favorite === undefined) a.favorite = false;
    // 移除舊欄位
    delete a.categoryId;
    delete a.folderId;
  });

  // 所有角色歸到預設專案
  await tx.table('characters').toCollection().modify((c) => {
    c.projectId = defaultProjectId;
    if (c.favorite === undefined) c.favorite = false;
    delete c.folderId;
  });

  // 所有時間軸歸到預設專案
  await tx.table('timelineEvents').toCollection().modify((e) => {
    e.projectId = defaultProjectId;
    if (e.favorite === undefined) e.favorite = false;
    delete e.folderId;
  });

  // 所有關係圖歸到預設專案
  await tx.table('relations').toCollection().modify((r) => {
    r.projectId = defaultProjectId;
    if (r.favorite === undefined) r.favorite = false;
    delete r.folderId;
  });
});

// ── 初始設定 ──
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
      ],
      projectTypes: ['遊戲', '小說', '隨筆', '其他'],
      presetTags: [
        '現代', '古風', '架空', '黑道', '刑警',
        '娛樂圈', '校園', '異能', '懸疑推理',
        '組織殺手', '辦公室', '家族', 'ABO'
      ]
    });
  }
}

// ── 專案 ──
export async function createProject(data = {}) {
  const now = Date.now();
  return await db.projects.add({
    name: data.name || '未命名專案',
    type: data.type || 'other',
    coverImage: data.coverImage || null,
    summary: data.summary || '',
    status: data.status || 'writing',
    tags: data.tags || [],
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now
  });
}

export async function updateProject(id, changes) {
  return await db.projects.update(id, {
    ...changes,
    updatedAt: Date.now()
  });
}

export async function deleteProject(id) {
  // 刪除專案底下所有東西
  await db.articles.where('projectId').equals(id).delete();
  await db.characters.where('projectId').equals(id).delete();
  await db.timelineEvents.where('projectId').equals(id).delete();
  await db.relations.where('projectId').equals(id).delete();
  return await db.projects.delete(id);
}

export async function getAllProjects() {
  return await db.projects.orderBy('updatedAt').reverse().toArray();
}

// ── 大綱節點 / 選擇 ──
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

// ── 文章 ──
export async function createArticle(projectId, data = {}) {
  const now = Date.now();
  const outlineType = data.outlineType || 'book';
  return await db.articles.add({
    projectId,
    title: data.title || '未命名文章',
    tags: data.tags || [],
    status: data.status || 'draft',
    outlineType,
    favorite: false,
    coverImage: data.coverImage || null,
    summary: data.summary || '',
    outline: data.outline || [
      makeOutlineNode({ text: '第一章', nodeKind: 'scene' })
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

export async function getArticlesByProject(projectId) {
  return await db.articles
    .where('projectId').equals(projectId)
    .reverse()
    .sortBy('updatedAt');
}

export async function getAllArticles() {
  return await db.articles.orderBy('updatedAt').reverse().toArray();
}

// ── 角色 ──
export async function createCharacter(projectId, data = {}) {
  const now = Date.now();
  return await db.characters.add({
    projectId,
    name: data.name || '未命名角色',
    alias: '',
    age: '',
    gender: '未設定',
    birthday: '',
    avatar: '',
    appearance: '',
    personality: '',
    background: '',
    abilities: '',
    tags: [],
    notes: '',
    favorite: false,
    createdAt: now,
    updatedAt: now
  });
}

export async function getCharactersByProject(projectId) {
  return await db.characters
    .where('projectId').equals(projectId)
    .toArray();
}

// ── 時間軸 ──
export async function createTimelineEvent(projectId, data = {}) {
  const now = Date.now();
  return await db.timelineEvents.add({
    projectId,
    title: data.title || '未命名事件',
    time: '',
    timeOrder: 0,
    location: '',
    characterIds: [],
    description: '',
    images: [],
    notes: '',
    favorite: false,
    createdAt: now,
    updatedAt: now
  });
}

export async function getTimelineByProject(projectId) {
  return await db.timelineEvents
    .where('projectId').equals(projectId)
    .toArray();
}

// ── 關係圖 ──
export async function createRelation(projectId, data = {}) {
  const now = Date.now();
  return await db.relations.add({
    projectId,
    name: data.name || '未命名關係圖',
    nodes: [],
    edges: [],
    favorite: false,
    createdAt: now,
    updatedAt: now
  });
}

export async function getRelationsByProject(projectId) {
  return await db.relations
    .where('projectId').equals(projectId)
    .toArray();
}

// ── 清除全部 ──
export async function clearAllData() {
  await db.projects.clear();
  await db.articles.clear();
  await db.characters.clear();
  await db.timelineEvents.clear();
  await db.relations.clear();
  await db.branches.clear();
  await db.attachments.clear();
}
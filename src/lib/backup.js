import { db } from './db.js';
import { saveAs } from 'file-saver';

// 匯出整個資料庫為 JSON
export async function exportBackup() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    articles: await db.articles.toArray(),
    categories: await db.categories.toArray(),
    tags: await db.tags.toArray(),
    folders: await db.folders.toArray(),
    characters: await db.characters.toArray(),
    timelineEvents: await db.timelineEvents.toArray(),
    relations: await db.relations.toArray(),
    branches: await db.branches.toArray(),
    attachments: await db.attachments.toArray(),
    settings: await db.settings.toArray()
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const filename = `寫作庫備份_${new Date().toISOString().slice(0, 10)}.json`;
  saveAs(blob, filename);
}

// 匯入 JSON（覆蓋現有資料）
export async function importBackup(file, mode = 'replace') {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.version) {
    throw new Error('不是有效的備份檔');
  }

  if (mode === 'replace') {
    // 清空現有資料
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

  // 寫入資料
  if (data.articles?.length) await db.articles.bulkPut(data.articles);
  if (data.categories?.length) await db.categories.bulkPut(data.categories);
  if (data.tags?.length) await db.tags.bulkPut(data.tags);
  if (data.folders?.length) await db.folders.bulkPut(data.folders);
  if (data.characters?.length) await db.characters.bulkPut(data.characters);
  if (data.timelineEvents?.length) await db.timelineEvents.bulkPut(data.timelineEvents);
  if (data.relations?.length) await db.relations.bulkPut(data.relations);
  if (data.branches?.length) await db.branches.bulkPut(data.branches);
  if (data.attachments?.length) await db.attachments.bulkPut(data.attachments);
  if (data.settings?.length) await db.settings.bulkPut(data.settings);

  return {
    articles: data.articles?.length || 0,
    characters: data.characters?.length || 0,
    timelineEvents: data.timelineEvents?.length || 0,
    relations: data.relations?.length || 0,
    folders: data.folders?.length || 0
  };
}
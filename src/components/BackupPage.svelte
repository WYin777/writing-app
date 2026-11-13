<script>
  import { db } from '../lib/db.js';
  import { saveAs } from 'file-saver';
  import { loadAll } from '../lib/data.js';

  let importing = $state(false);
  let importingProgress = $state('');
  let message = $state('');
  let errorMsg = $state('');
  let fileInput = $state(null);

  async function exportBackup() {
    errorMsg = '';
    message = '';
    try {
      const data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        projects: await db.projects.toArray(),
        articles: await db.articles.toArray(),
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
      message = '備份已下載！';
      setTimeout(() => message = '', 3000);
    } catch (e) {
      console.error('匯出失敗', e);
      errorMsg = '匯出失敗：' + (e?.message || e);
    }
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('匯入會覆蓋目前所有資料，確定嗎？\n\n建議先匯出備份。')) {
      e.target.value = '';
      return;
    }
    importing = true;
    importingProgress = '讀取檔案中...';
    errorMsg = '';
    message = '';
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version) throw new Error('不是有效的備份檔');

      importingProgress = '清空舊資料...';
      await db.projects.clear();
      await db.articles.clear();
      await db.characters.clear();
      await db.timelineEvents.clear();
      await db.relations.clear();
      await db.branches.clear();
      await db.attachments.clear();

      importingProgress = '寫入資料...';
      if (data.projects?.length) await db.projects.bulkPut(data.projects);
      if (data.articles?.length) await db.articles.bulkPut(data.articles);
      if (data.characters?.length) await db.characters.bulkPut(data.characters);
      if (data.timelineEvents?.length) await db.timelineEvents.bulkPut(data.timelineEvents);
      if (data.relations?.length) await db.relations.bulkPut(data.relations);
      if (data.branches?.length) await db.branches.bulkPut(data.branches);
      if (data.attachments?.length) await db.attachments.bulkPut(data.attachments);

      importingProgress = '重新載入...';
      await loadAll();

      message = `匯入成功！專案 ${data.projects?.length || 0}、文章 ${data.articles?.length || 0}、角色 ${data.characters?.length || 0}、事件 ${data.timelineEvents?.length || 0}、關係圖 ${data.relations?.length || 0}`;
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('匯入失敗', err);
      errorMsg = '匯入失敗：' + (err?.message || err);
    } finally {
      importing = false;
      importingProgress = '';
      e.target.value = '';
    }
  }

  function handleFileClick() {
    fileInput?.click();
  }
</script>

<div class="backup-page">
  <h1>💾 備份 / 還原</h1>
  <p class="desc">
    資料存在這台裝置的瀏覽器裡。要換到另一台裝置（例如電腦 → 手機），
    請先匯出備份檔，再在另一台裝置匯入。
  </p>

  {#if message}
    <div class="msg success">{message}</div>
  {/if}
  {#if errorMsg}
    <div class="msg error">{errorMsg}</div>
  {/if}

  <div class="actions">
    <div class="action-card">
      <h3>📤 匯出備份</h3>
      <p>把所有資料下載成一個 JSON 檔（包含專案、文章、角色、時間軸、關係圖）。</p>
      <button class="btn primary" onclick={exportBackup}>下載備份檔</button>
    </div>

    <div class="action-card">
      <h3>📥 匯入備份</h3>
      <p>從 JSON 檔還原資料。<strong>會覆蓋目前所有資料</strong>，建議先匯出。</p>
      <button class="btn" onclick={handleFileClick} disabled={importing}>
        {importing ? '匯入中...' : '選擇備份檔匯入'}
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="application/json,.json"
        onchange={handleImport}
        style="display:none"
      />
    </div>
  </div>

  {#if importingProgress}
    <div class="progress">{importingProgress}</div>
  {/if}

  <div class="warning">
    <strong>⚠️ 注意</strong>
    <ul>
      <li>備份檔包含所有資料，請妥善保管。</li>
      <li>匯入會完全覆蓋目前資料，無法復原。</li>
      <li>圖片以 Base64 存在備份檔內，檔案可能較大。</li>
    </ul>
  </div>
</div>

<style>
  .backup-page {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px;
  }

  h1 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .desc {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }

  @media (max-width: 640px) {
    .actions {
      grid-template-columns: 1fr;
    }
  }

  .action-card {
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-card);
  }

  .action-card h3 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .action-card p {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 12px;
  }

  .btn {
    padding: 9px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-weight: 500;
    width: 100%;
  }

  .btn:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .btn.primary {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .btn.primary:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .msg {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    margin-bottom: 16px;
  }

  .msg.success {
    background: var(--success-soft);
    color: var(--success);
    border: 1px solid var(--success);
  }

  .msg.error {
    background: var(--danger-soft);
    color: var(--danger);
    border: 1px solid var(--danger);
  }

  .progress {
    padding: 10px 14px;
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 16px;
  }

  .warning {
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .warning strong {
    display: block;
    margin-bottom: 6px;
    color: var(--text);
  }

  .warning ul {
    margin: 0;
    padding-left: 18px;
    line-height: 1.7;
  }
</style>
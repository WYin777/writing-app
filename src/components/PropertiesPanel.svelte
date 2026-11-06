<script>
  import {
    currentArticle, articles, categories, tags, favorites, toggleFavorite, articleFolders
  } from '../lib/stores.js';
  import {
    updateArticle, getAllArticles, deleteArticle, collectTags
  } from '../lib/db.js';
  import { exportMarkdown, exportTxt } from '../lib/export.js';
  import { formatDate } from '../lib/utils.js';

  let titleValue = $state('');
  let summaryValue = $state('');
  let notesValue = $state('');
  let tagInput = $state('');
  let localTags = $state([]);
  let statusValue = $state('draft');
  let folderValue = $state(null);
  let outlineTypeValue = $state('book');

  $effect(() => {
    if ($currentArticle) {
      titleValue = $currentArticle.title || '';
      summaryValue = $currentArticle.summary || '';
      notesValue = $currentArticle.notes || '';
      localTags = [...($currentArticle.tags || [])];
      statusValue = $currentArticle.status || 'draft';
      folderValue = $currentArticle.folderId ?? null;
      outlineTypeValue = $currentArticle.outlineType || 'book';
    }
  });

  async function saveField(field, value) {
    if (!$currentArticle) return;
    await updateArticle($currentArticle.id, { [field]: value });
    currentArticle.update(a => ({ ...a, [field]: value }));
    const list = await getAllArticles();
    articles.set(list);
    if (field === 'tags') {
      const tagList = await collectTags();
      tags.set(tagList);
    }
  }

  function handleTitleBlur() {
    const v = titleValue.trim() || '未命名文章';
    titleValue = v;
    saveField('title', v);
  }

  function handleSummaryBlur() { saveField('summary', summaryValue); }
  function handleNotesBlur() { saveField('notes', notesValue); }

  function handleStatusChange(e) {
    statusValue = e.target.value;
    saveField('status', statusValue);
  }

  function handleFolderChange(e) {
    const raw = e.target.value;
    folderValue = raw === '' ? null : Number(raw);
    saveField('folderId', folderValue);
  }

  function handleOutlineTypeChange(e) {
    const v = e.target.value;
    outlineTypeValue = v;
    saveField('outlineType', v);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t) { tagInput = ''; return; }
    if (localTags.includes(t)) { tagInput = ''; return; }
    localTags = [...localTags, t];
    tagInput = '';
    saveField('tags', localTags);
  }

  function removeTag(t) {
    localTags = localTags.filter(x => x !== t);
    saveField('tags', localTags);
  }

  async function handleDelete() {
    if (!confirm('確定刪除這篇文章？')) return;
    await deleteArticle($currentArticle.id);
    const list = await getAllArticles();
    articles.set(list);
    currentArticle.set(list[0] || null);
  }

  function handleExport(type) {
    if (!$currentArticle) return;
    if (type === 'md') exportMarkdown($currentArticle);
    if (type === 'txt') exportTxt($currentArticle);
  }

  function handleFavorite() {
    if (!$currentArticle) return;
    toggleFavorite($currentArticle.id);
  }
</script>

{#if $currentArticle}
  <div class="panel">
    <div class="section">
      <div class="header-row">
        <label class="label">標題</label>
        <button
          class="fav-btn"
          class:active={$favorites.has($currentArticle.id)}
          onclick={handleFavorite}
          title="我的最愛"
        >{$favorites.has($currentArticle.id) ? '★' : '☆'}</button>
      </div>
      <input
        class="input"
        bind:value={titleValue}
        onblur={handleTitleBlur}
        placeholder="文章標題"
      />
    </div>

    <div class="section">
      <label class="label">大綱類型</label>
      <div class="type-toggle">
        <button
          class:active={outlineTypeValue === 'book'}
          onclick={() => { outlineTypeValue = 'book'; saveField('outlineType', 'book'); }}
        >📖 書籍</button>
        <button
          class:active={outlineTypeValue === 'game'}
          onclick={() => { outlineTypeValue = 'game'; saveField('outlineType', 'game'); }}
        >🎮 遊戲</button>
      </div>
    </div>

    <div class="section">
      <label class="label">資料夾</label>
      <select class="select" value={folderValue ?? ''} onchange={handleFolderChange}>
        <option value="">（無資料夾）</option>
        {#each $articleFolders as f (f.id)}
          <option value={f.id}>
            {#if f.parentId}　└ {/if}{f.name}
          </option>
        {/each}
      </select>
    </div>

    <div class="section">
      <label class="label">狀態</label>
      <select class="select" value={statusValue} onchange={handleStatusChange}>
        <option value="draft">草稿</option>
        <option value="writing">進行中</option>
        <option value="done">完成</option>
      </select>
    </div>

    <div class="section">
      <label class="label">摘要</label>
      <textarea
        class="textarea"
        bind:value={summaryValue}
        onblur={handleSummaryBlur}
        placeholder="簡短摘要..."
        rows="2"
      ></textarea>
    </div>

    <div class="section">
      <label class="label">標籤</label>
      <div class="tags">
        {#each localTags as tag}
          <span class="tag">
            {tag}
            <button onclick={() => removeTag(tag)}>×</button>
          </span>
        {/each}
      </div>
      <div class="tag-input-row">
        <input
          class="input small"
          bind:value={tagInput}
          placeholder="新增標籤後按 Enter..."
          onkeydown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(); }
          }}
        />
        <button class="add-tag-btn" onclick={addTag}>＋</button>
      </div>
    </div>

    <div class="section">
      <label class="label">備註</label>
      <textarea
        class="textarea"
        bind:value={notesValue}
        onblur={handleNotesBlur}
        placeholder="備註..."
        rows="3"
      ></textarea>
    </div>

    <div class="section meta">
      <div>建立：{formatDate($currentArticle.createdAt)}</div>
      <div>更新：{formatDate($currentArticle.updatedAt)}</div>
    </div>

    <div class="section">
      <label class="label">匯出</label>
      <div class="export-buttons">
        <button onclick={() => handleExport('md')}>📄 Markdown</button>
        <button onclick={() => handleExport('txt')}>📝 TXT</button>
      </div>
    </div>

    <div class="section">
      <button class="delete-btn" onclick={handleDelete}>🗑 刪除文章</button>
    </div>
  </div>
{/if}

<style>
  .panel {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section { display: flex; flex-direction: column; gap: 6px; }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .fav-btn {
    font-size: 16px;
    color: var(--text-secondary);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .fav-btn.active { color: #f59e0b; }
  .fav-btn:hover { color: #f59e0b; }

  .input,
  .textarea,
  .select {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    font-size: 13px;
    color: var(--text);
    outline: none;
    font-family: inherit;
  }

  .input:focus,
  .textarea:focus,
  .select:focus { border-color: var(--accent); }

  .textarea { resize: vertical; line-height: 1.5; }

  .input.small { flex: 1; padding: 5px 8px; font-size: 12px; }

  .type-toggle {
    display: flex;
    gap: 4px;
    padding: 3px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .type-toggle button {
    flex: 1;
    padding: 6px 10px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .type-toggle button:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .type-toggle button.active {
    background: var(--accent);
    color: white;
  }

  .tags { display: flex; flex-wrap: wrap; gap: 4px; }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    font-size: 11px;
    color: var(--text);
  }

  .tag button {
    color: var(--text-secondary);
    font-size: 14px;
    line-height: 1;
  }

  .tag button:hover { color: var(--danger); }

  .tag-input-row { display: flex; gap: 4px; }

  .add-tag-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
  }

  .add-tag-btn:hover { background: var(--bg-hover); }

  .meta {
    font-size: 11px;
    color: var(--text-secondary);
    gap: 2px;
  }

  .export-buttons { display: flex; gap: 6px; }

  .export-buttons button {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    font-size: 12px;
    color: var(--text);
  }

  .export-buttons button:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
  }

  .delete-btn {
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--danger);
    font-size: 12px;
  }

  .delete-btn:hover {
    background: var(--danger);
    color: white;
    border-color: var(--danger);
  }
</style>
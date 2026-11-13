<script>
  import { currentArticle, articles, settings } from '../lib/stores.js';
  import { updateArticle, getAllArticles, deleteArticle } from '../lib/db.js';
  import { loadAll } from '../lib/data.js';
  import { exportMarkdown, exportTxt } from '../lib/export.js';
  import { formatDate } from '../lib/utils.js';

  let titleValue = $state('');
  let summaryValue = $state('');
  let notesValue = $state('');
  let tagInput = $state('');
  let localTags = $state([]);
  let statusValue = $state('draft');
  let outlineTypeValue = $state('book');

  const article = $derived($currentArticle);

  $effect(() => {
    if (article) {
      titleValue = article.title || '';
      summaryValue = article.summary || '';
      notesValue = article.notes || '';
      localTags = [...(article.tags || [])];
      statusValue = article.status || 'draft';
      outlineTypeValue = article.outlineType || 'book';
    }
  });

  async function saveField(field, value) {
    if (!article) return;
    await updateArticle(article.id, { [field]: value });
    currentArticle.update(a => a ? { ...a, [field]: value } : a);
    await loadAll();
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

  function handleOutlineTypeChange(e) {
    const v = e.target.value;
    outlineTypeValue = v;
    saveField('outlineType', v);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || localTags.includes(t)) { tagInput = ''; return; }
    localTags = [...localTags, t];
    tagInput = '';
    saveField('tags', localTags);
  }

  function removeTag(t) {
    localTags = localTags.filter(x => x !== t);
    saveField('tags', localTags);
  }

  function handleExport(type) {
    if (!article) return;
    if (type === 'md') exportMarkdown(article);
    if (type === 'txt') exportTxt(article);
  }
</script>

{#if article}
  <div class="panel">
    <div class="section">
      <label class="label">標題</label>
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
      <div>建立：{formatDate(article.createdAt)}</div>
      <div>更新：{formatDate(article.updatedAt)}</div>
    </div>

    <div class="section">
      <label class="label">匯出</label>
      <div class="export-buttons">
        <button onclick={() => handleExport('md')}>📄 Markdown</button>
        <button onclick={() => handleExport('txt')}>📝 TXT</button>
      </div>
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

  .section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .input,
  .textarea,
  .select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    font-size: 13px;
    color: var(--text);
    outline: none;
    font-family: inherit;
  }

  .input:focus,
  .textarea:focus,
  .select:focus {
    border-color: var(--accent);
  }

  .textarea {
    resize: vertical;
    line-height: 1.5;
  }

  .input.small {
    flex: 1;
    padding: 5px 8px;
    font-size: 12px;
  }

  .type-toggle {
    display: flex;
    gap: 4px;
    padding: 3px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
  }

  .type-toggle button {
    flex: 1;
    padding: 6px 10px;
    border-radius: 4px;
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

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--accent-soft);
    color: var(--accent-text);
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: 500;
  }

  .tag button {
    color: var(--accent-text);
    font-size: 14px;
    line-height: 1;
    opacity: 0.6;
  }

  .tag button:hover {
    opacity: 1;
  }

  .tag-input-row {
    display: flex;
    gap: 4px;
  }

  .add-tag-btn {
    width: 28px;
    height: 28px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
  }

  .add-tag-btn:hover {
    background: var(--bg-hover);
  }

  .meta {
    font-size: 11px;
    color: var(--text-muted);
    gap: 2px;
  }

  .export-buttons {
    display: flex;
    gap: 6px;
  }

  .export-buttons button {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    font-size: 12px;
    color: var(--text);
  }

  .export-buttons button:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
  }
</style>
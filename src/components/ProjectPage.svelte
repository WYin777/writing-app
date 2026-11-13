<script>
  import {
    currentProject, appView, projectTab, activeView,
    currentProjectArticles, currentProjectCharacters,
    currentProjectTimeline, currentProjectRelations,
    articles, characters, timelineEvents, relations,
    currentArticle, currentCharacter, currentTimelineEvent, currentRelation
  } from '../lib/stores.js';
  import {
    updateProject, deleteProject, createArticle,
    createCharacter, createTimelineEvent, createRelation
  } from '../lib/db.js';
  import { loadAll } from '../lib/data.js';
  import { formatDate } from '../lib/utils.js';

  const TYPE_META = {
    game:  { label: '遊戲', icon: '🎮', color: 'var(--type-game)', soft: 'var(--type-game-soft)' },
    novel: { label: '小說', icon: '📖', color: 'var(--type-novel)', soft: 'var(--type-novel-soft)' },
    essay: { label: '隨筆', icon: '📝', color: 'var(--type-essay)', soft: 'var(--type-essay-soft)' },
    other: { label: '其他', icon: '📦', color: 'var(--type-other)', soft: 'var(--type-other-soft)' }
  };

  const STATUS_META = {
    writing: { label: '進行中', color: 'var(--accent)' },
    done:    { label: '完成',   color: 'var(--success)' },
    paused:  { label: '擱置',   color: 'var(--text-muted)' }
  };

  let showEdit = $state(false);
  let editForm = $state({});

  const project = $derived($currentProject);
  const tm = $derived(project ? (TYPE_META[project.type] || TYPE_META.other) : TYPE_META.other);
  const sm = $derived(project ? (STATUS_META[project.status] || STATUS_META.writing) : STATUS_META.writing);

  function goBack() {
    currentProject.set(null);
    appView.set('home');
  }

  function openEdit() {
    editForm = {
      name: project.name || '',
      type: project.type || 'other',
      status: project.status || 'writing',
      summary: project.summary || '',
      notes: project.notes || '',
      tags: [...(project.tags || [])]
    };
    showEdit = true;
  }

  async function saveEdit() {
    if (!editForm.name.trim()) return;
    await updateProject(project.id, {
      name: editForm.name.trim(),
      type: editForm.type,
      status: editForm.status,
      summary: editForm.summary.trim(),
      notes: editForm.notes.trim(),
      tags: [...editForm.tags]
    });
    await loadAll();
    currentProject.update(p => ({ ...p, ...editForm }));
    showEdit = false;
  }

  async function handleDelete() {
    if (!confirm(`確定刪除「${project.name}」？\n底下所有文章、角色、時間軸、關係圖都會一起刪除，無法復原。`)) return;
    await deleteProject(project.id);
    await loadAll();
    goBack();
  }

  async function handleNewArticle() {
    const id = await createArticle(project.id, { title: '未命名文章' });
    await loadAll();
    const newArt = $articles.find(a => a.id === id);
    if (newArt) openArticle(newArt);
  }

  async function handleNewCharacter() {
    const id = await createCharacter(project.id, { name: '未命名角色' });
    await loadAll();
    const newChar = $characters.find(c => c.id === id);
    if (newChar) openCharacter(newChar);
  }

  async function handleNewTimeline() {
    const id = await createTimelineEvent(project.id, { title: '未命名事件' });
    await loadAll();
    const newEvt = $timelineEvents.find(t => t.id === id);
    if (newEvt) openTimelineEvent(newEvt);
  }

  async function handleNewRelation() {
    const id = await createRelation(project.id, { name: '未命名關係圖' });
    await loadAll();
    const newRel = $relations.find(r => r.id === id);
    if (newRel) openRelation(newRel);
  }

  function openArticle(art) {
    currentArticle.set(art);
    activeView.set('outline');
    appView.set('article');
  }

  function openCharacter(char) {
    currentCharacter.set(char);
    appView.set('character');
  }

  function openTimelineEvent(evt) {
    currentTimelineEvent.set(evt);
    appView.set('timeline');
  }

  function openRelation(rel) {
    currentRelation.set(rel);
    appView.set('relation');
  }

  function addTag() {
    const t = prompt('新增標籤');
    if (t && t.trim() && !editForm.tags.includes(t.trim())) {
      editForm.tags = [...editForm.tags, t.trim()];
    }
  }

  function removeTag(t) {
    editForm.tags = editForm.tags.filter(x => x !== t);
  }

  const TABS = [
    { key: 'articles',   label: '📄 文章' },
    { key: 'characters', label: '🎭 角色' },
    { key: 'timeline',   label: '⏳ 時間軸' },
    { key: 'relations',  label: '🕸 關係圖' }
  ];
</script>

{#if project}
  <div class="project-page">
    <div class="project-header">
      <div class="header-top">
        <button class="back-btn" onclick={goBack}>← 返回</button>
        <div class="header-actions">
          <button class="icon-btn" onclick={openEdit} title="編輯">✏</button>
          <button class="icon-btn danger" onclick={handleDelete} title="刪除">🗑</button>
        </div>
      </div>

      <div class="header-main">
        <div class="type-badge" style="background: {tm.soft}; color: {tm.color}">
          {tm.icon}
        </div>
        <div class="header-info">
          <h1>{project.name}</h1>
          <div class="meta">
            <span class="status-dot" style="background: {sm.color}"></span>
            <span>{sm.label}</span>
            <span class="sep">·</span>
            <span>📄 {$currentProjectArticles.length} 篇</span>
            <span>🎭 {$currentProjectCharacters.length} 角色</span>
            <span>⏳ {$currentProjectTimeline.length} 事件</span>
            <span>🕸 {$currentProjectRelations.length} 關係圖</span>
          </div>
          {#if project.tags?.length}
            <div class="tags">
              {#each project.tags as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      {#if project.summary}
        <p class="summary">{project.summary}</p>
      {/if}
    </div>

    <div class="tabs">
      {#each TABS as tab}
        <button
          class:active={$projectTab === tab.key}
          onclick={() => projectTab.set(tab.key)}
        >
          {tab.label}
        </button>
      {/each}
    </div>

    <div class="tab-content">
      {#if $projectTab === 'articles'}
        <div class="tab-toolbar">
          <span>{$currentProjectArticles.length} 篇文章</span>
          <button class="new-btn" onclick={handleNewArticle}>＋ 新增文章</button>
        </div>
        {#if $currentProjectArticles.length === 0}
          <div class="empty">
            <p>還沒有文章</p>
            <p class="hint">點「＋ 新增文章」開始寫作</p>
          </div>
        {:else}
          <div class="item-list">
            {#each $currentProjectArticles as art (art.id)}
              <div class="item-row" onclick={() => openArticle(art)}>
                <span class="item-icon">📄</span>
                <div class="item-info">
                  <div class="item-title">{art.title}</div>
                  <div class="item-meta">
                    <span>{art.outlineType === 'game' ? '🎮 遊戲' : '📖 書籍'}</span>
                    <span class="status-tag {art.status}">{art.status}</span>
                    <span>{formatDate(art.updatedAt)}</span>
                  </div>
                </div>
                {#if art.favorite}<span class="fav">⭐</span>{/if}
              </div>
            {/each}
          </div>
        {/if}

      {:else if $projectTab === 'characters'}
        <div class="tab-toolbar">
          <span>{$currentProjectCharacters.length} 個角色</span>
          <button class="new-btn" onclick={handleNewCharacter}>＋ 新增角色</button>
        </div>
        {#if $currentProjectCharacters.length === 0}
          <div class="empty">
            <p>還沒有角色卡</p>
            <p class="hint">點「＋ 新增角色」建立</p>
          </div>
        {:else}
          <div class="char-grid">
            {#each $currentProjectCharacters as char (char.id)}
              <div class="char-card" onclick={() => openCharacter(char)}>
                <div class="char-avatar">
                  {#if char.avatar}
                    <img src={char.avatar} alt={char.name} />
                  {:else}
                    <span>🎭</span>
                  {/if}
                </div>
                <div class="char-name">{char.name}</div>
                {#if char.alias}<div class="char-alias">{char.alias}</div>{/if}
              </div>
            {/each}
          </div>
        {/if}

      {:else if $projectTab === 'timeline'}
        <div class="tab-toolbar">
          <span>{$currentProjectTimeline.length} 個事件</span>
          <button class="new-btn" onclick={handleNewTimeline}>＋ 新增事件</button>
        </div>
        {#if $currentProjectTimeline.length === 0}
          <div class="empty">
            <p>還沒有時間軸事件</p>
            <p class="hint">點「＋ 新增事件」建立</p>
          </div>
        {:else}
          <div class="timeline-list">
            {#each $currentProjectTimeline as evt (evt.id)}
              <div class="timeline-item" onclick={() => openTimelineEvent(evt)}>
                <div class="tl-dot"></div>
                <div class="tl-content">
                  <div class="tl-time">{evt.time || '未設定時間'}</div>
                  <div class="tl-title">{evt.title}</div>
                  {#if evt.location}<div class="tl-loc">📍 {evt.location}</div>{/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

      {:else if $projectTab === 'relations'}
        <div class="tab-toolbar">
          <span>{$currentProjectRelations.length} 張關係圖</span>
          <button class="new-btn" onclick={handleNewRelation}>＋ 新增關係圖</button>
        </div>
        {#if $currentProjectRelations.length === 0}
          <div class="empty">
            <p>還沒有關係圖</p>
            <p class="hint">點「＋ 新增關係圖」建立</p>
          </div>
        {:else}
          <div class="item-list">
            {#each $currentProjectRelations as rel (rel.id)}
              <div class="item-row" onclick={() => openRelation(rel)}>
                <span class="item-icon">🕸</span>
                <div class="item-info">
                  <div class="item-title">{rel.name}</div>
                  <div class="item-meta">
                    <span>{rel.nodes?.length || 0} 個角色</span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>

    {#if showEdit}
      <div class="modal-overlay" onclick={() => showEdit = false}>
        <div class="modal" onclick={(e) => e.stopPropagation()}>
          <div class="modal-header">
            <h2>編輯專案</h2>
            <button class="close-btn" onclick={() => showEdit = false}>×</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label>名稱</label>
              <input bind:value={editForm.name} />
            </div>
            <div class="field-row">
              <div class="field">
                <label>類型</label>
                <select bind:value={editForm.type}>
                  <option value="game">🎮 遊戲</option>
                  <option value="novel">📖 小說</option>
                  <option value="essay">📝 隨筆</option>
                  <option value="other">📦 其他</option>
                </select>
              </div>
              <div class="field">
                <label>狀態</label>
                <select bind:value={editForm.status}>
                  <option value="writing">進行中</option>
                  <option value="done">完成</option>
                  <option value="paused">擱置</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>簡介</label>
              <textarea bind:value={editForm.summary} rows="2" placeholder="專案簡介..."></textarea>
            </div>
            <div class="field">
              <label>標籤</label>
              <div class="tags-edit">
                {#each editForm.tags as tag}
                  <span class="tag">
                    {tag}
                    <button onclick={() => removeTag(tag)}>×</button>
                  </span>
                {/each}
                <button class="add-tag-btn" onclick={addTag}>＋ 新增</button>
              </div>
            </div>
            <div class="field">
              <label>備註</label>
              <textarea bind:value={editForm.notes} rows="3"></textarea>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn" onclick={() => showEdit = false}>取消</button>
            <button class="btn primary" onclick={saveEdit}>儲存</button>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .project-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 24px;
  }

  .project-header {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 20px;
    margin-bottom: 20px;
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .back-btn {
    font-size: 13px;
    color: var(--text-secondary);
    padding: 6px 10px;
    border-radius: var(--radius-sm);
  }

  .back-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }

  .icon-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    font-size: 14px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .icon-btn.danger:hover {
    background: var(--danger-soft);
    color: var(--danger);
  }

  .header-main {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .type-badge {
    width: 56px;
    height: 56px;
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    flex-shrink: 0;
  }

  .header-info {
    flex: 1;
    min-width: 0;
  }

  .header-info h1 {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text);
  }

  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 8px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .sep {
    color: var(--text-muted);
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
    font-size: 12px;
    color: var(--accent-text);
    opacity: 0.6;
  }

  .tag button:hover {
    opacity: 1;
  }

  .summary {
    margin-top: 12px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .tabs {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 16px;
    overflow-x: auto;
  }

  .tabs button {
    padding: 10px 16px;
    font-size: 14px;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    font-weight: 500;
    white-space: nowrap;
  }

  .tabs button:hover {
    color: var(--text);
  }

  .tabs button.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
  }

  .tab-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .new-btn {
    padding: 6px 14px;
    background: var(--accent);
    color: white;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
  }

  .new-btn:hover {
    background: var(--accent-hover);
  }

  .empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-secondary);
    background: var(--bg-card);
    border: 1px dashed var(--border);
    border-radius: var(--radius);
  }

  .empty .hint {
    font-size: 12px;
    margin-top: 6px;
    color: var(--text-muted);
  }

  .item-list {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .item-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
  }

  .item-row:last-child {
    border-bottom: none;
  }

  .item-row:hover {
    background: var(--bg-hover);
  }

  .item-icon {
    font-size: 16px;
    width: 24px;
  }

  .item-info {
    flex: 1;
    min-width: 0;
  }

  .item-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-meta {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: var(--text-secondary);
    align-items: center;
    flex-wrap: wrap;
  }

  .status-tag {
    padding: 1px 6px;
    background: var(--bg-secondary);
    border-radius: 3px;
    font-size: 10px;
  }

  .status-tag.draft { color: var(--text-secondary); }
  .status-tag.writing { color: var(--warning); }
  .status-tag.done { color: var(--success); }

  .fav {
    color: var(--warning);
    font-size: 14px;
  }

  .char-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .char-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .char-card:hover {
    border-color: var(--accent);
    box-shadow: var(--shadow-sm);
  }

  .char-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin: 0 auto 8px;
    overflow: hidden;
  }

  .char-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .char-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 2px;
  }

  .char-alias {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .timeline-list {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 16px;
  }

  .timeline-item {
    display: flex;
    gap: 12px;
    padding: 10px 0;
    cursor: pointer;
    align-items: flex-start;
  }

  .timeline-item:hover .tl-title {
    color: var(--accent);
  }

  .tl-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    margin-top: 4px;
    flex-shrink: 0;
  }

  .tl-content {
    flex: 1;
    min-width: 0;
  }

  .tl-time {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
    margin-bottom: 2px;
  }

  .tl-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    margin-bottom: 2px;
  }

  .tl-loc {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-lg);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
  }

  .modal-header h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    font-size: 18px;
    color: var(--text-secondary);
  }

  .close-btn:hover {
    background: var(--bg-hover);
  }

  .modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-row {
    display: flex;
    gap: 12px;
  }

  .field-row .field { flex: 1; }

  .field label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .field input,
  .field textarea,
  .field select {
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    outline: none;
    font-family: inherit;
  }

  .field input:focus,
  .field textarea:focus,
  .field select:focus {
    border-color: var(--accent);
  }

  .field textarea {
    resize: vertical;
    line-height: 1.5;
  }

  .tags-edit {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .add-tag-btn {
    padding: 4px 10px;
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-full);
    font-size: 11px;
    color: var(--text-secondary);
  }

  .add-tag-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .modal-footer {
    padding: 12px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn {
    padding: 8px 16px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-weight: 500;
  }

  .btn:hover {
    background: var(--bg-hover);
  }

  .btn.primary {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .btn.primary:hover {
    background: var(--accent-hover);
  }

  @media (max-width: 768px) {
  .project-page {
    padding: 16px;
  }

  .project-header {
    padding: 16px;
  }

  .header-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-info h1 {
    font-size: 18px;
  }

  .meta {
    font-size: 11px;
  }

  .tabs {
    overflow-x: auto;
  }

  .tabs button {
    padding: 10px 12px;
    font-size: 13px;
    white-space: nowrap;
  }

  .char-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }

  .char-card {
    padding: 12px 8px;
  }

  .char-avatar {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }

  .char-name {
    font-size: 12px;
  }
}
</style>
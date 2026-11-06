<script>
  import { onMount } from 'svelte';
  import { db, getFoldersByType } from '../lib/db.js';
  import { timelineFolders, timelineFolderFilter } from '../lib/stores.js';
  import FolderTree from './FolderTree.svelte';
  import AllFolders from './AllFolders.svelte';

  let events = $state([]);
  let characters = $state([]);
  let currentId = $state(null);
  let showForm = $state(false);
  let searchQuery = $state('');
  let saving = $state(false);
  let errorMsg = $state('');
  let viewMode = $state('list');

  let form = $state({
    title: '',
    time: '',
    timeOrder: 0,
    location: '',
    characterIds: [],
    description: '',
    images: [],
    notes: '',
    folderId: null
  });

  let imageUrlInput = $state('');

  async function load() {
    try {
      events = await db.timelineEvents.toArray();
      characters = await db.characters.toArray();
      const folders = await getFoldersByType('timeline');
      timelineFolders.set(folders);
    } catch (e) {
      console.error('載入失敗', e);
    }
  }

  onMount(() => {
    load();
  });

  $effect(() => {
    const fid = $timelineFolderFilter;
    if (fid !== null) {
      currentId = null;
      showForm = false;
    }
  });

  const sortedEvents = $derived(
    [...events]
      .filter(e => {
        const fid = $timelineFolderFilter;
        return fid === null || e.folderId === fid;
      })
      .filter(e => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return e.title.toLowerCase().includes(q) ||
          (e.location || '').toLowerCase().includes(q) ||
          (e.description || '').toLowerCase().includes(q);
      })
      .sort((a, b) => (a.timeOrder || 0) - (b.timeOrder || 0))
  );

  const current = $derived(
    currentId ? events.find(e => e.id === currentId) : null
  );

  function resetForm() {
    form = {
      title: '',
      time: '',
      timeOrder: 0,
      location: '',
      characterIds: [],
      description: '',
      images: [],
      notes: '',
      folderId: $timelineFolderFilter
    };
    imageUrlInput = '';
    errorMsg = '';
  }

  function startNew() {
    resetForm();
    currentId = null;
    showForm = true;
  }

  function startEdit(evt) {
    form = {
      title: evt.title || '',
      time: evt.time || '',
      timeOrder: evt.timeOrder || 0,
      location: evt.location || '',
      characterIds: [...(evt.characterIds || [])],
      description: evt.description || '',
      images: [...(evt.images || [])],
      notes: evt.notes || '',
      folderId: evt.folderId ?? null
    };
    currentId = evt.id;
    showForm = true;
    errorMsg = '';
  }

  function cancelForm() {
    showForm = false;
    resetForm();
  }

  async function saveEvent() {
    if (saving) return;
    errorMsg = '';
    if (!form.title.trim()) {
      errorMsg = '請填寫事件名稱';
      return;
    }
    saving = true;
    try {
      const now = Date.now();
      const payload = {
        title: form.title.trim(),
        time: form.time.trim(),
        timeOrder: Number(form.timeOrder) || 0,
        location: form.location.trim(),
        characterIds: [...form.characterIds],
        description: form.description.trim(),
        images: [...form.images],
        notes: form.notes.trim(),
        folderId: form.folderId ?? null,
        updatedAt: now
      };
      if (currentId) {
        await db.timelineEvents.update(currentId, payload);
      } else {
        const newId = await db.timelineEvents.add({ ...payload, createdAt: now });
        currentId = newId;
      }
      await load();
      showForm = false;
      resetForm();
    } catch (e) {
      console.error('儲存失敗', e);
      errorMsg = '儲存失敗：' + (e?.message || e);
    } finally {
      saving = false;
    }
  }

  async function deleteEvent(id) {
    if (!confirm('確定刪除這個事件？')) return;
    await db.timelineEvents.delete(id);
    if (currentId === id) currentId = null;
    await load();
  }

  async function moveToFolder(evt, newFolderId) {
    await db.timelineEvents.update(evt.id, { folderId: newFolderId, updatedAt: Date.now() });
    await load();
  }

  function toggleCharacter(id) {
    if (form.characterIds.includes(id)) {
      form.characterIds = form.characterIds.filter(x => x !== id);
    } else {
      form.characterIds = [...form.characterIds, id];
    }
  }

  function addImageUrl() {
    const url = imageUrlInput.trim();
    if (!url) return;
    form.images = [...form.images, url];
    imageUrlInput = '';
  }

  function removeImage(idx) {
    form.images = form.images.filter((_, i) => i !== idx);
  }

  function charName(id) {
    return characters.find(c => c.id === id)?.name || '?';
  }

  function onSelectFolder(id) {
    timelineFolderFilter.set(id);
    currentId = null;
    showForm = false;
  }
</script>

<div class="timeline-manager">
  <aside class="folder-panel">
    <FolderTree
      type="timeline"
      folders={$timelineFolders}
      selectedId={$timelineFolderFilter}
      onSelect={onSelectFolder}
      onRefresh={load}
      label="時間軸資料夾"
    />
    <AllFolders />
  </aside>

  <div class="sidebar">
    <div class="sidebar-header">
      <input
        class="search-input"
        placeholder="🔍 搜尋事件..."
        bind:value={searchQuery}
      />
      <button class="new-btn" onclick={startNew}>＋ 新增</button>
    </div>

    <div class="view-toggle">
      <button class:active={viewMode === 'list'} onclick={() => viewMode = 'list'}>📋 列表</button>
      <button class:active={viewMode === 'horizontal'} onclick={() => viewMode = 'horizontal'}>↔ 水平</button>
    </div>

    {#if sortedEvents.length === 0}
      <div class="empty-hint">
        {searchQuery ? '找不到符合的事件' : '還沒有時間軸事件'}
      </div>
    {:else if viewMode === 'list'}
      <div class="event-list">
        {#each sortedEvents as evt (evt.id)}
          <div
            class="event-item"
            class:active={currentId === evt.id}
            onclick={() => { currentId = evt.id; showForm = false; }}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && (currentId = evt.id, showForm = false)}
          >
            <div class="event-time">{evt.time || '未設定時間'}</div>
            <div class="event-title">{evt.title}</div>
            {#if evt.location}
              <div class="event-loc">📍 {evt.location}</div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="horizontal-mini">
        {#each sortedEvents as evt (evt.id)}
          <div
            class="mini-event"
            class:active={currentId === evt.id}
            onclick={() => { currentId = evt.id; showForm = false; }}
          >
            <div class="mini-dot"></div>
            <div class="mini-info">
              <div class="mini-time">{evt.time || '?'}</div>
              <div class="mini-title">{evt.title}</div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="main">
    {#if showForm}
      <div class="form">
        <div class="form-header">
          <h2>{currentId ? '編輯事件' : '新增事件'}</h2>
          <div class="form-actions">
            <button class="cancel-btn" onclick={cancelForm}>取消</button>
            <button class="save-btn" onclick={saveEvent} disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>

        {#if errorMsg}
          <div class="error-msg">{errorMsg}</div>
        {/if}

        <div class="form-body">
          <div class="field">
            <label>事件名稱 *</label>
            <input bind:value={form.title} placeholder="例如：主角出生、初次相遇" />
          </div>

          <div class="field-row">
            <div class="field">
              <label>時間（顯示）</label>
              <input bind:value={form.time} placeholder="例如：故事前 24 年、第 3 天早晨" />
            </div>
            <div class="field">
              <label>排序值（數字，小到大）</label>
              <input type="number" bind:value={form.timeOrder} placeholder="0" />
            </div>
          </div>

          <div class="field">
            <label>地點</label>
            <input bind:value={form.location} placeholder="北方小鎮、王城..." />
          </div>

          <div class="field">
            <label>資料夾</label>
            <select bind:value={form.folderId}>
              <option value={null}>（無資料夾）</option>
              {#each $timelineFolders as f (f.id)}
                <option value={f.id}>
                  {#if f.parentId}　└ {/if}{f.name}
                </option>
              {/each}
            </select>
          </div>

          {#if characters.length > 0}
            <div class="field">
              <label>參與角色</label>
              <div class="char-chips">
                {#each characters as c (c.id)}
                  <button
                    class="chip"
                    class:active={form.characterIds.includes(c.id)}
                    onclick={() => toggleCharacter(c.id)}
                  >
                    {#if c.avatar}
                      <img src={c.avatar} alt={c.name} class="chip-avatar" />
                    {/if}
                    {c.name}
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <div class="field">
            <label>描述</label>
            <textarea bind:value={form.description} rows="4" placeholder="事件經過..."></textarea>
          </div>

          <div class="field">
            <label>圖片（網址）</label>
            <div class="image-url-row">
              <input
                bind:value={imageUrlInput}
                placeholder="貼上圖片網址..."
                onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
              />
              <button class="add-btn" onclick={addImageUrl}>＋</button>
            </div>
            {#if form.images.length > 0}
              <div class="image-grid">
                {#each form.images as img, i}
                  <div class="image-thumb">
                    <img src={img} alt="" />
                    <button onclick={() => removeImage(i)}>×</button>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="field">
            <label>備註</label>
            <textarea bind:value={form.notes} rows="2" placeholder="其他備註..."></textarea>
          </div>
        </div>
      </div>
    {:else if current}
      <div class="detail">
        <div class="detail-header">
          <div>
            <h2>{current.title}</h2>
            {#if current.time}
              <p class="time-label">⏳ {current.time}</p>
            {/if}
          </div>
          <div class="detail-actions">
            <button class="edit-btn" onclick={() => startEdit(current)}>✏ 編輯</button>
            <button class="delete-btn" onclick={() => deleteEvent(current.id)}>🗑 刪除</button>
          </div>
        </div>

        <div class="folder-change">
          <label>📁 資料夾：</label>
          <select
            value={current.folderId ?? null}
            onchange={(e) => {
              const v = e.target.value;
              moveToFolder(current, v === 'null' ? null : Number(v));
            }}
          >
            <option value={null}>（無資料夾）</option>
            {#each $timelineFolders as f (f.id)}
              <option value={f.id}>
                {#if f.parentId}　└ {/if}{f.name}
              </option>
            {/each}
          </select>
        </div>

        {#if current.location}
          <div class="detail-item">
            <span class="detail-label">📍 地點</span>
            <span>{current.location}</span>
          </div>
        {/if}

        {#if current.characterIds?.length}
          <div class="detail-section">
            <h3>參與角色</h3>
            <div class="char-chips">
              {#each current.characterIds as cid}
                <span class="chip static">{charName(cid)}</span>
              {/each}
            </div>
          </div>
        {/if}

        {#if current.description}
          <div class="detail-section">
            <h3>描述</h3>
            <p>{current.description}</p>
          </div>
        {/if}

        {#if current.images?.length}
          <div class="detail-section">
            <h3>圖片</h3>
            <div class="image-grid">
              {#each current.images as img}
                <div class="image-thumb">
                  <img src={img} alt="" />
                </div>
              {/each}
            </div>
          </div>
        {/if}

        {#if current.notes}
          <div class="detail-section">
            <h3>備註</h3>
            <p>{current.notes}</p>
          </div>
        {/if}
      </div>
    {:else}
      <div class="empty">
        <p>⏳</p>
        <p>選擇左側事件查看詳情</p>
        <p class="hint">或點「＋ 新增」建立事件</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .timeline-manager {
    display: flex;
    height: 100%;
    width: 100%;
  }

  .folder-panel {
    width: 220px;
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
    overflow-y: auto;
    flex-shrink: 0;
  }

  .sidebar {
    width: 260px;
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .sidebar-header {
    padding: 12px;
    display: flex;
    gap: 6px;
    border-bottom: 1px solid var(--border);
  }

  .search-input {
    flex: 1;
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    font-size: 12px;
    color: var(--text);
    outline: none;
    min-width: 0;
  }

  .search-input:focus { border-color: var(--accent); }

  .new-btn {
    padding: 6px 10px;
    background: var(--accent);
    color: white;
    border-radius: var(--radius);
    font-size: 12px;
    white-space: nowrap;
  }

  .new-btn:hover { background: var(--accent-hover); }

  .view-toggle {
    display: flex;
    gap: 4px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border);
  }

  .view-toggle button {
    flex: 1;
    padding: 5px;
    border-radius: 3px;
    font-size: 11px;
    color: var(--text-secondary);
  }

  .view-toggle button.active {
    background: var(--bg-hover);
    color: var(--text);
  }

  .event-list { flex: 1; overflow-y: auto; }

  .event-item {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    border-left: 3px solid transparent;
  }

  .event-item:hover { background: var(--bg-hover); }

  .event-item.active {
    background: var(--bg-hover);
    border-left-color: var(--accent);
  }

  .event-time {
    font-size: 11px;
    color: var(--accent);
    font-weight: 600;
    margin-bottom: 2px;
  }

  .event-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
  }

  .event-loc {
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 2px;
  }

  .horizontal-mini {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .mini-event {
    display: flex;
    gap: 8px;
    padding: 6px 0;
    cursor: pointer;
    align-items: flex-start;
  }

  .mini-event:hover .mini-title { color: var(--accent); }

  .mini-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    margin-top: 4px;
    flex-shrink: 0;
    position: relative;
  }

  .mini-event:not(:last-child) .mini-dot::after {
    content: '';
    position: absolute;
    left: 4px;
    top: 10px;
    width: 2px;
    height: 30px;
    background: var(--border);
  }

  .mini-info { flex: 1; min-width: 0; }

  .mini-time { font-size: 10px; color: var(--text-secondary); }

  .mini-title {
    font-size: 12px;
    color: var(--text);
    font-weight: 500;
  }

  .main { flex: 1; overflow-y: auto; background: var(--bg); }

  .form { padding: 24px; max-width: 720px; margin: 0 auto; }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .form-header h2 { font-size: 18px; font-weight: 600; }

  .form-actions { display: flex; gap: 8px; }

  .cancel-btn,
  .save-btn {
    padding: 7px 14px;
    border-radius: var(--radius);
    font-size: 13px;
    border: 1px solid var(--border);
    background: var(--bg);
    color: var(--text);
  }

  .save-btn {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .save-btn:hover:not(:disabled) { background: var(--accent-hover); }
  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .cancel-btn:hover { background: var(--bg-hover); }

  .error-msg {
    padding: 8px 12px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: var(--radius);
    font-size: 12px;
    margin-bottom: 12px;
  }

  :global([data-theme="dark"]) .error-msg {
    background: #7f1d1d;
    color: #fecaca;
    border-color: #991b1b;
  }

  .form-body { display: flex; flex-direction: column; gap: 16px; }

  .field { display: flex; flex-direction: column; gap: 4px; }

  .field-row { display: flex; gap: 10px; }

  .field-row > .field { flex: 1; }

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
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    font-size: 13px;
    color: var(--text);
    outline: none;
    font-family: inherit;
  }

  .field input:focus,
  .field textarea:focus,
  .field select:focus { border-color: var(--accent); }

  .field textarea { resize: vertical; line-height: 1.5; }

  .char-chips { display: flex; flex-wrap: wrap; gap: 4px; }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
  }

  .chip:hover { border-color: var(--accent); }

  .chip.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .chip.static {
    background: var(--bg-secondary);
    cursor: default;
  }

  .chip-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    object-fit: cover;
  }

  .image-url-row { display: flex; gap: 4px; }
  .image-url-row input { flex: 1; }

  .add-btn {
    width: 32px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
  }

  .add-btn:hover { background: var(--bg-hover); }

  .image-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .image-thumb {
    position: relative;
    width: 80px;
    height: 80px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .image-thumb img { width: 100%; height: 100%; object-fit: cover; }

  .image-thumb button {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0,0,0,0.6);
    color: white;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .detail { padding: 24px; max-width: 720px; margin: 0 auto; }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    gap: 16px;
  }

  .detail-header h2 { font-size: 20px; font-weight: 600; }

  .time-label {
    font-size: 13px;
    color: var(--accent);
    margin-top: 4px;
  }

  .detail-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .edit-btn,
  .delete-btn {
    padding: 6px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 12px;
    color: var(--text);
    background: var(--bg);
  }

  .delete-btn { color: var(--danger); }
  .edit-btn:hover { border-color: var(--accent); color: var(--accent); }
  .delete-btn:hover { background: var(--danger); color: white; border-color: var(--danger); }

  .folder-change {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 12px;
  }

  .folder-change select {
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    outline: none;
    font-family: inherit;
  }

  .folder-change select:focus { border-color: var(--accent); }

  .detail-item {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 14px;
    color: var(--text);
    margin-bottom: 12px;
  }

  .detail-label {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 600;
  }

  .detail-section { margin-bottom: 16px; }

  .detail-section h3 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .detail-section p {
    font-size: 14px;
    line-height: 1.6;
    white-space: pre-wrap;
    color: var(--text);
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
    font-size: 14px;
    gap: 8px;
    padding: 24px;
    text-align: center;
  }

  .empty p:first-child { font-size: 40px; }

  .empty .hint { font-size: 12px; opacity: 0.7; }

  .empty-hint {
    padding: 24px 16px;
    text-align: center;
    font-size: 12px;
    color: var(--text-secondary);
    font-style: italic;
  }
</style>
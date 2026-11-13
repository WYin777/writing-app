<script>
  import {
    currentTimelineEvent, currentProject, appView,
    currentProjectTimeline, currentProjectCharacters
  } from '../lib/stores.js';
  import { db } from '../lib/db.js';
  import { loadAll } from '../lib/data.js';

  const evt = $derived($currentTimelineEvent);

  let form = $state({
    title: '',
    time: '',
    timeOrder: 0,
    location: '',
    characterIds: [],
    description: '',
    images: [],
    notes: ''
  });

  let saving = $state(false);
  let errorMsg = $state('');
  let imageUrlInput = $state('');

  $effect(() => {
    if (evt) {
      form = {
        title: evt.title || '',
        time: evt.time || '',
        timeOrder: evt.timeOrder || 0,
        location: evt.location || '',
        characterIds: [...(evt.characterIds || [])],
        description: evt.description || '',
        images: [...(evt.images || [])],
        notes: evt.notes || ''
      };
    }
  });

  function goBack() {
    currentTimelineEvent.set(null);
    appView.set('project');
  }

  function selectEvt(e) {
    currentTimelineEvent.set(e);
  }

  async function save() {
    if (saving || !evt) return;
    errorMsg = '';
    if (!form.title.trim()) {
      errorMsg = '請填寫事件名稱';
      return;
    }
    saving = true;
    try {
      await db.timelineEvents.update(evt.id, {
        title: form.title.trim(),
        time: form.time.trim(),
        timeOrder: Number(form.timeOrder) || 0,
        location: form.location.trim(),
        characterIds: [...(form.characterIds || [])],
        description: form.description.trim(),
        images: [...(form.images || [])],
        notes: form.notes.trim(),
        updatedAt: Date.now()
      });
      await loadAll();
      currentTimelineEvent.update(e => ({ ...e, ...form }));
    } catch (e) {
      console.error('儲存失敗', e);
      errorMsg = '儲存失敗：' + (e?.message || e);
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!evt) return;
    if (!confirm(`確定刪除「${evt.title}」？`)) return;
    await db.timelineEvents.delete(evt.id);
    await loadAll();
    goBack();
  }

  async function toggleFavorite() {
    if (!evt) return;
    await db.timelineEvents.update(evt.id, { favorite: !evt.favorite, updatedAt: Date.now() });
    await loadAll();
    currentTimelineEvent.update(e => ({ ...e, favorite: !e.favorite }));
  }

  function toggleCharacter(id) {
    const ids = form.characterIds || [];
    if (ids.includes(id)) {
      form.characterIds = ids.filter(x => x !== id);
    } else {
      form.characterIds = [...ids, id];
    }
  }

  function addImageUrl() {
    const url = imageUrlInput.trim();
    if (!url) return;
    form.images = [...(form.images || []), url];
    imageUrlInput = '';
  }

  function removeImage(idx) {
    form.images = (form.images || []).filter((_, i) => i !== idx);
  }

  function charName(id) {
    return $currentProjectCharacters.find(c => c.id === id)?.name || '?';
  }

  function charAvatar(id) {
    return $currentProjectCharacters.find(c => c.id === id)?.avatar || null;
  }
</script>

{#if evt}
  <div class="timeline-page">
    <div class="topbar">
      <button class="back-btn" onclick={goBack}>← {$currentProject?.name || '返回'}</button>
      <div class="actions">
        <button
          class="btn icon-only"
          class:active={evt.favorite}
          onclick={toggleFavorite}
          title="我的最愛"
        >{evt.favorite ? '⭐' : '☆'}</button>
        <button class="btn danger" onclick={handleDelete}>🗑 刪除</button>
        <button class="btn primary" onclick={save} disabled={saving}>
          {saving ? '儲存中...' : '💾 儲存'}
        </button>
      </div>
    </div>

    {#if errorMsg}
      <div class="error-msg">{errorMsg}</div>
    {/if}

    <div class="body">
      <aside class="evt-list">
        {#each $currentProjectTimeline as e (e.id)}
          <div
            class="evt-item"
            class:active={e.id === evt.id}
            onclick={() => selectEvt(e)}
          >
            <div class="evt-time">{e.time || '未設定'}</div>
            <div class="evt-title">{e.title}</div>
            {#if e.favorite}<span class="fav">⭐</span>{/if}
          </div>
        {/each}
      </aside>

      <div class="form-area">
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

        {#if $currentProjectCharacters.length > 0}
          <div class="field">
            <label>參與角色</label>
            <div class="char-chips">
              {#each $currentProjectCharacters as c (c.id)}
                <button
                  class="chip"
                  class:active={(form.characterIds || []).includes(c.id)}
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
          {#if (form.images || []).length > 0}
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
  </div>
{/if}

<style>
  .timeline-page {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    flex-shrink: 0;
    gap: 8px;
  }

  .back-btn {
    padding: 6px 10px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  .back-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
  }

  .actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .btn {
    padding: 7px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
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

  .btn.danger {
    color: var(--danger);
  }

  .btn.danger:hover {
    background: var(--danger-soft);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn.icon-only {
    padding: 7px 10px;
    font-size: 14px;
  }

  .btn.active {
    color: var(--warning);
    border-color: var(--warning);
  }

  .error-msg {
    padding: 10px 16px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 13px;
    border-bottom: 1px solid var(--border);
  }

  .body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .evt-list {
    width: 220px;
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
    overflow-y: auto;
    flex-shrink: 0;
  }

  .evt-item {
    padding: 10px 12px;
    cursor: pointer;
    border-left: 3px solid transparent;
    position: relative;
  }

  .evt-item:hover {
    background: var(--bg-hover);
  }

  .evt-item.active {
    background: var(--bg-hover);
    border-left-color: var(--accent);
  }

  .evt-time {
    font-size: 10px;
    color: var(--accent);
    font-weight: 600;
    margin-bottom: 2px;
  }

  .evt-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fav {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 11px;
  }

  .form-area {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field-row {
    display: flex;
    gap: 10px;
  }

  .field-row > .field {
    flex: 1;
  }

  .field label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .field input,
  .field textarea {
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    font-size: 13px;
    color: var(--text);
    outline: none;
    font-family: inherit;
  }

  .field input:focus,
  .field textarea:focus {
    border-color: var(--accent);
  }

  .field textarea {
    resize: vertical;
    line-height: 1.5;
  }

  .char-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-full);
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
  }

  .chip:hover {
    border-color: var(--accent);
  }

  .chip.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
  }

  .chip-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    object-fit: cover;
  }

  .image-url-row {
    display: flex;
    gap: 4px;
  }

  .image-url-row input {
    flex: 1;
  }

  .add-btn {
    width: 32px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
  }

  .add-btn:hover {
    background: var(--bg-hover);
  }

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
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-thumb button {
    position: absolute;
    top: 2px;
    right: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 768px) {
  .body {
    flex-direction: column;
  }

  .evt-list {
    width: 100%;
    max-height: 100px;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .evt-item {
    min-width: 120px;
    padding: 8px;
    border-left: none;
    border-bottom: 3px solid transparent;
  }

  .evt-item.active {
    border-left: none;
    border-bottom-color: var(--accent);
  }

  .form-area {
    padding: 16px;
  }

  .back-btn {
    max-width: 100px;
    font-size: 12px;
  }

  .btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .btn.danger {
    display: none;
  }
}
</style>
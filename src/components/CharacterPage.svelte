<script>
  import {
    currentCharacter, currentProject, appView,
    currentProjectCharacters
  } from '../lib/stores.js';
  import { db } from '../lib/db.js';
  import { loadAll } from '../lib/data.js';

  const char = $derived($currentCharacter);

  const GENDER_OPTIONS = ['未設定', '男', '女', '其他'];

  let form = $state({
    name: '',
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
    notes: ''
  });

  let saving = $state(false);
  let errorMsg = $state('');
  let tagInput = $state('');

  $effect(() => {
    if (char) {
      form = {
        name: char.name || '',
        alias: char.alias || '',
        age: char.age || '',
        gender: char.gender || '未設定',
        birthday: char.birthday || '',
        avatar: char.avatar || '',
        appearance: char.appearance || '',
        personality: char.personality || '',
        background: char.background || '',
        abilities: char.abilities || '',
        tags: [...(char.tags || [])],
        notes: char.notes || ''
      };
    }
  });

  function goBack() {
    currentCharacter.set(null);
    appView.set('project');
  }

  function selectChar(c) {
    currentCharacter.set(c);
  }

  async function save() {
    if (saving || !char) return;
    errorMsg = '';
    if (!form.name.trim()) {
      errorMsg = '請填寫角色姓名';
      return;
    }
    saving = true;
    try {
      await db.characters.update(char.id, {
        name: form.name.trim(),
        alias: form.alias.trim(),
        age: form.age.trim(),
        gender: form.gender || '未設定',
        birthday: form.birthday.trim(),
        avatar: form.avatar || '',
        appearance: form.appearance.trim(),
        personality: form.personality.trim(),
        background: form.background.trim(),
        abilities: form.abilities.trim(),
        tags: [...form.tags],
        notes: form.notes.trim(),
        updatedAt: Date.now()
      });
      await loadAll();
      currentCharacter.update(c => ({ ...c, ...form }));
    } catch (e) {
      console.error('儲存失敗', e);
      errorMsg = '儲存失敗：' + (e?.message || e);
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!char) return;
    if (!confirm(`確定刪除「${char.name}」？`)) return;
    await db.characters.delete(char.id);
    await loadAll();
    goBack();
  }

  async function toggleFavorite() {
    if (!char) return;
    await db.characters.update(char.id, { favorite: !char.favorite, updatedAt: Date.now() });
    await loadAll();
    currentCharacter.update(c => ({ ...c, favorite: !c.favorite }));
  }

  async function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { form.avatar = reader.result; };
    reader.readAsDataURL(file);
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) { tagInput = ''; return; }
    form.tags = [...form.tags, t];
    tagInput = '';
  }

  function removeTag(t) {
    form.tags = form.tags.filter(x => x !== t);
  }
</script>

{#if char}
  <div class="character-page">
    <div class="topbar">
      <button class="back-btn" onclick={goBack}>← {$currentProject?.name || '返回'}</button>
      <div class="actions">
        <button
          class="btn icon-only"
          class:active={char.favorite}
          onclick={toggleFavorite}
          title="我的最愛"
        >{char.favorite ? '⭐' : '☆'}</button>
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
      <aside class="char-list">
        {#each $currentProjectCharacters as c (c.id)}
          <div
            class="char-item"
            class:active={c.id === char.id}
            onclick={() => selectChar(c)}
          >
            <div class="avatar">
              {#if c.avatar}
                <img src={c.avatar} alt={c.name} />
              {:else}
                <span>🎭</span>
              {/if}
            </div>
            <div class="name">{c.name}</div>
            {#if c.favorite}<span class="fav">⭐</span>{/if}
          </div>
        {/each}
      </aside>

      <div class="form-area">
        <div class="form-header">
          <div class="avatar-upload">
            {#if form.avatar}
              <img src={form.avatar} alt="頭像" />
              <button class="remove-avatar" onclick={() => form.avatar = ''}>×</button>
            {:else}
              <label class="upload-label">
                🎭
                <input type="file" accept="image/*" onchange={handleAvatar} />
              </label>
            {/if}
          </div>

          <div class="main-fields">
            <div class="field">
              <label>姓名 *</label>
              <input bind:value={form.name} placeholder="角色名稱" />
            </div>
            <div class="field">
              <label>別名</label>
              <input bind:value={form.alias} placeholder="小名、稱號..." />
            </div>
            <div class="field-row">
              <div class="field">
                <label>年齡</label>
                <input bind:value={form.age} placeholder="24" />
              </div>
              <div class="field">
                <label>性別</label>
                <select bind:value={form.gender}>
                  {#each GENDER_OPTIONS as g}
                    <option value={g}>{g}</option>
                  {/each}
                </select>
              </div>
              <div class="field">
                <label>生日</label>
                <input bind:value={form.birthday} placeholder="3/15" />
              </div>
            </div>
          </div>
        </div>

        <div class="field">
          <label>外貌</label>
          <textarea bind:value={form.appearance} rows="2" placeholder="身高、髮色、穿著..."></textarea>
        </div>

        <div class="field">
          <label>性格</label>
          <textarea bind:value={form.personality} rows="2" placeholder="個性特質..."></textarea>
        </div>

        <div class="field">
          <label>背景</label>
          <textarea bind:value={form.background} rows="3" placeholder="出身、經歷..."></textarea>
        </div>

        <div class="field">
          <label>能力</label>
          <textarea bind:value={form.abilities} rows="2" placeholder="技能、特殊能力..."></textarea>
        </div>

        <div class="field">
          <label>標籤</label>
          <div class="tags">
            {#each form.tags as tag}
              <span class="tag">
                {tag}
                <button onclick={() => removeTag(tag)}>×</button>
              </span>
            {/each}
          </div>
          <div class="tag-input-row">
            <input
              bind:value={tagInput}
              placeholder="新增標籤..."
              onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <button class="add-tag" onclick={addTag}>＋</button>
          </div>
        </div>

        <div class="field">
          <label>備註</label>
          <textarea bind:value={form.notes} rows="3" placeholder="其他備註..."></textarea>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .character-page {
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

  .char-list {
    width: 200px;
    border-right: 1px solid var(--border);
    background: var(--bg-secondary);
    overflow-y: auto;
    flex-shrink: 0;
  }

  .char-item {
    padding: 10px 12px;
    cursor: pointer;
    border-left: 3px solid transparent;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .char-item:hover {
    background: var(--bg-hover);
  }

  .char-item.active {
    background: var(--bg-hover);
    border-left-color: var(--accent);
  }

  .char-item .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .char-item .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .char-item .name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .fav {
    font-size: 11px;
    flex-shrink: 0;
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

  .form-header {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .avatar-upload {
    position: relative;
    width: 96px;
    height: 96px;
    flex-shrink: 0;
  }

  .avatar-upload img {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--border);
  }

  .remove-avatar {
    position: absolute;
    top: 0;
    right: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(0,0,0,0.6);
    color: white;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .upload-label {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    border: 2px dashed var(--border-strong);
    border-radius: 50%;
    cursor: pointer;
    font-size: 28px;
    color: var(--text-secondary);
  }

  .upload-label:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .upload-label input {
    display: none;
  }

  .main-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
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
    font-size: 13px;
    color: var(--text);
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

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 20px;
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

  .tag-input-row input {
    flex: 1;
  }

  .add-tag {
    width: 30px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
  }

  .add-tag:hover {
    background: var(--bg-hover);
  }

  @media (max-width: 768px) {
  .body {
    flex-direction: column;
  }

  .char-list {
    width: 100%;
    max-height: 120px;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .char-item {
    flex-direction: column;
    min-width: 72px;
    padding: 8px 6px;
    border-left: none;
    border-bottom: 3px solid transparent;
    text-align: center;
    gap: 4px;
  }

  .char-item.active {
    border-left: none;
    border-bottom-color: var(--accent);
  }

  .char-item .name {
    font-size: 11px;
    max-width: 60px;
  }

  .form-header {
    flex-direction: column;
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
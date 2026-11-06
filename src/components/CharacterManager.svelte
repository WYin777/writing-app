<script>
  import { onMount } from 'svelte';
  import { db, getFoldersByType } from '../lib/db.js';
  import { characterFolders, characterFolderFilter } from '../lib/stores.js';
  import FolderTree from './FolderTree.svelte';
  import AllFolders from './AllFolders.svelte';

  let characters = $state([]);
  let currentId = $state(null);
  let showForm = $state(false);
  let searchQuery = $state('');
  let saving = $state(false);
  let errorMsg = $state('');

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
    notes: '',
    folderId: null
  });

  let tagInput = $state('');

  async function load() {
    try {
      characters = await db.characters.toArray();
      const folders = await getFoldersByType('character');
      characterFolders.set(folders);
    } catch (e) {
      console.error('載入失敗', e);
    }
  }

  onMount(() => {
    load();
  });

  // 監聽外部資料夾切換
  $effect(() => {
    const fid = $characterFolderFilter;
    if (fid !== null) {
      currentId = null;
      showForm = false;
    }
  });

  const filtered = $derived(
    characters
      .filter(c => {
        const fid = $characterFolderFilter;
        return fid === null || c.folderId === fid;
      })
      .filter(c => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) ||
          (c.alias || '').toLowerCase().includes(q) ||
          (c.tags || []).some(t => t.toLowerCase().includes(q));
      })
  );

  const current = $derived(
    currentId ? characters.find(c => c.id === currentId) : null
  );

  function resetForm() {
    form = {
      name: '', alias: '', age: '', gender: '未設定', birthday: '', avatar: '',
      appearance: '', personality: '', background: '', abilities: '',
      tags: [], notes: '',
      folderId: $characterFolderFilter
    };
    tagInput = '';
    errorMsg = '';
  }

  function startNew() {
    resetForm();
    currentId = null;
    showForm = true;
  }

  function startEdit(char) {
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
      notes: char.notes || '',
      folderId: char.folderId ?? null
    };
    currentId = char.id;
    showForm = true;
    errorMsg = '';
  }

  function cancelForm() {
    showForm = false;
    resetForm();
  }

  async function saveCharacter() {
    if (saving) return;
    errorMsg = '';
    if (!form.name.trim()) {
      errorMsg = '請填寫角色姓名';
      return;
    }
    saving = true;
    try {
      const now = Date.now();
      const payload = {
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
        folderId: form.folderId ?? null,
        updatedAt: now
      };
      if (currentId) {
        await db.characters.update(currentId, payload);
      } else {
        const newId = await db.characters.add({ ...payload, createdAt: now });
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

  async function deleteCharacter(id) {
    if (!confirm('確定刪除這個角色？')) return;
    await db.characters.delete(id);
    if (currentId === id) currentId = null;
    await load();
  }

  async function moveToFolder(char, newFolderId) {
    await db.characters.update(char.id, { folderId: newFolderId, updatedAt: Date.now() });
    await load();
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

  async function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { form.avatar = reader.result; };
    reader.readAsDataURL(file);
  }

  function selectCharacter(char) {
    currentId = char.id;
    showForm = false;
  }

  function onSelectFolder(id) {
    characterFolderFilter.set(id);
    currentId = null;
    showForm = false;
  }
</script>

<div class="character-manager">
  <aside class="folder-panel">
    <FolderTree
      type="character"
      folders={$characterFolders}
      selectedId={$characterFolderFilter}
      onSelect={onSelectFolder}
      onRefresh={load}
      label="角色資料夾"
    />
    <AllFolders />
  </aside>

  <div class="sidebar">
    <div class="sidebar-header">
      <input
        class="search-input"
        placeholder="🔍 搜尋角色..."
        bind:value={searchQuery}
      />
      <button class="new-btn" onclick={startNew}>＋ 新增</button>
    </div>

    {#if filtered.length === 0}
      <div class="empty-hint">
        {searchQuery ? '找不到符合的角色' : '還沒有角色卡'}
      </div>
    {:else}
      <div class="char-list">
        {#each filtered as char (char.id)}
          <div
            class="char-item"
            class:active={currentId === char.id}
            onclick={() => selectCharacter(char)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && selectCharacter(char)}
          >
            <div class="avatar">
              {#if char.avatar}
                <img src={char.avatar} alt={char.name} />
              {:else}
                <span>🎭</span>
              {/if}
            </div>
            <div class="info">
              <div class="name">{char.name}</div>
              {#if char.alias}
                <div class="alias">{char.alias}</div>
              {/if}
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
          <h2>{currentId ? '編輯角色' : '新增角色'}</h2>
          <div class="form-actions">
            <button class="cancel-btn" onclick={cancelForm}>取消</button>
            <button class="save-btn" onclick={saveCharacter} disabled={saving}>
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>

        {#if errorMsg}
          <div class="error-msg">{errorMsg}</div>
        {/if}

        <div class="form-body">
          <div class="row">
            <div class="avatar-upload">
              {#if form.avatar}
                <img src={form.avatar} alt="頭像" />
                <button class="remove-avatar" onclick={() => form.avatar = ''}>×</button>
              {:else}
                <label class="upload-label">
                  🎭 上傳頭像
                  <input type="file" accept="image/*" onchange={handleAvatar} />
                </label>
              {/if}
            </div>

            <div class="fields">
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
            <label>資料夾</label>
            <select bind:value={form.folderId}>
              <option value={null}>（無資料夾）</option>
              {#each $characterFolders as f (f.id)}
                <option value={f.id}>
                  {#if f.parentId}　└ {/if}{f.name}
                </option>
              {/each}
            </select>
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
    {:else if current}
      <div class="detail">
        <div class="detail-header">
          <div class="detail-title">
            <div class="avatar-large">
              {#if current.avatar}
                <img src={current.avatar} alt={current.name} />
              {:else}
                <span>🎭</span>
              {/if}
            </div>
            <div>
              <h2>{current.name}</h2>
              {#if current.alias}
                <p class="alias">{current.alias}</p>
              {/if}
              <div class="meta-info">
                {#if current.age}<span>年齡：{current.age}</span>{/if}
                {#if current.gender && current.gender !== '未設定'}<span>性別：{current.gender}</span>{/if}
                {#if current.birthday}<span>生日：{current.birthday}</span>{/if}
              </div>
            </div>
          </div>
          <div class="detail-actions">
            <button class="edit-btn" onclick={() => startEdit(current)}>✏ 編輯</button>
            <button class="delete-btn" onclick={() => deleteCharacter(current.id)}>🗑 刪除</button>
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
            {#each $characterFolders as f (f.id)}
              <option value={f.id}>
                {#if f.parentId}　└ {/if}{f.name}
              </option>
            {/each}
          </select>
        </div>

        {#if current.tags?.length}
          <div class="tags-display">
            {#each current.tags as tag}
              <span class="tag">{tag}</span>
            {/each}
          </div>
        {/if}

        {#if current.appearance}
          <div class="detail-section">
            <h3>外貌</h3>
            <p>{current.appearance}</p>
          </div>
        {/if}

        {#if current.personality}
          <div class="detail-section">
            <h3>性格</h3>
            <p>{current.personality}</p>
          </div>
        {/if}

        {#if current.background}
          <div class="detail-section">
            <h3>背景</h3>
            <p>{current.background}</p>
          </div>
        {/if}

        {#if current.abilities}
          <div class="detail-section">
            <h3>能力</h3>
            <p>{current.abilities}</p>
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
        <p>🎭</p>
        <p>選擇左側角色查看詳情</p>
        <p class="hint">或點「＋ 新增」建立角色卡</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .character-manager {
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
    width: 240px;
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

  .char-list { flex: 1; overflow-y: auto; }

  .char-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
  }

  .char-item:hover { background: var(--bg-hover); }

  .char-item.active {
    background: var(--bg-hover);
    border-left: 3px solid var(--accent);
    padding-left: 9px;
  }

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    font-size: 18px;
  }

  .avatar img { width: 100%; height: 100%; object-fit: cover; }

  .info { flex: 1; min-width: 0; }

  .name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .alias {
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

  .row { display: flex; gap: 16px; align-items: flex-start; }

  .avatar-upload {
    position: relative;
    width: 100px;
    height: 100px;
    flex-shrink: 0;
  }

  .avatar-upload img {
    width: 100px;
    height: 100px;
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100px;
    height: 100px;
    border: 2px dashed var(--border);
    border-radius: 50%;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-secondary);
    text-align: center;
    gap: 4px;
  }

  .upload-label:hover { border-color: var(--accent); color: var(--accent); }
  .upload-label input { display: none; }

  .fields { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 0; }

  .field { display: flex; flex-direction: column; gap: 4px; }

  .field-row { display: flex; gap: 10px; }

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

  .tags { display: flex; flex-wrap: wrap; gap: 4px; min-height: 20px; }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: var(--bg-secondary);
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
  .tag-input-row input { flex: 1; }

  .add-tag {
    width: 30px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
  }

  .add-tag:hover { background: var(--bg-hover); }

  .detail { padding: 24px; max-width: 720px; margin: 0 auto; }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    gap: 16px;
  }

  .detail-title {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    flex: 1;
  }

  .avatar-large {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    font-size: 32px;
    border: 1px solid var(--border);
  }

  .avatar-large img { width: 100%; height: 100%; object-fit: cover; }

  .detail-title h2 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 2px;
  }

  .detail-title .alias {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 6px;
  }

  .meta-info {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary);
    flex-wrap: wrap;
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

  .tags-display {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 16px;
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
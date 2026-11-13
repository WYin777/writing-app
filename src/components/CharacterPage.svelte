<script>
  import {
    currentCharacter, currentProject, appView,
    currentProjectCharacters
  } from '../lib/stores.js';
  import { db } from '../lib/db.js';
  import { loadAll } from '../lib/data.js';
  import { formatDate } from '../lib/utils.js';

  const char = $derived($currentCharacter);
  const isGameProject = $derived($currentProject?.type === 'game');

  const GENDER_OPTIONS = ['未設定', '男', '女', '其他'];
  const BLOOD_OPTIONS = ['未設定', 'A', 'B', 'O', 'AB'];
  const ROLE_OPTIONS = ['未設定', '可攻略角色', '主角', '配角', '反派', '路人', '隱藏角色'];
  const STATUS_OPTIONS = ['未設定', '存活', '死亡', '失蹤', '未知'];
  const ENDING_TYPE_OPTIONS = ['HappyEnding', 'BadEnding', 'OpenEnding', '其他'];

  const REPRESENT_COLORS = [
    '#0D9488', '#6366F1', '#8B5CF6', '#EC4899',
    '#F59E0B', '#10B981', '#EF4444', '#78716C'
  ];

  let editMode = $state(false);
  let saving = $state(false);
  let errorMsg = $state('');

  let form = $state({
    name: '',
    alias: '',
    age: '',
    gender: '未設定',
    nationality: '',
    representColor: '#0D9488',
    avatar: '',

    height: '',
    weight: '',
    bloodType: '未設定',
    hairColor: '',
    occupations: [],
    identities: [],
    organizations: [],
    residence: '',

    roleType: '未設定',
    firstAppearance: '',
    endingStatus: '未設定',
    characterArc: '',

    attackable: false,
    initialAffection: 0,
    abilities: [],
    exclusiveRoute: '',
    endings: [],

    relations: [],
    family: '',
    pairings: '',

    catchphrase: '',
    notes: ''
  });

  let openSections = $state({
    advanced: false,
    story: false,
    game: false,
    relations: false,
    persona: false
  });

  let occupationInput = $state('');
  let identityInput = $state('');
  let organizationInput = $state('');
  let abilityKeyInput = $state('');
  let abilityValueInput = $state('');

  let newEnding = $state({
    name: '',
    type: 'HappyEnding',
    description: ''
  });

  // 拖曳狀態
  let dragAbilityIdx = $state(null);
  let dragEndingIdx = $state(null);

  $effect(() => {
    if (char) {
      form = {
        name: char.name || '',
        alias: char.alias || '',
        age: char.age || '',
        gender: char.gender || '未設定',
        nationality: char.nationality || '',
        representColor: char.representColor || '#0D9488',
        avatar: char.avatar || '',

        height: char.height || '',
        weight: char.weight || '',
        bloodType: char.bloodType || '未設定',
        hairColor: char.hairColor || '',
        occupations: [...(char.occupations || [])],
        identities: [...(char.identities || [])],
        organizations: [...(char.organizations || [])],
        residence: char.residence || '',

        roleType: char.roleType || '未設定',
        firstAppearance: char.firstAppearance || '',
        endingStatus: char.endingStatus || '未設定',
        characterArc: char.characterArc || '',

        attackable: char.attackable || false,
        initialAffection: char.initialAffection || 0,
        abilities: [...(char.abilities || [])],
        exclusiveRoute: char.exclusiveRoute || '',
        endings: (char.endings || []).map(e => typeof e === 'string'
          ? { name: e, type: '其他', description: '' }
          : { ...e }),

        relations: [...(char.relations || [])],
        family: char.family || '',
        pairings: char.pairings || '',

        catchphrase: char.catchphrase || '',
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
    editMode = false;
  }

  function startEdit() { editMode = true; }

  function cancelEdit() {
    editMode = false;
    if (char) {
      form = {
        name: char.name || '',
        alias: char.alias || '',
        age: char.age || '',
        gender: char.gender || '未設定',
        nationality: char.nationality || '',
        representColor: char.representColor || '#0D9488',
        avatar: char.avatar || '',
        height: char.height || '',
        weight: char.weight || '',
        bloodType: char.bloodType || '未設定',
        hairColor: char.hairColor || '',
        occupations: [...(char.occupations || [])],
        identities: [...(char.identities || [])],
        organizations: [...(char.organizations || [])],
        residence: char.residence || '',
        roleType: char.roleType || '未設定',
        firstAppearance: char.firstAppearance || '',
        endingStatus: char.endingStatus || '未設定',
        characterArc: char.characterArc || '',
        attackable: char.attackable || false,
        initialAffection: char.initialAffection || 0,
        abilities: [...(char.abilities || [])],
        exclusiveRoute: char.exclusiveRoute || '',
        endings: (char.endings || []).map(e => typeof e === 'string'
          ? { name: e, type: '其他', description: '' }
          : { ...e }),
        relations: [...(char.relations || [])],
        family: char.family || '',
        pairings: char.pairings || '',
        catchphrase: char.catchphrase || '',
        notes: char.notes || ''
      };
    }
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
      const payload = JSON.parse(JSON.stringify({
        ...form,
        name: form.name.trim(),
        updatedAt: Date.now()
      }));
      await db.characters.update(char.id, payload);
      await loadAll();
      currentCharacter.update(c => ({ ...c, ...payload }));
      editMode = false;
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

  function addToArr(arr, value) {
    const v = value.trim();
    if (!v || arr.includes(v)) return arr;
    return [...arr, v];
  }

  function addOccupation() {
    form.occupations = addToArr(form.occupations, occupationInput);
    occupationInput = '';
  }
  function removeOccupation(v) {
    form.occupations = form.occupations.filter(x => x !== v);
  }

  function addIdentity() {
    form.identities = addToArr(form.identities, identityInput);
    identityInput = '';
  }
  function removeIdentity(v) {
    form.identities = form.identities.filter(x => x !== v);
  }

  function addOrganization() {
    form.organizations = addToArr(form.organizations, organizationInput);
    organizationInput = '';
  }
  function removeOrganization(v) {
    form.organizations = form.organizations.filter(x => x !== v);
  }

  function addAbility() {
    const k = abilityKeyInput.trim();
    const v = abilityValueInput.trim();
    if (!k) return;
    form.abilities = [...form.abilities, { key: k, value: v }];
    abilityKeyInput = '';
    abilityValueInput = '';
  }
  function removeAbility(idx) {
    form.abilities = form.abilities.filter((_, i) => i !== idx);
  }

  function addEnding() {
    if (!newEnding.name.trim()) return;
    form.endings = [...form.endings, {
      name: newEnding.name.trim(),
      type: newEnding.type || '其他',
      description: newEnding.description.trim()
    }];
    newEnding = { name: '', type: 'HappyEnding', description: '' };
  }

  function removeEnding(idx) {
    form.endings = form.endings.filter((_, i) => i !== idx);
  }

  function toggleSection(key) {
    openSections = { ...openSections, [key]: !openSections[key] };
  }

  // 拖曳排序
  function onAbilityDragStart(e, idx) {
    dragAbilityIdx = idx;
    e.dataTransfer.effectAllowed = 'move';
  }
  function onAbilityDragOver(e, idx) {
    e.preventDefault();
    if (dragAbilityIdx === null || dragAbilityIdx === idx) return;
    const arr = [...form.abilities];
    const [moved] = arr.splice(dragAbilityIdx, 1);
    arr.splice(idx, 0, moved);
    form.abilities = arr;
    dragAbilityIdx = idx;
  }
  function onAbilityDragEnd() {
    dragAbilityIdx = null;
  }

  function onEndingDragStart(e, idx) {
    dragEndingIdx = idx;
    e.dataTransfer.effectAllowed = 'move';
  }
  function onEndingDragOver(e, idx) {
    e.preventDefault();
    if (dragEndingIdx === null || dragEndingIdx === idx) return;
    const arr = [...form.endings];
    const [moved] = arr.splice(dragEndingIdx, 1);
    arr.splice(idx, 0, moved);
    form.endings = arr;
    dragEndingIdx = idx;
  }
  function onEndingDragEnd() {
    dragEndingIdx = null;
  }

  // 手機用上下按鈕
  function moveAbility(idx, direction) {
    const arr = [...form.abilities];
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    form.abilities = arr;
  }
  function moveEnding(idx, direction) {
    const arr = [...form.endings];
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= arr.length) return;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    form.endings = arr;
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

        {#if editMode}
          <button class="btn" onclick={cancelEdit}>取消</button>
          <button class="btn primary" onclick={save} disabled={saving}>
            {saving ? '儲存中...' : '💾 儲存'}
          </button>
        {:else}
          <button class="btn danger" onclick={handleDelete}>🗑 刪除</button>
          <button class="btn primary" onclick={startEdit}>✏ 編輯</button>
        {/if}
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
            <div class="avatar" style="border-color: {c.representColor || 'transparent'}">
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

      <div class="content-area">
        {#if editMode}
          <div class="form-area">
            <div class="section">
              <div class="section-title">基本資料</div>

              <div class="form-header">
                <div class="avatar-upload">
                  {#if form.avatar}
                    <img src={form.avatar} alt="頭像" style="border-color: {form.representColor}" />
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
                  </div>
                  <div class="field-row">
                    <div class="field">
                      <label>國籍</label>
                      <input bind:value={form.nationality} placeholder="例如：日本" />
                    </div>
                    <div class="field">
                      <label>代表色</label>
                      <div class="color-picker">
                        {#each REPRESENT_COLORS as c}
                          <button
                            class="color-swatch"
                            class:selected={form.representColor === c}
                            style="background: {c}"
                            onclick={() => form.representColor = c}
                          ></button>
                        {/each}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 進階資料 -->
            <div class="section">
              <button class="section-toggle" onclick={() => toggleSection('advanced')}>
                <span>{openSections.advanced ? '▾' : '▸'}</span>
                <span>進階資料</span>
              </button>

              {#if openSections.advanced}
                <div class="section-body">
                  <div class="field-row">
                    <div class="field">
                      <label>身高</label>
                      <input bind:value={form.height} placeholder="175cm" />
                    </div>
                    <div class="field">
                      <label>體重</label>
                      <input bind:value={form.weight} placeholder="64kg" />
                    </div>
                    <div class="field">
                      <label>血型</label>
                      <select bind:value={form.bloodType}>
                        {#each BLOOD_OPTIONS as b}
                          <option value={b}>{b}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                  <div class="field">
                    <label>髮色</label>
                    <input bind:value={form.hairColor} placeholder="黑色、銀色..." />
                  </div>
                  <div class="field">
                    <label>職業（可多個）</label>
                    <div class="chips">
                      {#each form.occupations as o}
                        <span class="chip">{o} <button onclick={() => removeOccupation(o)}>×</button></span>
                      {/each}
                    </div>
                    <div class="input-row">
                      <input
                        bind:value={occupationInput}
                        placeholder="新增職業..."
                        onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addOccupation())}
                      />
                      <button class="add-btn" onclick={addOccupation}>＋</button>
                    </div>
                  </div>
                  <div class="field">
                    <label>身份（可多個）</label>
                    <div class="chips">
                      {#each form.identities as o}
                        <span class="chip">{o} <button onclick={() => removeIdentity(o)}>×</button></span>
                      {/each}
                    </div>
                    <div class="input-row">
                      <input
                        bind:value={identityInput}
                        placeholder="新增身份..."
                        onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addIdentity())}
                      />
                      <button class="add-btn" onclick={addIdentity}>＋</button>
                    </div>
                  </div>
                  <div class="field">
                    <label>所屬組織 / 陣營（可多個）</label>
                    <div class="chips">
                      {#each form.organizations as o}
                        <span class="chip">{o} <button onclick={() => removeOrganization(o)}>×</button></span>
                      {/each}
                    </div>
                    <div class="input-row">
                      <input
                        bind:value={organizationInput}
                        placeholder="新增組織 / 陣營..."
                        onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addOrganization())}
                      />
                      <button class="add-btn" onclick={addOrganization}>＋</button>
                    </div>
                  </div>
                  <div class="field">
                    <label>居住地</label>
                    <input bind:value={form.residence} placeholder="例如：北方小鎮" />
                  </div>
                </div>
              {/if}
            </div>

            <!-- 遊戲相關 -->
            {#if isGameProject}
              <div class="section">
                <button class="section-toggle" onclick={() => toggleSection('game')}>
                  <span>{openSections.game ? '▾' : '▸'}</span>
                  <span>🎮 遊戲相關</span>
                </button>

                {#if openSections.game}
                  <div class="section-body">
                    <div class="field-row">
                      <div class="field">
                        <label>可攻略</label>
                        <select bind:value={form.attackable}>
                          <option value={false}>否</option>
                          <option value={true}>是</option>
                        </select>
                      </div>
                      <div class="field">
                        <label>好感度初始值</label>
                        <input type="number" bind:value={form.initialAffection} placeholder="0" />
                      </div>
                    </div>

                    <div class="field">
                      <label>能力數值</label>
                      {#each form.abilities as ab, i}
                        <div
                          class="ability-row"
                          class:dragging={dragAbilityIdx === i}
                          draggable="true"
                          ondragstart={(e) => onAbilityDragStart(e, i)}
                          ondragover={(e) => onAbilityDragOver(e, i)}
                          ondragend={onAbilityDragEnd}
                        >
                          <span class="drag-handle" title="拖曳排序">⋮⋮</span>
                          <div class="mobile-move-buttons">
                            <button
                              class="move-btn"
                              onclick={() => moveAbility(i, -1)}
                              disabled={i === 0}
                              title="上移"
                            >↑</button>
                            <button
                              class="move-btn"
                              onclick={() => moveAbility(i, 1)}
                              disabled={i === form.abilities.length - 1}
                              title="下移"
                            >↓</button>
                          </div>
                          <span class="ability-key">{ab.key}</span>
                          <span class="ability-value">{ab.value}</span>
                          <button class="mini-del" onclick={() => removeAbility(i)}>×</button>
                        </div>
                      {/each}
                      <div class="input-row">
                        <input bind:value={abilityKeyInput} placeholder="名稱（武力）" />
                        <input bind:value={abilityValueInput} placeholder="數值（80）" />
                        <button class="add-btn" onclick={addAbility}>＋</button>
                      </div>
                    </div>

                    <div class="field">
                      <label>專屬事件 / 路線</label>
                      <textarea bind:value={form.exclusiveRoute} rows="2" placeholder="專屬劇情..."></textarea>
                    </div>

                    <div class="field">
                      <label>結局（可多個，每個可加描述）</label>

                      {#each form.endings as e, i}
                        <div
                          class="ending-item"
                          class:dragging={dragEndingIdx === i}
                          draggable="true"
                          ondragstart={(event) => onEndingDragStart(event, i)}
                          ondragover={(event) => onEndingDragOver(event, i)}
                          ondragend={onEndingDragEnd}
                        >
                          <div class="ending-head">
                            <span class="drag-handle" title="拖曳排序">⋮⋮</span>
                            <div class="mobile-move-buttons">
                              <button
                                class="move-btn"
                                onclick={() => moveEnding(i, -1)}
                                disabled={i === 0}
                                title="上移"
                              >↑</button>
                              <button
                                class="move-btn"
                                onclick={() => moveEnding(i, 1)}
                                disabled={i === form.endings.length - 1}
                                title="下移"
                              >↓</button>
                            </div>
                            <span class="ending-name">{e.name}</span>
                            <span class="ending-type {e.type}">{e.type}</span>
                            <button class="mini-del" onclick={() => removeEnding(i)}>×</button>
                          </div>
                          {#if e.description}
                            <div class="ending-desc">{e.description}</div>
                          {/if}
                        </div>
                      {/each}

                      <div class="ending-add">
                        <div class="field-row">
                          <div class="field">
                            <label>名稱</label>
                            <input bind:value={newEnding.name} placeholder="HE1、BE2..." />
                          </div>
                          <div class="field">
                            <label>類型</label>
                            <select bind:value={newEnding.type}>
                              {#each ENDING_TYPE_OPTIONS as t}
                                <option value={t}>{t}</option>
                              {/each}
                            </select>
                          </div>
                        </div>
                        <div class="field">
                          <label>描述</label>
                          <textarea bind:value={newEnding.description} rows="2" placeholder="這個結局的內容..."></textarea>
                        </div>
                        <button class="add-ending-btn" onclick={addEnding}>＋ 新增結局</button>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- 故事相關 -->
            <div class="section">
              <button class="section-toggle" onclick={() => toggleSection('story')}>
                <span>{openSections.story ? '▾' : '▸'}</span>
                <span>故事相關</span>
              </button>

              {#if openSections.story}
                <div class="section-body">
                  <div class="field-row">
                    <div class="field">
                      <label>角色定位</label>
                      <select bind:value={form.roleType}>
                        {#each ROLE_OPTIONS as r}
                          <option value={r}>{r}</option>
                        {/each}
                      </select>
                    </div>
                    <div class="field">
                      <label>結局狀態</label>
                      <select bind:value={form.endingStatus}>
                        {#each STATUS_OPTIONS as s}
                          <option value={s}>{s}</option>
                        {/each}
                      </select>
                    </div>
                  </div>
                  <div class="field">
                    <label>首次登場</label>
                    <input bind:value={form.firstAppearance} placeholder="例如：第一章、某事件" />
                  </div>
                  <div class="field">
                    <label>角色弧線</label>
                    <textarea bind:value={form.characterArc} rows="2" placeholder="一句話描述成長或轉變..."></textarea>
                  </div>
                </div>
              {/if}
            </div>

            <!-- 關係 -->
            <div class="section">
              <button class="section-toggle" onclick={() => toggleSection('relations')}>
                <span>{openSections.relations ? '▾' : '▸'}</span>
                <span>關係</span>
              </button>

              {#if openSections.relations}
                <div class="section-body">
                  <div class="field">
                    <label>家族 / 血緣</label>
                    <input bind:value={form.family} placeholder="家族關係..." />
                  </div>
                  <div class="field">
                    <label>CP / 配對</label>
                    <input bind:value={form.pairings} placeholder="角色配對..." />
                  </div>
                  <div class="hint">關係圖請在專案的「關係圖」頁面編輯</div>
                </div>
              {/if}
            </div>

            <!-- 人設 -->
            <div class="section">
              <button class="section-toggle" onclick={() => toggleSection('persona')}>
                <span>{openSections.persona ? '▾' : '▸'}</span>
                <span>人設</span>
              </button>

              {#if openSections.persona}
                <div class="section-body">
                  <div class="field">
                    <label>口頭禪</label>
                    <input bind:value={form.catchphrase} placeholder="角色的口頭禪..." />
                  </div>
                  <div class="field">
                    <label>備註</label>
                    <textarea bind:value={form.notes} rows="3" placeholder="其他補充..."></textarea>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <!-- 檢視模式 -->
          <div class="view-area">
            <div class="view-header">
              <div class="avatar-large" style="border-color: {char.representColor || 'var(--border)'}">
                {#if char.avatar}
                  <img src={char.avatar} alt={char.name} />
                {:else}
                  <span>🎭</span>
                {/if}
              </div>
              <div class="header-info">
                <h1>
                  {#if char.representColor}
                    <span class="color-dot" style="background: {char.representColor}"></span>
                  {/if}
                  {char.name}
                </h1>
                {#if char.alias}<p class="alias">{char.alias}</p>{/if}
                <div class="meta">
                  {#if char.age}<span>年齡：{char.age}</span>{/if}
                  {#if char.gender && char.gender !== '未設定'}<span>性別：{char.gender}</span>{/if}
                  {#if char.nationality}<span>國籍：{char.nationality}</span>{/if}
                </div>
              </div>
            </div>

            {#if char.height || char.weight || (char.bloodType && char.bloodType !== '未設定') || char.hairColor || char.occupations?.length || char.identities?.length || char.organizations?.length || char.residence}
              <div class="view-section">
                <h3>進階資料</h3>
                <div class="info-grid">
                  {#if char.height}<div><span class="k">身高</span><span>{char.height}</span></div>{/if}
                  {#if char.weight}<div><span class="k">體重</span><span>{char.weight}</span></div>{/if}
                  {#if char.bloodType && char.bloodType !== '未設定'}<div><span class="k">血型</span><span>{char.bloodType}</span></div>{/if}
                  {#if char.hairColor}<div><span class="k">髮色</span><span>{char.hairColor}</span></div>{/if}
                  {#if char.residence}<div><span class="k">居住地</span><span>{char.residence}</span></div>{/if}
                </div>
                {#if char.occupations?.length}
                  <div class="label-row">
                    <span class="k">職業</span>
                    <div class="chips">
                      {#each char.occupations as o}
                        <span class="chip-static">{o}</span>
                      {/each}
                    </div>
                  </div>
                {/if}
                {#if char.identities?.length}
                  <div class="label-row">
                    <span class="k">身份</span>
                    <div class="chips">
                      {#each char.identities as o}
                        <span class="chip-static">{o}</span>
                      {/each}
                    </div>
                  </div>
                {/if}
                {#if char.organizations?.length}
                  <div class="label-row">
                    <span class="k">所屬組織 / 陣營</span>
                    <div class="chips">
                      {#each char.organizations as o}
                        <span class="chip-static">{o}</span>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            {#if isGameProject && (char.attackable || char.initialAffection || char.abilities?.length || char.exclusiveRoute || char.endings?.length)}
              <div class="view-section">
                <h3>🎮 遊戲相關</h3>
                <div class="info-grid">
                  <div><span class="k">可攻略</span><span>{char.attackable ? '是' : '否'}</span></div>
                  <div><span class="k">好感度初始值</span><span>{char.initialAffection || 0}</span></div>
                </div>
                {#if char.abilities?.length}
                  <div class="label-row">
                    <span class="k">能力數值</span>
                    <div class="chips">
                      {#each char.abilities as ab}
                        <span class="chip-static">{ab.key} {ab.value}</span>
                      {/each}
                    </div>
                  </div>
                {/if}
                {#if char.exclusiveRoute}
                  <div class="label-row">
                    <span class="k">專屬路線</span>
                    <p>{char.exclusiveRoute}</p>
                  </div>
                {/if}
                {#if char.endings?.length}
                  <div class="label-row">
                    <span class="k">結局</span>
                    <div class="endings-list">
                      {#each char.endings as e}
                        {@const endingObj = typeof e === 'string' ? { name: e, type: '其他', description: '' } : e}
                        <div class="ending-display">
                          <div class="ending-head">
                            <span class="ending-name">{endingObj.name}</span>
                            <span class="ending-type {endingObj.type}">{endingObj.type}</span>
                          </div>
                          {#if endingObj.description}
                            <div class="ending-desc">{endingObj.description}</div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            {#if (char.roleType && char.roleType !== '未設定') || char.firstAppearance || (char.endingStatus && char.endingStatus !== '未設定') || char.characterArc}
              <div class="view-section">
                <h3>故事相關</h3>
                <div class="info-grid">
                  {#if char.roleType && char.roleType !== '未設定'}<div><span class="k">角色定位</span><span>{char.roleType}</span></div>{/if}
                  {#if char.endingStatus && char.endingStatus !== '未設定'}<div><span class="k">結局狀態</span><span>{char.endingStatus}</span></div>{/if}
                  {#if char.firstAppearance}<div><span class="k">首次登場</span><span>{char.firstAppearance}</span></div>{/if}
                </div>
                {#if char.characterArc}
                  <div class="label-row">
                    <span class="k">角色弧線</span>
                    <p>{char.characterArc}</p>
                  </div>
                {/if}
              </div>
            {/if}

            {#if char.family || char.pairings}
              <div class="view-section">
                <h3>關係</h3>
                {#if char.family}<div class="label-row"><span class="k">家族 / 血緣</span><p>{char.family}</p></div>{/if}
                {#if char.pairings}<div class="label-row"><span class="k">CP / 配對</span><p>{char.pairings}</p></div>{/if}
              </div>
            {/if}

            {#if char.catchphrase || char.notes}
              <div class="view-section">
                <h3>人設</h3>
                {#if char.catchphrase}<div class="label-row"><span class="k">口頭禪</span><p>「{char.catchphrase}」</p></div>{/if}
                {#if char.notes}<div class="label-row"><span class="k">備註</span><p>{char.notes}</p></div>{/if}
              </div>
            {/if}

            <div class="view-meta">
              <span>建立：{formatDate(char.createdAt)}</span>
              <span>更新：{formatDate(char.updatedAt)}</span>
            </div>
          </div>
        {/if}
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

  .back-btn:hover { background: var(--bg-hover); color: var(--text); }

  .actions { display: flex; gap: 6px; flex-shrink: 0; }

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

  .btn:hover { background: var(--bg-hover); }
  .btn.primary { background: var(--accent); color: white; border-color: var(--accent); }
  .btn.primary:hover { background: var(--accent-hover); }
  .btn.danger { color: var(--danger); }
  .btn.danger:hover { background: var(--danger-soft); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn.icon-only { padding: 7px 10px; font-size: 14px; }
  .btn.active { color: var(--warning); border-color: var(--warning); }

  .error-msg {
    padding: 10px 16px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: 13px;
    border-bottom: 1px solid var(--border);
  }

  .body { flex: 1; display: flex; overflow: hidden; }

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

  .char-item:hover { background: var(--bg-hover); }
  .char-item.active { background: var(--bg-hover); border-left-color: var(--accent); }

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
    border: 2px solid transparent;
  }

  .char-item .avatar img { width: 100%; height: 100%; object-fit: cover; }

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

  .fav { font-size: 11px; flex-shrink: 0; }

  .content-area { flex: 1; overflow-y: auto; }

  .form-area {
    padding: 24px;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .section {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    background: var(--bg-card);
  }

  .section-title {
    padding: 12px 16px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid var(--border);
  }

  .section-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    width: 100%;
    text-align: left;
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }

  .section-toggle:hover { background: var(--bg-hover); }

  .section-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-top: 1px solid var(--border);
  }

  .form-header {
    padding: 16px;
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
    border: 3px solid var(--border);
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

  .upload-label:hover { border-color: var(--accent); color: var(--accent); }
  .upload-label input { display: none; }

  .main-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
  }

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
  .field select:focus { border-color: var(--accent); }

  .field textarea { resize: vertical; line-height: 1.5; }

  .color-picker { display: flex; gap: 4px; flex-wrap: wrap; }

  .color-swatch {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid transparent;
  }

  .color-swatch.selected {
    border-color: var(--text);
    box-shadow: 0 0 0 2px var(--bg);
  }

  .chips { display: flex; flex-wrap: wrap; gap: 4px; min-height: 20px; }

  .chip {
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

  .chip button {
    color: var(--accent-text);
    font-size: 14px;
    line-height: 1;
    opacity: 0.6;
  }

  .chip button:hover { opacity: 1; }

  .chip-static {
    display: inline-block;
    padding: 2px 8px;
    background: var(--accent-soft);
    color: var(--accent-text);
    border-radius: var(--radius-full);
    font-size: 11px;
    font-weight: 500;
  }

  .input-row { display: flex; gap: 4px; }
  .input-row input { flex: 1; }

  .add-btn {
    width: 30px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
  }

  .add-btn:hover { background: var(--bg-hover); }

  .ability-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    font-size: 12px;
    margin-bottom: 4px;
    cursor: grab;
  }

  .ability-row.dragging { opacity: 0.4; }

  .ability-key { font-weight: 600; color: var(--text); min-width: 60px; }
  .ability-value { color: var(--text-secondary); flex: 1; }

  .mini-del {
    width: 20px;
    height: 20px;
    border-radius: 3px;
    color: var(--text-secondary);
    font-size: 14px;
  }

  .mini-del:hover { color: var(--danger); background: var(--bg); }

  .drag-handle {
    cursor: grab;
    color: var(--text-muted);
    font-size: 12px;
    padding: 0 4px;
    flex-shrink: 0;
    user-select: none;
  }

  .drag-handle:active { cursor: grabbing; }

  .mobile-move-buttons {
    display: none;
    flex-direction: row;
    gap: 2px;
    flex-shrink: 0;
  }

  .move-btn {
    width: 22px;
    height: 22px;
    font-size: 12px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .move-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    color: var(--text);
    border-color: var(--accent);
  }

  .move-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .hint {
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
    padding: 4px 0;
  }

  .ending-item {
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
    margin-bottom: 6px;
    cursor: grab;
  }

  .ending-item.dragging { opacity: 0.4; }

  .ending-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .ending-name {
    font-weight: 600;
    font-size: 13px;
    color: var(--text);
  }

  .ending-type {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--bg);
    color: var(--text-secondary);
  }

  .ending-type.HappyEnding { color: var(--success); }
  .ending-type.BadEnding { color: var(--danger); }
  .ending-type.OpenEnding { color: var(--warning); }

  .ending-desc {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .ending-add {
    padding: 12px;
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .add-ending-btn {
    padding: 6px 12px;
    background: var(--accent);
    color: white;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    align-self: flex-start;
  }

  .add-ending-btn:hover { background: var(--accent-hover); }

  .view-area {
    padding: 32px 24px;
    max-width: 720px;
    margin: 0 auto;
  }

  .view-header {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }

  .avatar-large {
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: var(--bg-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    overflow: hidden;
    flex-shrink: 0;
    border: 3px solid var(--border);
  }

  .avatar-large img { width: 100%; height: 100%; object-fit: cover; }

  .header-info { flex: 1; min-width: 0; }

  .header-info h1 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }

  .alias { font-size: 14px; color: var(--text-secondary); margin-bottom: 10px; }

  .meta {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-secondary);
    flex-wrap: wrap;
  }

  .view-section { margin-bottom: 24px; }

  .view-section h3 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px 16px;
    margin-bottom: 10px;
  }

  .info-grid > div { display: flex; gap: 8px; font-size: 13px; }

  .k {
    color: var(--text-secondary);
    font-size: 12px;
    min-width: 60px;
    flex-shrink: 0;
  }

  .info-grid > div > span:last-child { color: var(--text); }

  .label-row {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    font-size: 13px;
    align-items: flex-start;
  }

  .label-row p {
    margin: 0;
    white-space: pre-wrap;
    line-height: 1.6;
    color: var(--text);
  }

  .endings-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .ending-display {
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: var(--radius-sm);
  }

  .view-meta {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: var(--text-muted);
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid var(--border);
  }

  @media (max-width: 768px) {
    .body { flex-direction: column; }
    .char-list {
      width: 100%;
      max-height: 100px;
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
    .char-item.active { border-left: none; border-bottom-color: var(--accent); }
    .char-item .name { font-size: 11px; max-width: 60px; }
    .form-header { flex-direction: column; }
    .form-area { padding: 16px; }
    .back-btn { max-width: 100px; font-size: 12px; }
    .btn { padding: 6px 10px; font-size: 12px; }
    .btn.danger { display: none; }
    .view-area { padding: 20px 16px; }
    .view-header { flex-direction: column; align-items: center; text-align: center; }
    .header-info h1 { font-size: 20px; justify-content: center; }
    .meta { justify-content: center; }
    .avatar-large { width: 80px; height: 80px; font-size: 32px; }
    .info-grid { grid-template-columns: 1fr; }

    .drag-handle { display: none; }
    .mobile-move-buttons { display: flex; }
    .ability-row, .ending-item { cursor: default; }
  }
</style>
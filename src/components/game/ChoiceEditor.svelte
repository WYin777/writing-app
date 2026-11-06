<script>
  import { makeChoice } from '../../lib/db.js';

  let { choices = [], characters = [], allNodes = [], onchange } = $props();

  function addChoice() {
    choices = [...choices, makeChoice({ text: '新選項' })];
    onchange(choices);
  }

  function removeChoice(id) {
    choices = choices.filter(c => c.id !== id);
    onchange(choices);
  }

  function updateChoice(id, patch) {
    choices = choices.map(c => c.id === id ? { ...c, ...patch } : c);
    onchange(choices);
  }

  function updateAffection(choice, charId, value) {
    const aff = { ...(choice.affection || {}) };
    if (value === '' || value === null) delete aff[charId];
    else aff[charId] = Number(value);
    updateChoice(choice.id, { affection: aff });
  }

  function addCondition(choice) {
    const conds = [...(choice.conditions || []), { type: 'affection', charId: '', op: '>', value: 0 }];
    updateChoice(choice.id, { conditions: conds });
  }

  function updateCondition(choice, idx, patch) {
    const conds = [...(choice.conditions || [])];
    conds[idx] = { ...conds[idx], ...patch };
    updateChoice(choice.id, { conditions: conds });
  }

  function removeCondition(choice, idx) {
    const conds = [...(choice.conditions || [])];
    conds.splice(idx, 1);
    updateChoice(choice.id, { conditions: conds });
  }

  function addFlag(choice) {
    const flags = [...(choice.flags || []), { key: '', value: true }];
    updateChoice(choice.id, { flags });
  }

  function updateFlag(choice, idx, patch) {
    const flags = [...(choice.flags || [])];
    flags[idx] = { ...flags[idx], ...patch };
    updateChoice(choice.id, { flags });
  }

  function removeFlag(choice, idx) {
    const flags = [...(choice.flags || [])];
    flags.splice(idx, 1);
    updateChoice(choice.id, { flags });
  }

  function addItem(choice) {
    const items = [...(choice.items || []), { key: '', action: 'gain', value: 1 }];
    updateChoice(choice.id, { items });
  }

  function updateItem(choice, idx, patch) {
    const items = [...(choice.items || [])];
    items[idx] = { ...items[idx], ...patch };
    updateChoice(choice.id, { items });
  }

  function removeItem(choice, idx) {
    const items = [...(choice.items || [])];
    items.splice(idx, 1);
    updateChoice(choice.id, { items });
  }
</script>

<div class="choices">
  {#each choices as choice (choice.id)}
    <div class="choice-card">
      <div class="choice-header">
        <span class="bullet">▸</span>
        <input
          class="choice-text"
          value={choice.text || ''}
          placeholder="選項文字..."
          oninput={(e) => updateChoice(choice.id, { text: e.target.value })}
        />
        <button class="del" onclick={() => removeChoice(choice.id)} title="刪除">×</button>
      </div>

      <div class="choice-body">
        <div class="field">
          <label>跳轉到</label>
          <select
            value={choice.jumpTo || ''}
            onchange={(e) => updateChoice(choice.id, { jumpTo: e.target.value || null })}
          >
            <option value="">（不跳轉）</option>
            {#each allNodes as n (n.id)}
              <option value={n.id}>{n.text || n.title || '（未命名節點）'}</option>
            {/each}
          </select>
        </div>

        {#if characters.length > 0}
          <div class="field">
            <label>好感度變化</label>
            <div class="affection-list">
              {#each characters as char (char.id)}
                <div class="affection-row">
                  <span class="char-name">{char.name}</span>
                  <input
                    type="number"
                    class="num-input"
                    value={choice.affection?.[char.id] ?? ''}
                    placeholder="0"
                    oninput={(e) => updateAffection(choice, char.id, e.target.value)}
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="field">
          <div class="field-header">
            <label>顯示條件</label>
            <button class="mini" onclick={() => addCondition(choice)}>＋</button>
          </div>
          {#each choice.conditions || [] as cond, i}
            <div class="cond-row">
              <select
                value={cond.type}
                onchange={(e) => updateCondition(choice, i, { type: e.target.value })}
              >
                <option value="affection">好感度</option>
                <option value="flag">旗標</option>
                <option value="item">道具</option>
              </select>
              {#if cond.type === 'affection'}
                <select
                  value={cond.charId || ''}
                  onchange={(e) => updateCondition(choice, i, { charId: e.target.value })}
                >
                  <option value="">角色</option>
                  {#each characters as c (c.id)}
                    <option value={c.id}>{c.name}</option>
                  {/each}
                </select>
                <select
                  value={cond.op || '>'}
                  onchange={(e) => updateCondition(choice, i, { op: e.target.value })}
                >
                  <option value=">">&gt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                  <option value="==">=</option>
                </select>
                <input
                  type="number"
                  class="num-input"
                  value={cond.value ?? 0}
                  oninput={(e) => updateCondition(choice, i, { value: Number(e.target.value) })}
                />
              {:else}
                <input
                  class="key-input"
                  placeholder="key"
                  value={cond.key || ''}
                  oninput={(e) => updateCondition(choice, i, { key: e.target.value })}
                />
                <input
                  class="key-input"
                  placeholder="值"
                  value={cond.value ?? ''}
                  oninput={(e) => updateCondition(choice, i, { value: e.target.value })}
                />
              {/if}
              <button class="mini del" onclick={() => removeCondition(choice, i)}>×</button>
            </div>
          {/each}
        </div>

        <div class="field">
          <div class="field-header">
            <label>設定旗標</label>
            <button class="mini" onclick={() => addFlag(choice)}>＋</button>
          </div>
          {#each choice.flags || [] as flag, i}
            <div class="cond-row">
              <input
                class="key-input"
                placeholder="flag key"
                value={flag.key || ''}
                oninput={(e) => updateFlag(choice, i, { key: e.target.value })}
              />
              <label class="checkbox-row">
                <input
                  type="checkbox"
                  checked={flag.value === true}
                  onchange={(e) => updateFlag(choice, i, { value: e.target.checked })}
                />
                true
              </label>
              <button class="mini del" onclick={() => removeFlag(choice, i)}>×</button>
            </div>
          {/each}
        </div>

        <div class="field">
          <div class="field-header">
            <label>道具</label>
            <button class="mini" onclick={() => addItem(choice)}>＋</button>
          </div>
          {#each choice.items || [] as item, i}
            <div class="cond-row">
              <input
                class="key-input"
                placeholder="道具名"
                value={item.key || ''}
                oninput={(e) => updateItem(choice, i, { key: e.target.value })}
              />
              <select
                value={item.action || 'gain'}
                onchange={(e) => updateItem(choice, i, { action: e.target.value })}
              >
                <option value="gain">獲得</option>
                <option value="lose">消耗</option>
              </select>
              <input
                type="number"
                class="num-input"
                value={item.value ?? 1}
                oninput={(e) => updateItem(choice, i, { value: Number(e.target.value) })}
              />
              <button class="mini del" onclick={() => removeItem(choice, i)}>×</button>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/each}

  <button class="add-choice" onclick={addChoice}>＋ 新增選項</button>
</div>

<style>
  .choices {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .choice-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .choice-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-bottom: 1px solid var(--border);
  }

  .bullet {
    color: var(--accent);
    font-size: 12px;
  }

  .choice-text {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    outline: none;
  }

  .del {
    color: var(--text-secondary);
    font-size: 14px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
  }

  .del:hover {
    color: var(--danger);
    background: var(--bg-hover);
  }

  .choice-body {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field label {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .field-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .field select,
  .field input {
    padding: 4px 6px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: var(--bg);
    color: var(--text);
    font-size: 12px;
    outline: none;
    font-family: inherit;
  }

  .field select:focus,
  .field input:focus {
    border-color: var(--accent);
  }

  .mini {
    font-size: 11px;
    width: 20px;
    height: 20px;
    border-radius: 3px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mini:hover {
    background: var(--bg-hover);
    color: var(--accent);
  }

  .affection-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .affection-row {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .char-name {
    flex: 1;
    font-size: 12px;
    color: var(--text);
  }

  .num-input {
    width: 60px;
  }

  .key-input {
    flex: 1;
    min-width: 60px;
  }

  .cond-row {
    display: flex;
    gap: 4px;
    align-items: center;
    margin-bottom: 3px;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .checkbox-row input {
    width: auto;
  }

  .add-choice {
    padding: 8px 12px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    color: var(--text-secondary);
    font-size: 12px;
    background: transparent;
  }

  .add-choice:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
</style>
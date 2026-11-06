<script>
  import OutlineNode from './OutlineNode.svelte';
  import { currentArticle } from '../lib/stores.js';
  import { updateArticle, makeOutlineNode } from '../lib/db.js';
  import { findNode, findParent, removeNode, deepClone } from '../lib/utils.js';

  let outline = $state([]);
  let articleId = $state(null);
  let lastLoadedId = null;

  $effect(() => {
    if ($currentArticle && $currentArticle.id !== lastLoadedId) {
      lastLoadedId = $currentArticle.id;
      articleId = $currentArticle.id;
      outline = deepClone($currentArticle.outline || []);
    }
  });

  let saveTimer = null;
  function save() {
    if (!articleId) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const snapshot = deepClone(outline);
      await updateArticle(articleId, { outline: snapshot });
      currentArticle.update(a => a ? { ...a, outline: snapshot } : a);
    }, 300);
  }

  function handleChange(action, nodeId, extra, pos) {
    if (!action) {
      save();
      return;
    }

    if (action === 'addSibling') {
      const info = findParent(outline, nodeId);
      if (!info) {
        outline.push(makeOutlineNode());
      } else {
        const idx = info.siblings.findIndex(n => n.id === nodeId);
        info.siblings.splice(idx + 1, 0, makeOutlineNode());
      }
      save();
    } else if (action === 'addChild') {
      const node = findNode(outline, nodeId);
      if (!node) return;
      if (!node.children) node.children = [];
      node.children.push(makeOutlineNode());
      node.collapsed = false;
      save();
    } else if (action === 'indent') {
      const info = findParent(outline, nodeId);
      if (!info) return;
      const idx = info.siblings.findIndex(n => n.id === nodeId);
      if (idx === 0) return;
      const prev = info.siblings[idx - 1];
      const node = info.siblings.splice(idx, 1)[0];
      if (!prev.children) prev.children = [];
      prev.children.push(node);
      save();
    } else if (action === 'outdent') {
      const info = findParent(outline, nodeId);
      if (!info || !info.parent) return;
      const grandInfo = findParent(outline, info.parent.id);
      if (!grandInfo) return;
      const idx = info.siblings.findIndex(n => n.id === nodeId);
      const node = info.siblings.splice(idx, 1)[0];
      const parentIdx = grandInfo.siblings.findIndex(n => n.id === info.parent.id);
      grandInfo.siblings.splice(parentIdx + 1, 0, node);
      save();
    } else if (action === 'insert') {
      const info = findParent(outline, nodeId);
      if (!info) return;
      const idx = info.siblings.findIndex(n => n.id === nodeId);
      const newNode = makeOutlineNode({ type: extra });
      if (extra === 'todo') newNode.text = '待辦事項';
      if (extra === 'highlight') newNode.text = '高亮文字';
      if (extra === 'collapse') newNode.text = '摺疊區塊標題';
      info.siblings.splice(idx + 1, 0, newNode);
      save();
    }
  }

  function handleDelete(nodeId) {
    const info = findParent(outline, nodeId);
    if (!info) return;
    const idx = info.siblings.findIndex(n => n.id === nodeId);
    info.siblings.splice(idx, 1);
    save();
  }

  function handleMove(draggedId, targetId, pos) {
    if (draggedId === targetId) return;
    // 防止拖到自己的子節點裡
    const draggedNode = findNode(outline, draggedId);
    if (!draggedNode) return;
    if (findNode(draggedNode.children || [], targetId)) return;

    const removed = removeNode(outline, draggedId);
    if (!removed) return;

    if (pos === 'inside') {
      const target = findNode(outline, targetId);
      if (target) {
        if (!target.children) target.children = [];
        target.children.push(removed);
        target.collapsed = false;
      } else {
        outline.push(removed);
      }
    } else {
      const info = findParent(outline, targetId);
      if (!info) {
        outline.push(removed);
      } else {
        const idx = info.siblings.findIndex(n => n.id === targetId);
        const insertIdx = pos === 'before' ? idx : idx + 1;
        info.siblings.splice(insertIdx, 0, removed);
      }
    }
    save();
  }

  function addRootNode() {
    outline.push(makeOutlineNode({ text: '新章節' }));
    save();
  }
</script>

<div class="outline-editor">
  {#if outline.length === 0}
    <div class="empty">
      <p>還沒有大綱</p>
      <button class="add-btn" onclick={addRootNode}>＋ 新增節點</button>
    </div>
  {:else}
    <div class="outline-tree">
      {#each outline as node (node.id)}
        <OutlineNode
          {node}
          level={0}
          {outline}
          onchange={handleChange}
          ondelete={handleDelete}
          onmove={handleMove}
        />
      {/each}
    </div>
    <button class="add-root" onclick={addRootNode}>＋ 新增節點</button>
  {/if}
</div>

<style>
  .outline-editor {
    width: 100%;
    max-width: 820px;
    margin: 0 auto;
    padding: 24px;
  }

  .outline-tree {
    margin-bottom: 8px;
  }

  .add-root {
    font-size: 13px;
    color: var(--text-secondary);
    padding: 8px 12px;
    border-radius: var(--radius);
    width: 100%;
    text-align: left;
  }

  .add-root:hover {
    background: var(--bg-hover);
    color: var(--accent);
  }

  .empty {
    text-align: center;
    padding: 48px 24px;
    color: var(--text-secondary);
  }

  .add-btn {
    margin-top: 12px;
    padding: 8px 16px;
    background: var(--accent);
    color: white;
    border-radius: var(--radius);
    font-size: 13px;
  }

  .add-btn:hover {
    background: var(--accent-hover);
  }
</style>
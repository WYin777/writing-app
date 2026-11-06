<script>
  import GameNodeCard from './game/GameNodeCard.svelte';
  import { currentArticle, articles } from '../lib/stores.js';
  import { updateArticle, makeOutlineNode } from '../lib/db.js';
  import { findNode, findParent, removeNode, deepClone } from '../lib/utils.js';
  import { db } from '../lib/db.js';

  let outline = $state([]);
  let articleId = $state(null);
  let lastLoadedId = null;
  let characters = $state([]);

  $effect(() => {
    if ($currentArticle && $currentArticle.id !== lastLoadedId) {
      lastLoadedId = $currentArticle.id;
      articleId = $currentArticle.id;
      outline = deepClone($currentArticle.outline || []);
    }
  });

  $effect(() => {
    db.characters.toArray().then(list => {
      characters = list;
    });
  });

  // 收集所有節點（給跳轉下拉用）
  const allNodes = $derived.by(() => {
    const result = [];
    function walk(nodes) {
      for (const n of nodes) {
        result.push(n);
        if (n.children?.length) walk(n.children);
      }
    }
    walk(outline);
    return result;
  });

  let saveTimer = null;
  function save() {
    if (!articleId) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const snapshot = deepClone(outline);
      await updateArticle(articleId, { outline: snapshot });
      currentArticle.update(a => a ? { ...a, outline: snapshot } : a);
      const list = await db.articles.toArray();
      articles.set(list.sort((a, b) => b.updatedAt - a.updatedAt));
    }, 300);
  }

  function handleDelete(nodeId) {
    const info = findParent(outline, nodeId);
    if (!info) return;
    const idx = info.siblings.findIndex(n => n.id === nodeId);
    info.siblings.splice(idx, 1);
    save();
  }

  function handleMove(draggedId, targetId) {
    if (draggedId === targetId) return;
    const draggedNode = findNode(outline, draggedId);
    if (!draggedNode) return;
    if (findNode(draggedNode.children || [], targetId)) return;

    const removed = removeNode(outline, draggedId);
    if (!removed) return;

    const target = findNode(outline, targetId);
    if (target) {
      if (!target.children) target.children = [];
      target.children.push(removed);
      target.collapsed = false;
    } else {
      outline.push(removed);
    }
    save();
  }

  function addRootNode() {
    outline.push(makeOutlineNode({ nodeKind: 'scene', text: '新場景' }));
    save();
  }
</script>

<div class="game-outline">
  {#if outline.length === 0}
    <div class="empty">
      <p>🎮 還沒有遊戲大綱</p>
      <button class="add-btn" onclick={addRootNode}>＋ 新增節點</button>
    </div>
  {:else}
    <div class="tree">
      {#each outline as node (node.id)}
        <GameNodeCard
          {node}
          level={0}
          {characters}
          {allNodes}
          onchange={save}
          ondelete={handleDelete}
          onmove={handleMove}
        />
      {/each}
    </div>
    <button class="add-root" onclick={addRootNode}>＋ 新增根節點</button>
  {/if}
</div>

<style>
  .game-outline {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    padding: 24px;
  }

  .tree {
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
<script>
  import { projectStats, recentEdits, appView, currentProject } from '../lib/stores.js';
  import { createProject, getAllProjects } from '../lib/db.js';
  import { projects } from '../lib/stores.js';
  import { loadAll } from '../lib/data.js';
  import { formatDate } from '../lib/utils.js';

  const TYPE_META = {
    game:    { label: '遊戲',   icon: '🎮', color: 'var(--type-game)', soft: 'var(--type-game-soft)' },
    novel:   { label: '小說',   icon: '📖', color: 'var(--type-novel)', soft: 'var(--type-novel-soft)' },
    essay:   { label: '隨筆',   icon: '📝', color: 'var(--type-essay)', soft: 'var(--type-essay-soft)' },
    other:   { label: '其他',   icon: '📦', color: 'var(--type-other)', soft: 'var(--type-other-soft)' }
  };

  const STATUS_META = {
    writing: { label: '進行中', color: 'var(--accent)' },
    done:    { label: '完成',   color: 'var(--success)' },
    paused:  { label: '擱置',   color: 'var(--text-muted)' }
  };

  function typeMeta(t) { return TYPE_META[t] || TYPE_META.other; }
  function statusMeta(s) { return STATUS_META[s] || STATUS_META.writing; }

  async function handleNewProject() {
    const name = prompt('專案名稱？');
    if (!name) return;
    const type = prompt('專案類型？（game / novel / essay / other）', 'game');
    if (!type) return;
    const id = await createProject({ name, type });
    await loadAll();
    openProject(await getAllProjects().then(list => list.find(p => p.id === id)));
  }

  function openProject(project) {
    currentProject.set(project);
    appView.set('project');
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return '剛剛';
    if (min < 60) return `${min} 分鐘前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} 小時前`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day} 天前`;
    return formatDate(ts);
  }

  function openRecent(item) {
    const proj = $projects.find(p => p.id === item.projectId);
    if (!proj) return;
    currentProject.set(proj);
    appView.set('project');
  }
</script>

<div class="home">
  <div class="home-header">
  <h1>📁 我的專案</h1>
  <div class="header-actions">
    <button class="fav-btn" onclick={() => appView.set('favorites')}>⭐ 我的最愛</button>
    <button class="new-btn" onclick={handleNewProject}>＋ 新增專案</button>
  </div>
</div>

  {#if $recentEdits.length > 0}
    <div class="section">
      <h2>最近編輯</h2>
      <div class="recent-list">
        {#each $recentEdits as item (item.type + item.id)}
          <div
            class="recent-item"
            onclick={() => openRecent(item)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && openRecent(item)}
          >
            <span class="recent-icon">
              {item.type === 'article' ? '📄' : item.type === 'character' ? '🎭' : '⏳'}
            </span>
            <span class="recent-project">{item.projectName}</span>
            <span class="recent-sep">/</span>
            <span class="recent-title">{item.title}</span>
            <span class="recent-time">{timeAgo(item.updatedAt)}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="section">
    <h2>所有專案（{$projectStats.length}）</h2>
    {#if $projectStats.length === 0}
      <div class="empty">
        <p>還沒有專案</p>
        <p class="hint">點「＋ 新增專案」開始</p>
      </div>
    {:else}
      <div class="project-grid">
        {#each $projectStats as project (project.id)}
          {@const tm = typeMeta(project.type)}
          {@const sm = statusMeta(project.status)}
          <div
            class="project-card"
            onclick={() => openProject(project)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && openProject(project)}
          >
            <div class="card-top" style="background: {tm.soft}">
              <span class="type-icon" style="color: {tm.color}">{tm.icon}</span>
            </div>
            <div class="card-body">
              <h3>{project.name}</h3>
              <div class="stats">
                <span>📄 {project.articleCount} 篇文章</span>
                <span>🎭 {project.characterCount} 個角色</span>
              </div>
              {#if project.summary}
                <p class="summary">{project.summary}</p>
              {/if}
              <div class="status">
                <span class="dot" style="background: {sm.color}"></span>
                <span>{sm.label}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .home {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 24px;
  }

  .home-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }
.header-actions {
  display: flex;
  gap: 8px;
}

.fav-btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
}

.fav-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
}

  h1 {
    font-size: 24px;
    font-weight: 600;
    color: var(--text);
  }

  .new-btn {
    padding: 8px 16px;
    background: var(--accent);
    color: white;
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 500;
  }

  .new-btn:hover {
    background: var(--accent-hover);
  }

  .section {
    margin-bottom: 32px;
  }

  .section h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  .recent-list {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    font-size: 13px;
    cursor: pointer;
    border-bottom: 1px solid var(--border);
  }

  .recent-item:last-child {
    border-bottom: none;
  }

  .recent-item:hover {
    background: var(--bg-hover);
  }

  .recent-icon {
    font-size: 14px;
    width: 20px;
  }

  .recent-project {
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .recent-sep {
    color: var(--text-muted);
  }

  .recent-title {
    flex: 1;
    color: var(--text);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .recent-time {
    color: var(--text-muted);
    font-size: 12px;
    flex-shrink: 0;
  }

  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 16px;
  }

  @media (max-width: 640px) {
    .project-grid {
      grid-template-columns: 1fr;
    }
  }

  .project-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .project-card:hover {
    border-color: var(--accent);
    box-shadow: var(--shadow);
    transform: translateY(-2px);
  }

  .card-top {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .type-icon {
    font-size: 28px;
  }

  .card-body {
    padding: 16px;
  }

  .card-body h3 {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 8px;
  }

  .stats {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .summary {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.5;
    margin-bottom: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--text-secondary);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
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

  @media (max-width: 768px) {
  .home {
    padding: 20px 16px;
  }

  .home-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  h1 {
    font-size: 20px;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions button {
    flex: 1;
  }

  .recent-item {
    padding: 10px 12px;
    font-size: 12px;
  }

  .recent-time {
    display: none;
  }

  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>


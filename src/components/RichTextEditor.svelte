<script>
  import { onMount } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Image from '@tiptap/extension-image';
  import Link from '@tiptap/extension-link';
  import Placeholder from '@tiptap/extension-placeholder';
  import TaskList from '@tiptap/extension-task-list';
  import TaskItem from '@tiptap/extension-task-item';
  import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table';
  import { currentArticle } from '../lib/stores.js';
  import { updateArticle } from '../lib/db.js';

  let editorEl = $state(null);
  let editor = null;
  let articleId = null;

  onMount(() => {
    editor = new Editor({
      element: editorEl,
      extensions: [
        StarterKit,
        Image.configure({ inline: false, allowBase64: true }),
        Link.configure({ openOnClick: false }),
        Placeholder.configure({ placeholder: '開始寫正文...' }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell
      ],
      content: '',
      onUpdate: ({ editor }) => {
        debounceSave(editor.getHTML());
      }
    });

    return () => editor?.destroy();
  });

  let saveTimer = null;
  function debounceSave(html) {
    if (!articleId) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      await updateArticle(articleId, { content: html });
      currentArticle.update(a => ({ ...a, content: html }));
    }, 800);
  }

  $effect(() => {
    if ($currentArticle && editor) {
      if (articleId !== $currentArticle.id) {
        articleId = $currentArticle.id;
        editor.commands.setContent($currentArticle.content || '<p></p>', false);
      }
    }
  });

  function insertImage() {
    const url = prompt('圖片網址（或貼上 Base64）');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  function setLink() {
    const url = prompt('連結網址');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }

  function insertTable() {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }

  const commands = [
    { label: 'B', title: '粗體', action: () => editor.chain().focus().toggleBold().run(), isActive: 'bold' },
    { label: 'I', title: '斜體', action: () => editor.chain().focus().toggleItalic().run(), isActive: 'italic' },
    { label: 'S', title: '刪除線', action: () => editor.chain().focus().toggleStrike().run(), isActive: 'strike' },
    { label: 'H1', title: '標題1', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: 'heading', level: 1 },
    { label: 'H2', title: '標題2', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: 'heading', level: 2 },
    { label: '•', title: '清單', action: () => editor.chain().focus().toggleBulletList().run(), isActive: 'bulletList' },
    { label: '1.', title: '編號', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: 'orderedList' },
    { label: '☑', title: '待辦', action: () => editor.chain().focus().toggleTaskList().run(), isActive: 'taskList' },
    { label: '<>', title: '程式碼', action: () => editor.chain().focus().toggleCodeBlock().run(), isActive: 'codeBlock' },
    { label: '❝', title: '引用', action: () => editor.chain().focus().toggleBlockquote().run(), isActive: 'blockquote' },
    { label: '―', title: '分隔線', action: () => editor.chain().focus().setHorizontalRule().run() },
    { label: '🔗', title: '連結', action: setLink, isActive: 'link' },
    { label: '🖼', title: '圖片', action: insertImage },
    { label: '📊', title: '表格', action: insertTable }
  ];

  function isActive(cmd) {
    if (!editor) return false;
    if (cmd.isActive === 'heading') {
      return editor.isActive('heading', { level: cmd.level });
    }
    return editor.isActive(cmd.isActive);
  }
</script>

<div class="editor-wrap">
  <div class="toolbar">
    {#each commands as cmd}
      <button
        class:active={isActive(cmd)}
        title={cmd.title}
        onclick={cmd.action}
      >{cmd.label}</button>
    {/each}
  </div>
  <div class="editor" bind:this={editorEl}></div>
</div>

<style>
  .editor-wrap {
    max-width: 800px;
    margin: 0 auto;
    padding: 16px;
    width: 100%;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    padding: 6px;
    border: 1px solid var(--border);
    border-radius: var(--radius) var(--radius) 0 0;
    border-bottom: none;
    background: var(--bg-secondary);
  }

  .toolbar button {
    min-width: 30px;
    height: 30px;
    padding: 0 8px;
    border-radius: 3px;
    font-size: 13px;
    color: var(--text);
  }

  .toolbar button:hover {
    background: var(--bg-hover);
  }

  .toolbar button.active {
    background: var(--accent);
    color: white;
  }

  .editor {
    flex: 1;
    border: 1px solid var(--border);
    border-radius: 0 0 var(--radius) var(--radius);
    padding: 16px;
    overflow-y: auto;
    background: var(--bg);
  }

  .editor :global(.ProseMirror) {
    outline: none;
    min-height: 300px;
    font-size: 15px;
    line-height: 1.7;
    color: var(--text);
  }

  .editor :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: var(--text-secondary);
    float: left;
    height: 0;
    pointer-events: none;
  }

  .editor :global(.ProseMirror h1) { font-size: 24px; margin: 16px 0 8px; }
  .editor :global(.ProseMirror h2) { font-size: 20px; margin: 14px 0 6px; }
  .editor :global(.ProseMirror h3) { font-size: 17px; margin: 12px 0 6px; }
  .editor :global(.ProseMirror p) { margin: 8px 0; }
  .editor :global(.ProseMirror ul),
  .editor :global(.ProseMirror ol) { padding-left: 24px; margin: 8px 0; }
  .editor :global(.ProseMirror blockquote) {
    border-left: 3px solid var(--accent);
    padding-left: 12px;
    margin: 12px 0;
    color: var(--text-secondary);
  }
  .editor :global(.ProseMirror code) {
    background: var(--bg-hover);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Consolas', monospace;
    font-size: 13px;
  }
  .editor :global(.ProseMirror pre) {
    background: var(--bg-secondary);
    padding: 12px;
    border-radius: var(--radius);
    overflow-x: auto;
    margin: 12px 0;
  }
  .editor :global(.ProseMirror pre code) {
    background: transparent;
    padding: 0;
  }
  .editor :global(.ProseMirror img) {
    max-width: 100%;
    height: auto;
    border-radius: var(--radius);
  }
  .editor :global(.ProseMirror hr) {
    border: none;
    border-top: 1px solid var(--border);
    margin: 16px 0;
  }
  .editor :global(.ProseMirror table) {
    border-collapse: collapse;
    width: 100%;
    margin: 12px 0;
  }
  .editor :global(.ProseMirror td),
  .editor :global(.ProseMirror th) {
    border: 1px solid var(--border);
    padding: 6px 10px;
    text-align: left;
  }
  .editor :global(.ProseMirror th) {
    background: var(--bg-secondary);
    font-weight: 600;
  }
  .editor :global(.ProseMirror ul[data-type="taskList"]) {
    list-style: none;
    padding-left: 0;
  }
  .editor :global(.ProseMirror ul[data-type="taskList"] li) {
    display: flex;
    gap: 8px;
    align-items: flex-start;
  }
  .editor :global(.ProseMirror a) {
    color: var(--accent);
    text-decoration: underline;
  }
</style>
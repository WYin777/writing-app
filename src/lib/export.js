import { saveAs } from 'file-saver';

// 將大綱節點轉成 Markdown
function outlineToMarkdown(nodes, level = 0) {
  let md = '';
  for (const node of nodes) {
    const indent = '  '.repeat(level);

    if (node.type === 'text' || node.type === 'todo' || !node.type) {
      let line = node.text || '';
      if (node.type === 'todo') {
        line = `- [${node.data?.checked ? 'x' : ' '}] ${line}`;
      } else {
        line = `- ${line}`;
      }
      if (node.bold) line = line.replace(/^- (\[.\])? /, (m) => m + '**') + '**';
      md += `${indent}${line}\n`;
    } else if (node.type === 'image' && node.data?.src) {
      md += `${indent}![${node.data.alt || '圖片'}](${node.data.src})\n`;
    } else if (node.type === 'code') {
      md += `${indent}\`\`\`${node.data?.language || ''}\n${node.data?.code || ''}\n${indent}\`\`\`\n`;
    } else if (node.type === 'quote') {
      md += `${indent}> ${node.data?.text || ''}\n`;
      if (node.data?.source) md += `${indent}> — ${node.data.source}\n`;
    } else if (node.type === 'divider') {
      md += `${indent}---\n`;
    } else if (node.type === 'highlight') {
      md += `${indent}==${node.data?.text || node.text || ''}==\n`;
    } else if (node.type === 'table') {
      const rows = node.data?.rows || 0;
      const cols = node.data?.cols || 0;
      const cells = node.data?.cells || [];
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          row.push(cells[r]?.[c] || '');
        }
        md += `${indent}| ${row.join(' | ')} |\n`;
        if (r === 0) {
          md += `${indent}| ${Array(cols).fill('---').join(' | ')} |\n`;
        }
      }
    } else if (node.type === 'collapse') {
      md += `${indent}**📦 ${node.text || '摺疊區塊'}**\n`;
      if (node.data?.text) md += `${indent}${node.data.text}\n`;
    }

    if (node.children?.length) {
      md += outlineToMarkdown(node.children, level + 1);
    }
  }
  return md;
}

// 匯出 Markdown
export function exportMarkdown(article) {
  let md = `# ${article.title}\n\n`;
  if (article.summary) md += `${article.summary}\n\n`;
  if (article.tags?.length) md += `標籤：${article.tags.map(t => `#${t}`).join(' ')}\n\n`;
  md += `---\n\n`;

  if (article.outline?.length) {
    md += `## 大綱\n\n`;
    md += outlineToMarkdown(article.outline);
    md += `\n`;
  }

  if (article.content && article.content !== '<p></p>') {
    md += `## 正文\n\n`;
    md += htmlToMarkdown(article.content);
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${article.title || '未命名'}.md`);
}

// 簡單 HTML → Markdown（用於正文）
function htmlToMarkdown(html) {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*>/g, '![]($1)')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// 匯出 TXT
export function exportTxt(article) {
  let txt = `${article.title}\n${'='.repeat(article.title.length)}\n\n`;
  if (article.summary) txt += `${article.summary}\n\n`;

  if (article.outline?.length) {
    txt += `【大綱】\n\n`;
    txt += outlineToText(article.outline);
    txt += `\n`;
  }

  if (article.content && article.content !== '<p></p>') {
    txt += `【正文】\n\n`;
    txt += article.content.replace(/<[^>]+>/g, '').trim();
  }

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${article.title || '未命名'}.txt`);
}

function outlineToText(nodes, level = 0) {
  let txt = '';
  for (const node of nodes) {
    const indent = '  '.repeat(level);
    const prefix = node.type === 'todo' ? `[${node.data?.checked ? 'x' : ' '}] ` : '- ';
    txt += `${indent}${prefix}${node.text || node.data?.text || ''}\n`;
    if (node.children?.length) {
      txt += outlineToText(node.children, level + 1);
    }
  }
  return txt;
}
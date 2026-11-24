// Zero-dependency safe Markdown-to-HTML renderer for dekubi

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInline(raw) {
  let text = escapeHtml(raw);

  // Inline code first (protect contents from bold/italic transforms)
  const codeTokens = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const idx = codeTokens.length;
    codeTokens.push(`<code>${code}</code>`);
    return `\u0000CODE${idx}\u0000`;
  });

  // Safe links [label](https://... or #/...)
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const cleanUrl = url.replace(/&amp;/g, '&');
    if (/^(https?:\/\/|#|\/(?!\/))/i.test(cleanUrl)) {
      const external = /^https?:\/\//i.test(cleanUrl)
        ? ' target="_blank" rel="noopener noreferrer"'
        : '';
      return `<a href="${escapeHtml(cleanUrl)}"${external}>${label}</a>`;
    }
    return label;
  });

  // Bold + italic
  text = text.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?;:]|$)/g, '$1<em>$2</em>');

  // Restore inline code
  text = text.replace(/\u0000CODE(\d+)\u0000/g, (_, idx) => codeTokens[Number(idx)] || '');
  return text;
}

export function renderMarkdown(md) {
  if (!md || !md.trim()) return '';
  const lines = String(md).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let inCode = false;
  let codeLang = '';
  let codeLines = [];
  let listType = null; // 'ul' | 'ol'

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      if (!inCode) {
        closeList();
        inCode = true;
        codeLang = fence[1] || '';
        codeLines = [];
      } else {
        out.push(
          `<pre class="md-pre"><code${codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : ''}>${escapeHtml(
            codeLines.join('\n')
          )}</code></pre>`
        );
        inCode = false;
        codeLang = '';
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(trimmed)) {
      closeList();
      out.push('<hr class="md-hr" />');
      continue;
    }

    // Headings
    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      out.push(`<h${level} class="md-h${level}">${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      closeList();
      out.push(`<blockquote class="md-quote">${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    // Unordered list (including indented sub-items flattened cleanly)
    const ul = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ul) {
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        out.push('<ul class="md-list">');
      }
      const nested = ul[1].length >= 2 ? ' class="md-nested"' : '';
      out.push(`<li${nested}>${renderInline(ul[2])}</li>`);
      continue;
    }

    // Ordered list
    const ol = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ol) {
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        out.push('<ol class="md-list">');
      }
      out.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    // Paragraph
    closeList();
    out.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  if (inCode) {
    out.push(`<pre class="md-pre"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return `<div class="md-prose">${out.join('\n')}</div>`;
}

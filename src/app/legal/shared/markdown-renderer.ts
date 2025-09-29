export function renderMarkdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let inList = false;
  let inBlockquote = false;

  const closeList = () => {
    if (inList) {
      html.push('</ul>');
      inList = false;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      html.push('</blockquote>');
      inBlockquote = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed.length) {
      closeList();
      closeBlockquote();
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      closeList();
      closeBlockquote();
      html.push('<hr />');
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 6);
      const content = renderInline(headingMatch[2].trim());
      closeList();
      closeBlockquote();
      html.push(`<h${level}>${content}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('- ')) {
      if (!inList) {
        closeBlockquote();
        html.push('<ul>');
        inList = true;
      }
      const item = renderInline(trimmed.slice(2).trim());
      html.push(`<li>${item}</li>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      if (!inBlockquote) {
        closeList();
        html.push('<blockquote>');
        inBlockquote = true;
      }
      const quoteLine = renderInline(trimmed.slice(2).trim());
      html.push(`<p>${quoteLine}</p>`);
      continue;
    }

    closeList();
    closeBlockquote();
    html.push(`<p>${renderInline(trimmed)}</p>`);
  }

  closeList();
  closeBlockquote();

  return html.join('\n');
}

function renderInline(text: string): string {
  const tokens: string[] = [];
  const pattern =
    /(\*\*.+?\*\*|\*.+?\*|`.+?`|\[[^\]]+?\]\([^\s)]+?\)|<https?:\/\/[^>]+?>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const preceding = text.slice(lastIndex, match.index);
    if (preceding) {
      tokens.push(escapeHtml(preceding));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      const inner = token.slice(2, -2);
      tokens.push(`<strong>${renderInline(inner)}</strong>`);
    } else if (token.startsWith('*')) {
      const inner = token.slice(1, -1);
      tokens.push(`<em>${renderInline(inner)}</em>`);
    } else if (token.startsWith('`')) {
      const inner = token.slice(1, -1);
      tokens.push(`<code>${escapeHtml(inner)}</code>`);
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+?)\]\(([^)]+?)\)$/);
      if (linkMatch) {
        const label = renderInline(linkMatch[1]);
        const href = escapeAttribute(linkMatch[2]);
        tokens.push(
          `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
        );
      } else {
        tokens.push(escapeHtml(token));
      }
    } else if (token.startsWith('<')) {
      const url = token.slice(1, -1);
      const href = escapeAttribute(url);
      const label = escapeHtml(url);
      tokens.push(
        `<a href="${href}" target="_blank" rel="noopener">${label}</a>`
      );
    }

    lastIndex = pattern.lastIndex;
  }

  const rest = text.slice(lastIndex);
  if (rest) {
    tokens.push(escapeHtml(rest));
  }

  return tokens.join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

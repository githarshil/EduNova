import React, { useMemo, useRef, useEffect } from 'react';
import { marked } from 'marked';
import katex from 'katex';
import DOMPurify from 'dompurify';
import 'katex/dist/katex.min.css';

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true
});

/**
 * Robust Educational Markdown & KaTeX LaTeX Formatter
 * - Pre-extracts block ($$, \[\]) and inline ($, \(\)) math formulas before Markdown parsing
 * - Renders equations cleanly with KaTeX (MathML + HTML)
 * - Converts Markdown headings, bold, lists, quotes, tables, and code blocks
 * - Embeds responsive horizontal overflow containers for tables
 * - Provides interactive 1-click 'Copy' button for code blocks
 * - Sanitizes rendered HTML via DOMPurify to prevent XSS while allowing KaTeX tags
 */
export default function FormattedMessage({ content, isUser = false, compact = false }) {
  const containerRef = useRef(null);

  const htmlContent = useMemo(() => {
    if (!content) return '';
    if (isUser) {
      // Escape or standard minimal rendering for user questions
      return DOMPurify.sanitize(marked.parse(content, { breaks: true }));
    }

    let text = content;
    const mathBlocks = [];
    const mathInlines = [];

    // 1. Extract Display Math: $$ ... $$ and \[ ... \]
    text = text.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      const idx = mathBlocks.length;
      mathBlocks.push(math.trim());
      return `%%MATH_BLOCK_${idx}%%`;
    });

    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, math) => {
      const idx = mathBlocks.length;
      mathBlocks.push(math.trim());
      return `%%MATH_BLOCK_${idx}%%`;
    });

    // 2. Extract Inline Math: \( ... \) and $ ... $
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (match, math) => {
      const idx = mathInlines.length;
      mathInlines.push(math.trim());
      return `%%MATH_INLINE_${idx}%%`;
    });

    // Match $...$ but avoid plain dollar currency ($50, $100.00)
    text = text.replace(/(?<!\\)\$([^\$\n\r]+?)(?<!\\)\$/g, (match, math) => {
      const trimmed = math.trim();
      // If it looks like plain currency ($50, $100.00), don't treat as math
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return match;
      }
      const idx = mathInlines.length;
      mathInlines.push(trimmed);
      return `%%MATH_INLINE_${idx}%%`;
    });

    // 3. Parse Markdown with marked
    let parsedHtml = marked.parse(text);

    // 4. Unwrap paragraph tags around standalone display math blocks and style tables
    parsedHtml = parsedHtml.replace(/<p>\s*(%%MATH_BLOCK_\d+%%)\s*<\/p>/g, '$1');
    parsedHtml = parsedHtml.replace(
      /<table>/g,
      '<div class="stem-table-wrapper"><table class="stem-table">'
    );
    parsedHtml = parsedHtml.replace(/<\/table>/g, '</table></div>');

    // 5. Add copy button to code blocks
    parsedHtml = parsedHtml.replace(
      /<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g,
      (match, codeAttrs, codeContent) => {
        const rawCode = codeContent
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        const encoded = encodeURIComponent(rawCode);
        return `
          <div class="stem-code-container">
            <div class="stem-code-header">
              <span class="stem-code-lang">Code</span>
              <button type="button" class="code-copy-btn" data-code="${encoded}" title="Copy code">
                Copy
              </button>
            </div>
            <pre><code${codeAttrs}>${codeContent}</code></pre>
          </div>
        `;
      }
    );

    // 6. Replace Math Placeholders with KaTeX rendered output
    parsedHtml = parsedHtml.replace(/%%MATH_BLOCK_(\d+)%%/g, (match, idx) => {
      const math = mathBlocks[parseInt(idx, 10)];
      if (!math) return '';
      try {
        const rendered = katex.renderToString(math, {
          displayMode: true,
          throwOnError: false,
          strict: false,
          output: 'htmlAndMathml'
        });
        return `<div class="katex-display-wrapper">${rendered}</div>`;
      } catch (err) {
        return `<pre class="katex-error">${math}</pre>`;
      }
    });

    parsedHtml = parsedHtml.replace(/%%MATH_INLINE_(\d+)%%/g, (match, idx) => {
      const math = mathInlines[parseInt(idx, 10)];
      if (!math) return '';
      try {
        const rendered = katex.renderToString(math, {
          displayMode: false,
          throwOnError: false,
          strict: false,
          output: 'htmlAndMathml'
        });
        return `<span class="katex-inline-wrapper">${rendered}</span>`;
      } catch (err) {
        return `<code class="katex-error">${math}</code>`;
      }
    });

    // 7. Sanitize with DOMPurify allowing KaTeX, MathML, SVG (for roots/brackets), and custom tags/attributes
    const cleanHtml = DOMPurify.sanitize(parsedHtml, {
      ADD_TAGS: [
        'math', 'annotation', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
        'mfrac', 'mover', 'munder', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd',
        'mspace', 'mtext', 'mpadded', 'mphantom', 'mstyle', 'button', 'span', 'div',
        'svg', 'path', 'line', 'rect', 'g'
      ],
      ADD_ATTR: [
        'aria-hidden', 'encoding', 'display', 'xmlns', 'viewBox', 'width', 'height',
        'preserveAspectRatio', 'x1', 'y1', 'x2', 'y2', 'x', 'y', 'd', 'fill',
        'stroke', 'stroke-width', 'data-code', 'class', 'style', 'target', 'title'
      ]
    });

    return cleanHtml;
  }, [content, isUser]);

  // Attach click handler for code copy buttons
  useEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll('.code-copy-btn');
    buttons.forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const code = btn.getAttribute('data-code');
        if (code) {
          navigator.clipboard.writeText(decodeURIComponent(code)).then(() => {
            btn.innerText = 'Copied! ✓';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.innerText = 'Copy';
              btn.classList.remove('copied');
            }, 2000);
          });
        }
      };
    });
  }, [htmlContent]);

  return (
    <div
      ref={containerRef}
      className={`stem-formatted-message ${isUser ? 'is-user' : 'is-assistant'}${compact ? ' is-compact' : ''}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}


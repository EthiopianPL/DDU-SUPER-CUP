import DOMPurify from 'dompurify';

/**
 * Strips all HTML tags and decodes entities, providing a clean plain-text excerpt for cards.
 */
export function stripHtml(html?: string | null): string {
  if (!html) return '';
  return unescapeIfEscapedHtml(html)
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if the string contains escaped HTML tags (e.g. &lt;h1&gt; or &lt;p&gt;).
 * Handles both single-escaped and double-escaped entities so that HTML stored as
 * entities is rendered as genuine HTML elements.
 */
export function unescapeIfEscapedHtml(str?: string | null): string {
  if (!str) return '';
  let text = str;

  // Handle double-escaped HTML (e.g., &amp;lt;h1&amp;gt;)
  if (/&amp;lt;\/?(h[1-6]|p|div|ul|ol|li|blockquote|strong|b|em|i|u|a|br|hr|img)\b/i.test(text)) {
    text = text
      .replace(/&amp;lt;/g, '&lt;')
      .replace(/&amp;gt;/g, '&gt;')
      .replace(/&amp;quot;/g, '&quot;')
      .replace(/&amp;#39;/g, '&#39;')
      .replace(/&amp;amp;/g, '&amp;');
  }

  // Handle single-escaped HTML (e.g., &lt;h1&gt; or &lt;p&gt;)
  if (/&lt;\/?(h[1-6]|p|div|ul|ol|li|blockquote|strong|b|em|i|u|a|br|hr|img)\b/i.test(text)) {
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
  }

  return text;
}

/**
 * Checks whether the given string already contains HTML tags.
 */
export function isHtmlContent(content?: string | null): boolean {
  if (!content) return false;
  return /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Converts legacy raw text into structured HTML paragraphs and line breaks.
 * Ensures existing articles without HTML tags don't collapse into a single line.
 */
export function formatLegacyTextToHtml(text?: string | null): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  return trimmed
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => {
      const formatted = paragraph
        .trim()
        .replace(/\r?\n/g, '<br/>');
      return `<p>${formatted}</p>`;
    })
    .join('');
}

/**
 * Sanitizes rich text HTML using DOMPurify with strict allowed tags and attributes.
 * Prevents XSS attacks and malformed markup while preserving headings, lists, links,
 * formatting, alignment, blockquotes, and responsive images.
 */
export function sanitizeRichText(html?: string | null): string {
  if (!html) return '';

  // In browser environments where DOMPurify has a DOM window
  if (typeof window !== 'undefined' && typeof DOMPurify.sanitize === 'function') {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'b',
        'em',
        'i',
        'u',
        's',
        'strike',
        'ul',
        'ol',
        'li',
        'a',
        'blockquote',
        'hr',
        'br',
        'span',
        'code',
        'pre',
        'img',
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'style', 'class', 'src', 'alt', 'width', 'height', 'loading'],
      ALLOWED_CSS_PROPERTIES: ['text-align'],
      ADD_ATTR: ['target', 'rel'],
    });
  }

  // Fallback for non-browser/SSR/test environments
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

/**
 * Prepares any news body (raw HTML, escaped HTML entities, or legacy plain text)
 * for safe, styled rendering.
 */
export function getRenderableNewsBody(body?: string | null): string {
  if (!body) return '';
  // 1. Unescape if the text has escaped tags (e.g. &lt;h1&gt;)
  const unescaped = unescapeIfEscapedHtml(body);
  // 2. Format legacy plain text to <p> tags if not HTML
  const rawHtml = isHtmlContent(unescaped) ? unescaped : formatLegacyTextToHtml(unescaped);
  // 3. Sanitize HTML
  return sanitizeRichText(rawHtml);
}

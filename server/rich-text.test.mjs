import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isHtmlContent,
  unescapeIfEscapedHtml,
  stripHtml,
  formatLegacyTextToHtml,
  sanitizeRichText,
  getRenderableNewsBody,
} from '../src/app/utils/richText.ts';

test('isHtmlContent detects HTML tags and ignores plain text', () => {
  assert.equal(isHtmlContent(''), false);
  assert.equal(isHtmlContent('Just plain words without any tags.'), false);
  assert.equal(isHtmlContent('First line\nSecond line'), false);
  assert.equal(isHtmlContent('<h1>DDU Super Cup 2026: The Road</h1><p>Article content...</p>'), true);
  assert.equal(isHtmlContent('<p>Rich paragraph</p>'), true);
  assert.equal(isHtmlContent('<h2>Announcement</h2>'), true);
  assert.equal(isHtmlContent('Here is <strong>bold</strong> text'), true);
  assert.equal(isHtmlContent('<ul><li>item</li></ul>'), true);
});

test('unescapeIfEscapedHtml decodes escaped HTML tags while leaving plain text intact', () => {
  const escaped = '&lt;h1&gt;DDU Super Cup 2026: The Road to the Championship Begins&lt;/h1&gt;&lt;p&gt;Article content...&lt;/p&gt;';
  const decoded = unescapeIfEscapedHtml(escaped);
  assert.equal(decoded, '<h1>DDU Super Cup 2026: The Road to the Championship Begins</h1><p>Article content...</p>');

  const doubleEscaped = '&amp;lt;h1&amp;gt;DDU Super Cup 2026&amp;lt;/h1&amp;gt;';
  assert.equal(unescapeIfEscapedHtml(doubleEscaped), '<h1>DDU Super Cup 2026</h1>');

  const wrapped = '<p>&lt;h1&gt;Heading&lt;/h1&gt;</p>';
  assert.equal(unescapeIfEscapedHtml(wrapped), '<p><h1>Heading</h1></p>');

  const math = '5 < 10 and 10 > 5';
  assert.equal(unescapeIfEscapedHtml(math), '5 < 10 and 10 > 5');
});

test('stripHtml removes all HTML tags and leaves clean text for excerpts', () => {
  const html = '<p>The excitement is building as departments prepare to compete in the <strong>DDU Super Cup</strong>.</p>';
  assert.equal(
    stripHtml(html),
    'The excitement is building as departments prepare to compete in the DDU Super Cup.'
  );

  const escaped = '&lt;p&gt;Summary with &lt;strong&gt;bold&lt;/strong&gt; text&lt;/p&gt;';
  assert.equal(stripHtml(escaped), 'Summary with bold text');
});

test('formatLegacyTextToHtml converts multiline plain text to paragraphs', () => {
  const legacy = 'First paragraph.\n\nSecond paragraph with line 1\nand line 2.';
  const html = formatLegacyTextToHtml(legacy);
  assert.equal(
    html,
    '<p>First paragraph.</p><p>Second paragraph with line 1<br/>and line 2.</p>'
  );
});

test('sanitizeRichText preserves rich formatting and strips malicious tags', () => {
  const raw = `
    <h2>Matchday 2 Fixtures</h2>
    <p style="text-align: center">Live game <strong>SWE vs IT</strong>.</p>
    <ul>
      <li>SWE - 3 pts</li>
      <li>IT - 1 pt</li>
    </ul>
    <blockquote>Important note</blockquote>
    <a href="https://example.com" target="_blank">Full schedule</a>
    <script>alert('xss')</script>
    <img src="https://example.com/photo.jpg" alt="Match" onerror="alert(1)" />
  `;

  const clean = sanitizeRichText(raw);
  assert.ok(clean.includes('<h2>Matchday 2 Fixtures</h2>'));
  assert.ok(clean.includes('style="text-align: center"'));
  assert.ok(clean.includes('<strong>SWE vs IT</strong>'));
  assert.ok(clean.includes('<ul>'));
  assert.ok(clean.includes('<li>SWE - 3 pts</li>'));
  assert.ok(clean.includes('<blockquote>Important note</blockquote>'));
  assert.ok(clean.includes('href="https://example.com"'));
  assert.ok(clean.includes('src="https://example.com/photo.jpg"'));
  assert.ok(!clean.includes('<script>'));
  assert.ok(!clean.includes('onerror'));
});

test('getRenderableNewsBody renders raw HTML, escaped HTML entities, and legacy text', () => {
  // 1. Raw HTML from editor
  const rawHtml = '<h1>DDU Super Cup 2026: The Road to the Championship Begins</h1><p>Article content...</p>';
  const rendered1 = getRenderableNewsBody(rawHtml);
  assert.equal(rendered1, '<h1>DDU Super Cup 2026: The Road to the Championship Begins</h1><p>Article content...</p>');

  // 2. Escaped HTML entities
  const escapedHtml = '&lt;h1&gt;DDU Super Cup 2026: The Road to the Championship Begins&lt;/h1&gt;&lt;p&gt;Article content...&lt;/p&gt;';
  const rendered2 = getRenderableNewsBody(escapedHtml);
  assert.equal(rendered2, '<h1>DDU Super Cup 2026: The Road to the Championship Begins</h1><p>Article content...</p>');

  // 3. Legacy plain text
  const legacy = 'Legacy news article.\n\nLine two.';
  const rendered3 = getRenderableNewsBody(legacy);
  assert.equal(rendered3, '<p>Legacy news article.</p><p>Line two.</p>');
});



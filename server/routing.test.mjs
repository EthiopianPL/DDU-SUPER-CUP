import assert from 'node:assert/strict';
import test from 'node:test';
import { normalize } from '../api/[[...path]].mjs';

test('joins the photo path Vercel can only deliver as one segment', () => {
  const request = { url: '/api/media?__ddu=teams/computer-science&v=1793049574842' };
  normalize(request);
  assert.equal(request.url, '/api/media/teams/computer-science?v=1793049574842');
});

test('reads the extra path from the query object when the url omits it', () => {
  const request = { url: '/api/media', query: { __ddu: 'players/computer-science-abrham-w', v: '12' } };
  normalize(request);
  const url = new URL(request.url, 'http://127.0.0.1');
  assert.equal(url.pathname, '/api/media/players/computer-science-abrham-w');
  assert.equal(url.searchParams.get('v'), '12');
  assert.equal(url.searchParams.get('__ddu'), null);
});

test('leaves a one-segment api route untouched', () => {
  const request = { url: '/api/snapshot?x=1' };
  normalize(request);
  assert.equal(request.url, '/api/snapshot?x=1');
});

test('does not stitch a parent-directory path', () => {
  const request = { url: '/api/media?__ddu=../secret' };
  normalize(request);
  assert.equal(request.url, '/api/media?__ddu=../secret');
});

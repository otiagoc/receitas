import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSvg } from '../src/svg.js';

const ok = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" onload="alert(1)"><defs><filter id="w"><feTurbulence baseFrequency="0.02"/><feDisplacementMap in="SourceGraphic" scale="2"/></filter></defs><rect width="400" height="300" fill="#fbf6ec"/><script>alert(1)</script><foreignObject><div/></foreignObject><image href="http://x/y.png"/><g filter="url(#w)"><path d="M10 10 L50 50" stroke="#3b2f2a" stroke-width="2.5" onclick="x()"/><path d="M1 1" fill="url(http://evil)" stroke="#3b2f2a" class="ink"/><use href="http://evil#a"/><use href="#a"/></g><text x="10" y="20">Mexer</text></svg>';

test('sanitizes forbidden content', () => {
  const s = sanitizeSvg('```xml\n' + ok + '\n```');
  assert.ok(s);
  for (const bad of ['script', 'foreignObject', '<image', 'onload', 'onclick', 'http://x', 'evil', 'width="400" height="300" viewBox']) assert.ok(!s.includes(bad), bad + ' in ' + s);
  assert.ok(s.includes('class="ink"'));
  assert.ok(s.includes('filter="url(#w)"'));
  assert.ok(!s.includes('href') && !s.includes('<use'));
  assert.ok(s.includes('stroke="currentColor"') && !s.includes('stroke="#3b2f2a"'));
  assert.ok(s.includes('color="#3b2f2a"'));
  assert.ok(s.includes('fill="#fbf6ec"'));
  assert.ok(s.startsWith('<svg'));
  assert.ok(s.includes('viewBox="0 0 400 300"'));
  assert.ok(s.includes('<rect width="400" height="300"'));
});

test('rejects malformed', () => {
  assert.equal(sanitizeSvg('<svg><path d="M1 1"></svg>'), null);
  assert.equal(sanitizeSvg('no svg here'), null);
});

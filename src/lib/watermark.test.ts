import test from 'node:test';
import assert from 'node:assert/strict';

import { buildWatermarkLayout } from './watermark';

test('adds the public account prefix to top and bottom watermark text without changing the center text', () => {
  const layout = buildWatermarkLayout({
    width: 1000,
    height: 1600,
    userText: '子游小馆',
  });

  assert.equal(
    layout[0].text,
    'ORIGINAL WORK © · 公众号·子游小馆 · ALL RIGHTS RESERVED'
  );
  assert.equal(layout[1].text, '子游小馆');
  assert.equal(
    layout[2].text,
    'ORIGINAL CREATION BY 公众号·子游小馆  //  DIGITAL ARCHIVE'
  );
});

test('does not duplicate the public account prefix and makes the center watermark more visible by default', () => {
  const layout = buildWatermarkLayout({
    width: 1000,
    height: 1600,
    userText: '公众号·子游小馆',
  });

  assert.equal(
    layout[0].text,
    'ORIGINAL WORK © · 公众号·子游小馆 · ALL RIGHTS RESERVED'
  );
  assert.equal(
    layout[2].text,
    'ORIGINAL CREATION BY 公众号·子游小馆  //  DIGITAL ARCHIVE'
  );
  assert.equal(layout[1].opacity, 0.22);
});

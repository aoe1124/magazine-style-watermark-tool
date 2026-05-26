import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';

import App from './App';

test('renders default watermark text presets below the custom text input', () => {
  const html = renderToStaticMarkup(<App />);

  for (const label of ['养心美学馆', '子游小馆', '秘藏智慧', 'AI之门', '智驾大白话']) {
    assert.match(html, new RegExp(label));
  }

  assert.match(html, /管理选项/);
});

test('renders a top-right clear images button', () => {
  const html = renderToStaticMarkup(<App />);

  assert.match(html, /清空图片/);
});

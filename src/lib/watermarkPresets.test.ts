import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addWatermarkPreset,
  DEFAULT_WATERMARK_PRESETS,
  removeWatermarkPreset,
  sanitizeWatermarkPresets,
  updateWatermarkPreset,
} from './watermarkPresets';

test('sanitizes stored presets while preserving a deliberately empty list', () => {
  assert.deepEqual(sanitizeWatermarkPresets(undefined), DEFAULT_WATERMARK_PRESETS);
  assert.deepEqual(sanitizeWatermarkPresets(['  A  ', 'A', '', 12, 'B']), ['A', 'B']);
  assert.deepEqual(sanitizeWatermarkPresets([]), []);
});

test('adds, updates, and removes watermark presets without blank or duplicate entries', () => {
  assert.deepEqual(addWatermarkPreset(['A'], '  B  '), ['A', 'B']);
  assert.deepEqual(addWatermarkPreset(['A'], 'A'), ['A']);
  assert.deepEqual(addWatermarkPreset(['A'], '   '), ['A']);

  assert.deepEqual(updateWatermarkPreset(['A', 'B'], 1, ' C '), ['A', 'C']);
  assert.deepEqual(updateWatermarkPreset(['A', 'B'], 1, 'A'), ['A', 'B']);
  assert.deepEqual(updateWatermarkPreset(['A', 'B'], 3, 'C'), ['A', 'B']);

  assert.deepEqual(removeWatermarkPreset(['A', 'B', 'C'], 1), ['A', 'C']);
});

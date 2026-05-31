export const WATERMARK_PRESETS_STORAGE_KEY = 'watermark_text_presets';
export const WATERMARK_PRESETS_VERSION_STORAGE_KEY = 'watermark_text_presets_version';
export const WATERMARK_PRESETS_CURRENT_VERSION = 2;

export const DEFAULT_WATERMARK_PRESETS = [
  '养心美学馆',
  '子游小馆',
  '秘藏智慧',
  'AI之门',
  '智驾大白话',
  '暮色与松香',
];

export const normalizeWatermarkPreset = (value: string) => value.trim();

export const sanitizeWatermarkPresets = (value: unknown) => {
  if (!Array.isArray(value)) return DEFAULT_WATERMARK_PRESETS;

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map(normalizeWatermarkPreset)
        .filter(Boolean)
    )
  );
};

export const addWatermarkPreset = (presets: string[], value: string) => {
  const normalized = normalizeWatermarkPreset(value);
  if (!normalized || presets.includes(normalized)) return presets;
  return [...presets, normalized];
};

export const updateWatermarkPreset = (
  presets: string[],
  index: number,
  value: string
) => {
  const normalized = normalizeWatermarkPreset(value);
  if (!normalized || index < 0 || index >= presets.length) return presets;

  const duplicateIndex = presets.findIndex((preset) => preset === normalized);
  if (duplicateIndex !== -1 && duplicateIndex !== index) return presets;

  return presets.map((preset, presetIndex) =>
    presetIndex === index ? normalized : preset
  );
};

export const removeWatermarkPreset = (presets: string[], index: number) =>
  presets.filter((_, presetIndex) => presetIndex !== index);

const WATERMARK_PRESET_MIGRATIONS: Record<number, string[]> = {
  2: ['暮色与松香'],
};

export const migrateWatermarkPresets = (
  value: unknown,
  fromVersion: number
) => {
  let migratedPresets = sanitizeWatermarkPresets(value);

  for (const version of Object.keys(WATERMARK_PRESET_MIGRATIONS).map(Number).sort((a, b) => a - b)) {
    if (fromVersion >= version || version > WATERMARK_PRESETS_CURRENT_VERSION) continue;

    for (const preset of WATERMARK_PRESET_MIGRATIONS[version]) {
      migratedPresets = addWatermarkPreset(migratedPresets, preset);
    }
  }

  return migratedPresets;
};

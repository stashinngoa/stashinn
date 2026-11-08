// Converts between the stored scoring JSON and the form's text fields. updateScoringRules
// still receives JSON, and keys the form doesn't list are kept as they were.

/** Numeric entries as field text, with `knownKeys` always present (blank when unset). */
export function toFields(stored: Record<string, unknown> | null | undefined, knownKeys: string[]) {
  const fields: Record<string, string> = Object.fromEntries(knownKeys.map(k => [k, '']));
  Object.entries(stored || {}).forEach(([k, v]) => {
    if (typeof v === 'number') fields[k] = String(v);
  });
  return fields;
}

/** Field text back to stored JSON. A blank field leaves its key out; non-numeric entries are untouched. */
export function fromFields(fields: Record<string, string>, stored: Record<string, unknown> | null | undefined) {
  const result: Record<string, unknown> = {};
  Object.entries(stored || {}).forEach(([k, v]) => {
    if (typeof v !== 'number') result[k] = v;
  });
  Object.entries(fields).forEach(([k, v]) => {
    if (v.trim() !== '' && Number.isFinite(Number(v))) result[k] = Number(v);
  });
  return result;
}

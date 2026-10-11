import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { escapeHtml, validateNotes } from '../src/data.ts';

test('identified notes require evidence; malformed imports are rejected', () => {
  const note = { name: 'Library', status: 'identified', evidence: '', updatedAt: '2026-10-08' };
  assert.throws(() => validateNotes({ 'way/123': note }), /evidence/);
  assert.throws(() => validateNotes({ 'unknown/123': { ...note, evidence: 'Photo checked' } }), /reference/);
  assert.throws(() => validateNotes({ 'way/123': { ...note, status: 'confirmed', evidence: 'Photo' } }), /Invalid/);
  assert.throws(() => validateNotes([]));
  const incoming = { 'ms/0123456789abcdef': { ...note, evidence: 'Photo checked' } };
  assert.deepEqual(validateNotes(incoming), incoming);
});

test('external names and evidence cannot inject markup into detail panels', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml("Oye & 'Ikole'"), 'Oye &amp; &#39;Ikole&#39;');
});

test('prepared outlines have unique IDs, complete rings and explicit provenance', () => {
  const data = JSON.parse(readFileSync(new URL('../public/data/oye.geojson', import.meta.url), 'utf8'));
  const ids = new Set<string>();
  let buildings = 0, supplement = 0;
  for (const f of data.features) {
    assert.ok(!ids.has(f.id), `Duplicate ${f.id}`); ids.add(f.id);
    assert.ok(['osm', 'microsoft'].includes(f.properties.source));
    assert.ok(f.properties.center.every(Number.isFinite));
    assert.equal(f.properties.identityStatus, 'unverified');
    if (f.properties.kind === 'building') {
      buildings++;
      if (f.properties.source === 'microsoft') supplement++;
      assert.equal(f.geometry.type, 'Polygon');
      for (const ring of f.geometry.coordinates) { assert.ok(ring.length >= 4); assert.deepEqual(ring[0], ring.at(-1)); }
      assert.ok(f.properties.area > 0);
    }
  }
  assert.equal(buildings, data.metadata.summary.building);
  assert.equal(supplement, data.metadata.summary.microsoftAdded);
});

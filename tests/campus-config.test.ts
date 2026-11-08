import test from 'node:test';
import assert from 'node:assert/strict';
import { readNotes, persistNotes } from '../src/data.ts';
import { courierScoreKey, reviewNotesKey } from '../src/campuses/storage.ts';

test('campus notes are isolated while existing Oye notes and courier records keep their keys', () => {
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  }});
  try {
    const note = (name: string) => ({'way/123': {name, status: 'candidate' as const, evidence: '', updatedAt: '2026-11-06'}});
    // Simulate a note saved by the released app, then reuse the same feature ID on another campus.
    values.set('fuoye-oye-review-v1', JSON.stringify(note('Oye building')));
    assert.deepEqual(readNotes(), note('Oye building'));
    persistNotes(note('Ikole building'), 'ikole');
    assert.deepEqual(readNotes('ikole'), note('Ikole building'));
    assert.deepEqual(readNotes('oye'), note('Oye building'));
    assert.equal(courierScoreKey('oye'), 'fuoye-courier-best');
    assert.notEqual(courierScoreKey('ikole'), courierScoreKey('oye'));
    assert.notEqual(reviewNotesKey('ikole'), reviewNotesKey('oye'));
    values.set(reviewNotesKey('ikole'), '{broken');
    assert.deepEqual(readNotes('ikole'), {});
    assert.deepEqual(readNotes(), note('Oye building'));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

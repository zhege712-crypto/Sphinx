import test from 'node:test';
import assert from 'node:assert/strict';
import { publicReaderEntry } from '../shared/public-reader.mjs';
import { parseRoute } from '../shared/navigation.mjs';
import { PROJECT_DOCUMENT_ID, CONTRIBUTORS_DOCUMENT_ID } from '../shared/project.mjs';

const article = { id: 'a7100000-0000-4000-8000-000000000001', kind: 'document', title: 'Guide' };
const second = { id: 'a7100000-0000-4000-8000-000000000002', kind: 'document', title: 'Next' };
const term = { id: 'a7100000-0000-4000-8000-000000000003', kind: 'reference', title: 'Term', valhalla: { enabled: true, blocks: [] } };
const catalog = [{ id: PROJECT_DOCUMENT_ID, kind: 'document' }, { id: CONTRIBUTORS_DOCUMENT_ID, kind: 'document' }, article, second, term];

test('reading follows the URL immediately using the last successful catalog during a refresh failure', () => {
  assert.equal(publicReaderEntry(catalog, parseRoute(`#/read/${article.id}`)), article);
  assert.equal(publicReaderEntry(catalog, parseRoute(`#/read/${second.id}`)), second);
  assert.equal(publicReaderEntry([], parseRoute(`#/read/${second.id}`)), null);
  // A retry only needs to update the catalog; no separate selected-ID state is required.
  assert.equal(publicReaderEntry(catalog, parseRoute(`#/read/${second.id}`)), second);
});

test('missing or removed public entries never fall back to an unrelated article', () => {
  assert.equal(publicReaderEntry([article], parseRoute(`#/read/${second.id}`)), null);
  assert.equal(publicReaderEntry(catalog, parseRoute(`#/read/${term.id}`)), null);
  assert.equal(publicReaderEntry(catalog, parseRoute(`#/reference/${article.id}`)), null);
});

test('guide home excludes about documents and dictionary indexes keep no selected article', () => {
  assert.equal(publicReaderEntry(catalog, parseRoute('#/read')), article);
  for (const route of ['#/reference', '#/valhalla', '#/about']) assert.equal(publicReaderEntry(catalog, parseRoute(route)), null);
  assert.equal(publicReaderEntry(catalog, parseRoute(`#/read/${CONTRIBUTORS_DOCUMENT_ID}`))?.id, CONTRIBUTORS_DOCUMENT_ID);
});

test('reference and Valhalla remain separate and unavailable reviews stay unavailable', () => {
  assert.equal(publicReaderEntry(catalog, parseRoute(`#/reference/${term.id}`)), term);
  assert.equal(publicReaderEntry(catalog, parseRoute(`#/valhalla/${term.id}`)), term);
  assert.equal(publicReaderEntry([{ ...term, valhalla: { enabled: false } }], parseRoute(`#/valhalla/${term.id}`)), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const script = readFileSync(new URL('../public/theme-init.js', import.meta.url), 'utf8');
function boot(saved, hour, blocked = false) {
  const root = { dataset: {}, style: {} };
  runInNewContext(script, {
    document: { documentElement: root },
    localStorage: { getItem: key => { if (blocked) throw Error('blocked'); return saved[key]; } },
    Date: class { getHours() { return hour; } },
  });
  return root;
}
test('explicit reader choice survives reload and takes priority over time and legacy preference', () => {
  assert.equal(boot({'sphinx:theme':'light',theme:'dark'},22).dataset.theme,'light');
  assert.equal(boot({'sphinx:theme':'eye-care'},9).dataset.theme,'eye-care');
  assert.equal(boot({'sphinx:theme':'dark'},9).style.colorScheme,'dark');
  assert.equal(boot({theme:'eye-care'},22).dataset.theme,'eye-care');
});
test('invalid or unavailable storage still opens a readable theme at day and night boundaries', () => {
  for (const hour of [6,12,18]) assert.equal(boot({'sphinx:theme':'invalid'},hour).dataset.theme,'light');
  for (const hour of [0,5,19,23]) assert.equal(boot({},hour,true).dataset.theme,'dark');
});

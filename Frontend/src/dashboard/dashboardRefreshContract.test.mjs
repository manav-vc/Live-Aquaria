import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const dashboardDir = path.dirname(fileURLToPath(import.meta.url));

function readDashboardFile(fileName) {
  return fs.readFileSync(path.join(dashboardDir, fileName), 'utf8');
}

test('dashboard refreshes aquarium and index after a fish is identified', () => {
  const dashboard = readDashboardFile('dashboard.jsx');
  const identifier = readDashboardFile('FishIdentifier.jsx');
  const background = readDashboardFile('FishBackground.jsx');
  const indexPanel = readDashboardFile('FishIndexPanel.jsx');

  assert.match(dashboard, /useState\(\s*0\s*\)/, 'Dashboard should keep a refresh signal counter.');
  assert.match(dashboard, /onFishIdentified=\{handleFishIdentified\}/, 'Dashboard should pass the identify callback to FishIdentifier.');
  assert.match(dashboard, /<FishBackground\s+refreshSignal=\{fishRefreshSignal\}/, 'Dashboard should pass the refresh signal to FishBackground.');
  assert.match(dashboard, /<FishIndexPanel\s+refreshSignal=\{fishRefreshSignal\}/, 'Dashboard should pass the refresh signal to FishIndexPanel.');

  assert.match(identifier, /onFishIdentified/, 'FishIdentifier should accept an identify callback.');
  assert.match(identifier, /onFishIdentified\(\s*data\s*\)/, 'FishIdentifier should call the callback after a successful identify response.');

  assert.match(background, /function FishBackground\(\{\s*refreshSignal(?:\s*=\s*0)?\s*\}\)/, 'FishBackground should accept the refresh signal prop.');
  assert.match(background, /\[user,\s*refreshSignal\]/, 'FishBackground should refetch when the refresh signal changes.');

  assert.match(indexPanel, /function FishIndexPanel\s*\(\{\s*onCatchSelect(?:\s*=\s*\(\)\s*=>\s*\{\})?,\s*refreshSignal(?:\s*=\s*0)?\s*\}\)/, 'FishIndexPanel should accept the refresh signal prop.');
  assert.match(indexPanel, /\[user,\s*refreshSignal\]/, 'FishIndexPanel should refetch when the refresh signal changes.');
});

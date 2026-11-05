import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({ entryPoints: ['src/utils/engineVersions.ts'], bundle: true, write: false, format: 'esm' });
const { compareEngineVersions, getProjectEngineVersion } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
assert.deepEqual(['5.9.2', '4.27.2', '5.10.0', '5.7.3', '5.7.12'].sort((a, b) => compareEngineVersions(b, a)),
    ['5.10.0', '5.9.2', '5.7.12', '5.7.3', '4.27.2']);
assert.equal(compareEngineVersions('5.7', '5.7.0'), 0);
assert.equal(getProjectEngineVersion({ version: '5.7' }), '5.7');
assert.equal(getProjectEngineVersion({ version: '{source-guid}', engineVersion: '5.7.1' }), '5.7');
assert.equal(getProjectEngineVersion({ version: '{unregistered-guid}' }), 'unknown');
assert.equal(getProjectEngineVersion({ version: 'Unknown' }), 'unknown');
assert.equal(getProjectEngineVersion({ version: 'UE_5.10.2' }), '5.10');
console.log('PASS: numeric version ordering, patch grouping and unresolved source associations.');

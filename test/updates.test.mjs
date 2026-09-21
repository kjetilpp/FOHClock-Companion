/* eslint-disable n/no-unsupported-features/node-builtins */
import assert from 'node:assert/strict'
import test from 'node:test'
// eslint-disable-next-line n/no-unpublished-import
import { isNewerVersion } from '../dist/updates.js'

test('isNewerVersion compares semantic versions numerically', () => {
	assert.equal(isNewerVersion('0.2.0', '0.2.1'), true)
	assert.equal(isNewerVersion('0.2.0', 'v0.2.1'), true)
	assert.equal(isNewerVersion('0.2.9', '0.10.0'), true)
	assert.equal(isNewerVersion('0.2.0', '0.2.0'), false)
	assert.equal(isNewerVersion('0.2.1', '0.2.0'), false)
	assert.equal(isNewerVersion('0.2.0', 'not-a-version'), false)
})

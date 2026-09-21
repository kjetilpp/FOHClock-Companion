/* eslint-disable n/no-unsupported-features/node-builtins */
import assert from 'node:assert/strict'
import test from 'node:test'
import { Response } from 'undici'
// eslint-disable-next-line n/no-unpublished-import
import { FohClockApiError, parseTimerStatus, requestTimer, splitDisplaySeconds } from '../dist/api.js'

const sampleStatus = {
	display: '00:05:00',
	displaySeconds: 300,
	durationSeconds: 300,
	elapsedSeconds: 0,
	mode: 'countdown',
	overtime: false,
	requiresToken: true,
	running: false,
	serverTime: '2026-09-20T12:00:00Z',
	state: 'ready',
	valueSeconds: 300,
}

test('parseTimerStatus accepts a complete FOHClock response', () => {
	assert.deepEqual(parseTimerStatus(sampleStatus), sampleStatus)
})

test('parseTimerStatus rejects an incomplete response', () => {
	assert.throws(() => parseTimerStatus({ display: '00:00:00' }), FohClockApiError)
})

test('requestTimer sends bearer token and JSON body', async () => {
	const fetchMock = async (url, options) => {
		assert.equal(url, 'http://127.0.0.1:8080/api/v1/timer/duration')
		assert.equal(options.method, 'POST')
		assert.equal(options.headers.Authorization, 'Bearer secret')
		assert.deepEqual(JSON.parse(options.body), { seconds: 60 })
		return new Response(JSON.stringify(sampleStatus), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		})
	}

	const result = await requestTimer(
		{ host: '127.0.0.1', port: 8080, token: 'secret', pollInterval: 250 },
		'/api/v1/timer/duration',
		'POST',
		{ seconds: 60 },
		fetchMock,
	)
	assert.deepEqual(result, sampleStatus)
})

test('splitDisplaySeconds pads each unit to two digits', () => {
	assert.deepEqual(splitDisplaySeconds(3898), { hours: '01', minutes: '04', seconds: '58' })
})

test('splitDisplaySeconds keeps the sign on every unit during overtime', () => {
	assert.deepEqual(splitDisplaySeconds(-7), { hours: '-00', minutes: '-00', seconds: '-07' })
})

test('requestTimer accepts the complete address shown by FOHClock', async () => {
	const fetchMock = async (url) => {
		assert.equal(url, 'http://192.168.1.50:9090/api/v1/timer')
		return new Response(JSON.stringify(sampleStatus), { status: 200 })
	}

	await requestTimer(
		{ host: 'http://192.168.1.50:9090/', port: 8080, token: '', pollInterval: 250 },
		'/api/v1/timer',
		'GET',
		undefined,
		fetchMock,
	)
})

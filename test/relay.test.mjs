/* eslint-disable n/no-unsupported-features/node-builtins */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { WebSocketServer } from 'ws'
// eslint-disable-next-line n/no-unpublished-import
import { RelayConnection } from '../dist/relay.js'

const status = {
	display: '00:05:00',
	displaySeconds: 300,
	durationSeconds: 300,
	elapsedSeconds: 0,
	mode: 'countdown',
	overtime: false,
	running: false,
	serverTime: new Date().toISOString(),
	state: 'ready',
	valueSeconds: 300,
}

test('relay authenticates, receives status, and resolves commands', async () => {
	const server = createServer()
	const wss = new WebSocketServer({ server })
	await new Promise((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', resolve)
	})
	const address = server.address()
	assert.ok(address && typeof address === 'object')

	let ready
	const readyPromise = new Promise((resolve) => {
		ready = resolve
	})
	let pushedStatus
	const statusPromise = new Promise((resolve) => {
		pushedStatus = resolve
	})
	let serverSocket
	wss.once('connection', (socket) => {
		serverSocket = socket
		socket.once('message', (raw) => {
			const hello = JSON.parse(raw.toString())
			assert.equal(hello.deviceId, 'ABCDE-FGHIJ')
			assert.equal(hello.clientId, 'test-client')
			socket.send(JSON.stringify({ type: 'companion.ready', online: true }))
			socket.send(JSON.stringify({ type: 'timer.status', status }))
		})
	})

	const connection = new RelayConnection(
		'ABCDE-FGHIJ',
		'Test Companion',
		{ clientId: 'test-client', clientSecret: 'a'.repeat(32) },
		{
			onConnecting: () => {},
			onPending: () => {},
			onReady: (online) => ready(online),
			onStatus: (value) => pushedStatus(value),
			onError: (message) => assert.fail(message),
		},
		`ws://127.0.0.1:${address.port}`,
	)

	try {
		connection.connect()
		assert.equal(await readyPromise, true)
		assert.deepEqual(await statusPromise, { ...status, requiresToken: false })
		const commandPromise = connection.sendCommand('/api/v1/timer/start')
		const command = await new Promise((resolve) =>
			serverSocket.once('message', (raw) => resolve(JSON.parse(raw.toString()))),
		)
		assert.equal(command.path, '/api/v1/timer/start')
		serverSocket.send(
			JSON.stringify({
				type: 'timer.result',
				requestId: command.requestId,
				ok: true,
				status: { ...status, running: true, state: 'running' },
			}),
		)
		assert.equal((await commandPromise).running, true)
	} finally {
		connection.destroy()
		for (const socket of wss.clients) socket.terminate()
		await new Promise((resolve) => wss.close(resolve))
		await new Promise((resolve) => server.close(resolve))
	}
})

test('does not reset reconnect backoff until companion.ready, and surfaces unknown_device', async () => {
	const server = createServer()
	const wss = new WebSocketServer({ server })
	await new Promise((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', resolve)
	})
	const address = server.address()
	assert.ok(address && typeof address === 'object')

	const attemptTimes = []
	wss.on('connection', (socket) => {
		attemptTimes.push(Date.now())
		socket.once('message', () => {
			socket.close(1008, 'unknown_device')
		})
	})

	const errors = []
	const connection = new RelayConnection(
		'ABCDE-FGHIJ',
		'Test Companion',
		{ clientId: 'test-client', clientSecret: 'a'.repeat(32) },
		{
			onConnecting: () => {},
			onPending: () => {},
			onReady: () => assert.fail('should never reach companion.ready with an unknown device'),
			onStatus: () => {},
			onError: (message) => errors.push(message),
		},
		`ws://127.0.0.1:${address.port}`,
	)

	try {
		connection.connect()
		// Wait for three connection attempts. With the pre-fix behaviour (backoff reset on socket
		// open, before authentication succeeds) every gap is ~1s; fixed, the gaps grow: ~1s, ~2s.
		await new Promise((resolve) => {
			const check = setInterval(() => {
				if (attemptTimes.length >= 3) {
					clearInterval(check)
					resolve()
				}
			}, 50)
		})
		const gap1 = attemptTimes[1] - attemptTimes[0]
		const gap2 = attemptTimes[2] - attemptTimes[1]
		assert.ok(gap2 > gap1 * 1.5, `expected growing backoff, got gap1=${gap1}ms gap2=${gap2}ms`)
		assert.ok(
			errors.some((message) => message.includes('device ID not found')),
			`expected an unknown_device error, got: ${JSON.stringify(errors)}`,
		)
	} finally {
		connection.destroy()
		for (const socket of wss.clients) socket.terminate()
		await new Promise((resolve) => wss.close(resolve))
		await new Promise((resolve) => server.close(resolve))
	}
})

function waitForLength(array, length, ms = 2000) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`Timed out waiting for ${length} readyState(s), got ${JSON.stringify(array)}`)),
			ms,
		)
		const check = setInterval(() => {
			if (array.length >= length) {
				clearInterval(check)
				clearTimeout(timer)
				resolve()
			}
		}, 20)
	})
}

test('device.online updates readiness the same way companion.ready does', async () => {
	const server = createServer()
	const wss = new WebSocketServer({ server })
	await new Promise((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', resolve)
	})
	const address = server.address()
	assert.ok(address && typeof address === 'object')

	let serverSocket
	wss.once('connection', (socket) => {
		serverSocket = socket
		socket.once('message', () => {
			socket.send(JSON.stringify({ type: 'companion.ready', online: true }))
		})
	})

	const readyStates = []
	const connection = new RelayConnection(
		'ABCDE-FGHIJ',
		'Test Companion',
		{ clientId: 'test-client', clientSecret: 'a'.repeat(32) },
		{
			onConnecting: () => {},
			onPending: () => {},
			onReady: (online) => readyStates.push(online),
			onStatus: () => {},
			onError: (message) => assert.fail(message),
		},
		`ws://127.0.0.1:${address.port}`,
	)

	try {
		connection.connect()
		await waitForLength(readyStates, 1)
		assert.deepEqual(readyStates, [true])

		// The device disconnects from the relay independently of this companion connection — the relay
		// pushes an explicit device.online:false instead of the module only finding out via a stale
		// buffered timer.status message.
		serverSocket.send(JSON.stringify({ type: 'device.online', online: false }))
		await waitForLength(readyStates, 2)
		assert.deepEqual(readyStates, [true, false])

		serverSocket.send(JSON.stringify({ type: 'device.online', online: true }))
		await waitForLength(readyStates, 3)
		assert.deepEqual(readyStates, [true, false, true])
	} finally {
		connection.destroy()
		for (const socket of wss.clients) socket.terminate()
		await new Promise((resolve) => wss.close(resolve))
		await new Promise((resolve) => server.close(resolve))
	}
})

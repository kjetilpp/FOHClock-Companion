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

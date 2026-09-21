import { randomUUID } from 'node:crypto'
import { WebSocket, type RawData } from 'ws'
import { FohClockApiError, parseTimerStatus, type TimerStatus } from './api.js'

export type RelaySecrets = {
	clientId: string
	clientSecret: string
}

type RelayCallbacks = {
	onConnecting: () => void
	onPending: () => void
	onReady: (online: boolean) => void
	onStatus: (status: TimerStatus) => void
	onError: (message: string) => void
}

type PendingCommand = {
	resolve: (status: TimerStatus) => void
	reject: (error: Error) => void
	timer: NodeJS.Timeout
}

export class RelayConnection {
	private socket?: WebSocket
	private reconnectTimer?: NodeJS.Timeout
	private reconnectDelay = 1000
	private destroyed = false
	private readonly commands = new Map<string, PendingCommand>()

	constructor(
		private deviceId: string,
		private readonly label: string,
		private readonly secrets: RelaySecrets,
		private readonly callbacks: RelayCallbacks,
		private readonly url = 'wss://foh.r1soft.no/api/v1/companion/socket',
	) {}

	connect(): void {
		if (this.destroyed || this.socket) return
		this.callbacks.onConnecting()
		const socket = new WebSocket(this.url, { handshakeTimeout: 5000, maxPayload: 65_536 })
		this.socket = socket
		socket.on('open', () => {
			socket.send(
				JSON.stringify({
					type: 'companion.hello',
					protocolVersion: 1,
					deviceId: this.deviceId,
					clientId: this.secrets.clientId,
					clientSecret: this.secrets.clientSecret,
					label: this.label,
				}),
			)
		})
		socket.on('message', (raw) => this.handleMessage(this.messageText(raw)))
		socket.on('error', (error) => this.callbacks.onError(`Relay connection failed: ${error.message}`))
		socket.on('close', (_code, reason) => {
			if (this.socket === socket) this.socket = undefined
			for (const [requestId, command] of this.commands) {
				clearTimeout(command.timer)
				command.reject(new FohClockApiError(`Relay disconnected: ${reason.toString() || 'connection closed'}`))
				this.commands.delete(requestId)
			}
			const closeReason = reason.toString()
			const message = RelayConnection.configErrorMessages[closeReason]
			if (message) this.callbacks.onError(message)
			this.scheduleReconnect()
		})
	}

	/** Close reasons the relay sends back when the configured device ID or credentials are wrong — not a
	 *  transient network problem, so retrying won't help until the Companion configuration is corrected. */
	private static readonly configErrorMessages: Record<string, string> = {
		unknown_device: 'FOHClock device ID not found. Check the device ID in the configuration.',
		authentication_required: 'FOHClock Relay rejected the connection handshake. Check the configuration.',
	}

	updateDeviceId(deviceId: string): void {
		if (this.deviceId === deviceId) return
		this.deviceId = deviceId
		this.socket?.close(4000, 'configuration changed')
	}

	destroy(): void {
		this.destroyed = true
		if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
		this.socket?.close(1000, 'module stopped')
		this.socket = undefined
	}

	async sendCommand(path: string, body?: Record<string, unknown>): Promise<TimerStatus> {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN)
			throw new FohClockApiError('FOHClock Relay is not connected')
		const requestId = randomUUID()
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.commands.delete(requestId)
				reject(new FohClockApiError('FOHClock command timed out'))
			}, 12_000)
			this.commands.set(requestId, { resolve, reject, timer })
			this.socket!.send(JSON.stringify({ type: 'timer.command', requestId, path, ...(body ? { body } : {}) }))
		})
	}

	private messageText(raw: RawData): string {
		return Array.isArray(raw) ? Buffer.concat(raw).toString('utf8') : Buffer.from(raw).toString('utf8')
	}

	private handleMessage(raw: string): void {
		let message: Record<string, unknown>
		try {
			message = JSON.parse(raw) as Record<string, unknown>
		} catch {
			return
		}
		switch (message.type) {
			case 'pairing.pending':
				this.callbacks.onPending()
				break
			case 'pairing.approved':
				this.socket?.close(4000, 'pairing approved')
				break
			case 'pairing.denied':
				this.callbacks.onError('Pairing was denied in FOHClock')
				break
			case 'companion.ready':
				this.reconnectDelay = 1000
				this.callbacks.onReady(message.online === true)
				break
			case 'device.online':
				// Pushed whenever the FOHClock device itself connects or disconnects from the relay,
				// independent of this Companion connection. Reuses onReady's status handling since the
				// meaning is identical: is the device currently reachable or not.
				this.callbacks.onReady(message.online === true)
				break
			case 'timer.status':
				try {
					this.callbacks.onStatus(parseTimerStatus(message.status))
				} catch (error) {
					this.callbacks.onError(String(error))
				}
				break
			case 'timer.result': {
				if (typeof message.requestId !== 'string') break
				const command = this.commands.get(message.requestId)
				if (!command) break
				clearTimeout(command.timer)
				this.commands.delete(message.requestId)
				if (message.ok === true && message.status) {
					try {
						command.resolve(parseTimerStatus(message.status))
					} catch (error) {
						command.reject(error as Error)
					}
				} else
					command.reject(
						new FohClockApiError(typeof message.error === 'string' ? message.error : 'FOHClock command failed'),
					)
				break
			}
		}
	}

	private scheduleReconnect(): void {
		if (this.destroyed || this.reconnectTimer) return
		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = undefined
			this.connect()
		}, this.reconnectDelay)
		this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000)
	}
}

import { fetch, type Response } from 'undici'
import type { ModuleConfig } from './config.js'

export type TimerMode = 'clock' | 'stopwatch' | 'countdown'
export type TimerState = 'clock' | 'ready' | 'running' | 'paused'

export type TimerStatus = {
	display: string
	displaySeconds: number
	durationSeconds: number
	elapsedSeconds: number
	mode: TimerMode
	overtime: boolean
	requiresToken: boolean
	running: boolean
	serverTime: string
	state: TimerState
	valueSeconds: number
}

export class FohClockApiError extends Error {
	constructor(
		message: string,
		readonly status?: number,
	) {
		super(message)
		this.name = 'FohClockApiError'
	}
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value)
}

export function parseTimerStatus(value: unknown): TimerStatus {
	if (typeof value !== 'object' || value === null) {
		throw new FohClockApiError('FOHClock returned an invalid status response')
	}

	const status = value as Record<string, unknown>
	const mode = status.mode
	const state = status.state
	const validMode = mode === 'clock' || mode === 'stopwatch' || mode === 'countdown'
	const validState = state === 'clock' || state === 'ready' || state === 'running' || state === 'paused'
	if (
		typeof status.display !== 'string' ||
		!isNumber(status.displaySeconds) ||
		!isNumber(status.durationSeconds) ||
		!isNumber(status.elapsedSeconds) ||
		!validMode ||
		typeof status.overtime !== 'boolean' ||
		typeof status.running !== 'boolean' ||
		typeof status.serverTime !== 'string' ||
		!validState ||
		!isNumber(status.valueSeconds)
	) {
		throw new FohClockApiError('FOHClock returned an incomplete status response')
	}

	return {
		display: status.display,
		displaySeconds: status.displaySeconds,
		durationSeconds: status.durationSeconds,
		elapsedSeconds: status.elapsedSeconds,
		mode,
		overtime: status.overtime,
		requiresToken: status.requiresToken === true,
		running: status.running,
		serverTime: status.serverTime,
		state,
		valueSeconds: status.valueSeconds,
	}
}

export type TimeParts = {
	hours: string
	minutes: string
	seconds: string
}

export function splitDisplaySeconds(totalSeconds: number): TimeParts {
	const sign = totalSeconds < 0 ? '-' : ''
	const absSeconds = Math.trunc(Math.abs(totalSeconds))
	const pad = (value: number) => String(value).padStart(2, '0')
	return {
		hours: sign + pad(Math.floor(absSeconds / 3600)),
		minutes: sign + pad(Math.floor(absSeconds / 60) % 60),
		seconds: sign + pad(absSeconds % 60),
	}
}

function baseUrl(config: ModuleConfig): string {
	const rawAddress = config.host.trim().replace(/\/+$/, '')
	const url = new URL(/^https?:\/\//i.test(rawAddress) ? rawAddress : `http://${rawAddress}`)
	if (!url.port) url.port = String(config.port)
	return url.origin
}

export async function requestTimer(
	config: ModuleConfig,
	path = '/api/v1/timer',
	method: 'GET' | 'POST' = 'GET',
	body?: Record<string, unknown>,
	fetchImplementation: typeof fetch = fetch,
): Promise<TimerStatus> {
	if (!config.host.trim()) throw new FohClockApiError('FOHClock IP address is not configured')

	const headers: Record<string, string> = { Accept: 'application/json' }
	if (config.token.trim()) headers.Authorization = `Bearer ${config.token.trim()}`
	if (body !== undefined) headers['Content-Type'] = 'application/json'

	let response: Response
	try {
		response = await fetchImplementation(`${baseUrl(config)}${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: AbortSignal.timeout(2000),
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		throw new FohClockApiError(`Cannot reach FOHClock: ${message}`)
	}

	if (!response.ok) {
		let detail = ''
		try {
			const payload = (await response.json()) as { error?: unknown }
			if (typeof payload.error === 'string') detail = `: ${payload.error}`
		} catch {
			// The status code still provides a useful error if the response is not JSON.
		}
		throw new FohClockApiError(`FOHClock HTTP ${response.status}${detail}`, response.status)
	}

	return parseTimerStatus(await response.json())
}

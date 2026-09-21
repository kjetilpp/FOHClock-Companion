import { InstanceBase, InstanceStatus, runEntrypoint, type SomeCompanionConfigField } from '@companion-module/base'
import { FohClockApiError, requestTimer, splitDisplaySeconds, type TimerStatus } from './api.js'
import { updateActions } from './actions.js'
import { getConfigFields, type ModuleConfig } from './config.js'
import { updateFeedbacks } from './feedbacks.js'
import { updatePresets } from './presets.js'
import { UpgradeScripts } from './upgrades.js'
import { defaultVariableValues, updateVariableDefinitions } from './variables.js'
import { RelayConnection, type RelaySecrets } from './relay.js'
import { checkForUpdate, readInstalledVersion } from './updates.js'
import { randomBytes, randomUUID } from 'node:crypto'

const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

export default class ModuleInstance extends InstanceBase<ModuleConfig, RelaySecrets> {
	config!: ModuleConfig
	timerStatus?: TimerStatus
	private pollTimer?: NodeJS.Timeout
	private pollActive = false
	private lastError = ''
	private relay?: RelayConnection
	private updateCheckTimer?: NodeJS.Timeout

	async init(config: ModuleConfig, _isFirstInit: boolean, secrets: RelaySecrets): Promise<void> {
		this.config = this.withDefaults(config)
		const relaySecrets = this.withSecretDefaults(secrets)
		if (!secrets?.clientId || !secrets?.clientSecret) this.saveConfig(undefined, relaySecrets)
		updateActions(this)
		updateFeedbacks(this)
		updatePresets(this)
		updateVariableDefinitions(this)
		this.setVariableValues(defaultVariableValues)
		this.restartConnection(relaySecrets)
		this.scheduleUpdateChecks()
	}

	async destroy(): Promise<void> {
		this.stopPolling()
		this.relay?.destroy()
		if (this.updateCheckTimer) clearInterval(this.updateCheckTimer)
	}

	private scheduleUpdateChecks(): void {
		void this.runUpdateCheck()
		if (this.updateCheckTimer) clearInterval(this.updateCheckTimer)
		this.updateCheckTimer = setInterval(() => void this.runUpdateCheck(), UPDATE_CHECK_INTERVAL_MS)
	}

	private async runUpdateCheck(): Promise<void> {
		try {
			const result = await checkForUpdate(readInstalledVersion())
			this.setVariableValues({ update_available: result.updateAvailable, latest_version: result.latestVersion })
			if (result.updateAvailable) {
				this.log(
					'warn',
					`FOHClock Companion update available: ${result.latestVersion} (installed: ${result.currentVersion}). Download: ${result.releaseUrl}`,
				)
			}
		} catch (error) {
			this.log('debug', `Update check failed: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async configUpdated(config: ModuleConfig, secrets: RelaySecrets): Promise<void> {
		this.config = this.withDefaults(config)
		const relaySecrets = this.withSecretDefaults(secrets)
		if (!secrets?.clientId || !secrets?.clientSecret) this.saveConfig(undefined, relaySecrets)
		this.restartConnection(relaySecrets)
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return getConfigFields()
	}

	async sendCommand(path: string, body?: Record<string, unknown>): Promise<void> {
		try {
			this.applyStatus(
				this.config.connectionMode === 'relay'
					? await this.relay!.sendCommand(path, body)
					: await requestTimer(this.config, path, 'POST', body),
			)
		} catch (error) {
			this.handleError(error)
			throw error
		}
	}

	private withDefaults(config: ModuleConfig): ModuleConfig {
		return {
			connectionMode: config.connectionMode === 'local' ? 'local' : 'relay',
			deviceId: typeof config.deviceId === 'string' ? config.deviceId : '',
			label: typeof config.label === 'string' ? config.label : '',
			host: typeof config.host === 'string' ? config.host : '',
			port: typeof config.port === 'number' ? config.port : 8080,
			token: typeof config.token === 'string' ? config.token : '',
			pollInterval: typeof config.pollInterval === 'number' ? config.pollInterval : 250,
		}
	}

	private withSecretDefaults(secrets?: Partial<RelaySecrets>): RelaySecrets {
		return {
			clientId: secrets?.clientId || randomUUID(),
			clientSecret: secrets?.clientSecret || randomBytes(32).toString('base64url'),
		}
	}

	private restartConnection(secrets: RelaySecrets): void {
		this.stopPolling()
		this.relay?.destroy()
		this.relay = undefined
		if (this.config.connectionMode === 'local') return this.restartPolling()
		if (!this.config.deviceId.trim()) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter the FOHClock device ID')
			return
		}
		this.relay = new RelayConnection(
			this.config.deviceId,
			this.config.label.trim() || this.label || 'Bitfocus Companion',
			secrets,
			{
				onConnecting: () => this.updateStatus(InstanceStatus.Connecting, 'Connecting to FOHClock Relay'),
				onPending: () => this.updateStatus(InstanceStatus.Connecting, 'Approve this Companion in FOHClock'),
				onReady: (online) =>
					this.updateStatus(
						online ? InstanceStatus.Ok : InstanceStatus.ConnectionFailure,
						online ? undefined : 'FOHClock device is offline',
					),
				onStatus: (status) => this.applyStatus(status),
				onError: (message) => this.updateStatus(InstanceStatus.ConnectionFailure, message),
			},
		)
		this.relay.connect()
	}

	private restartPolling(): void {
		this.stopPolling()
		if (!this.config.host.trim()) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter the iPhone/iPad IP address')
			return
		}

		this.updateStatus(InstanceStatus.Connecting)
		void this.poll()
		this.pollTimer = setInterval(() => void this.poll(), Math.max(100, this.config.pollInterval))
	}

	private stopPolling(): void {
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.pollTimer = undefined
	}

	private async poll(): Promise<void> {
		if (this.pollActive) return
		this.pollActive = true
		try {
			this.applyStatus(await requestTimer(this.config))
		} catch (error) {
			this.handleError(error)
		} finally {
			this.pollActive = false
		}
	}

	private applyStatus(status: TimerStatus): void {
		this.timerStatus = status
		this.lastError = ''
		this.updateStatus(InstanceStatus.Ok)
		const parts = splitDisplaySeconds(status.displaySeconds)
		this.setVariableValues({
			display: status.display,
			display_seconds: status.displaySeconds,
			duration_seconds: status.durationSeconds,
			elapsed_seconds: status.elapsedSeconds,
			hours: parts.hours,
			minutes: parts.minutes,
			mode: status.mode,
			overtime: status.overtime,
			running: status.running,
			seconds: parts.seconds,
			server_time: status.serverTime,
			state: status.state,
			value_seconds: status.valueSeconds,
		})
		this.checkFeedbacks('mode', 'state', 'running', 'overtime')
	}

	private handleError(error: unknown): void {
		const apiError = error instanceof FohClockApiError ? error : new FohClockApiError(String(error))
		const message = apiError.message
		if (message !== this.lastError) {
			this.log('warn', message)
			this.lastError = message
		}
		if (apiError.status === 401) {
			this.updateStatus(InstanceStatus.AuthenticationFailure, 'Check the FOHClock access code')
		} else if (this.config.connectionMode === 'local' && !this.config.host.trim()) {
			this.updateStatus(InstanceStatus.BadConfig, 'Enter the iPhone/iPad IP address')
		} else {
			this.updateStatus(InstanceStatus.ConnectionFailure, message)
		}
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)

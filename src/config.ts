import type { SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	[key: string]: string | number
	connectionMode: 'relay' | 'local'
	deviceId: string
	label: string
	host: string
	port: number
	token: string
	pollInterval: number
}

export function getConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'FOHClock',
			value: 'Relay mode only needs the device ID shown in FOHClock. The first connection must be approved in the app.',
		},
		{
			type: 'dropdown',
			id: 'connectionMode',
			label: 'Connection mode',
			width: 6,
			default: 'relay',
			choices: [
				{ id: 'relay', label: 'FOHClock Relay (recommended)' },
				{ id: 'local', label: 'Local HTTP fallback' },
			],
		},
		{
			type: 'textinput',
			id: 'deviceId',
			label: 'Device ID',
			width: 6,
			default: '',
			isVisible: (options) => options.connectionMode !== 'local',
		},
		{
			type: 'textinput',
			id: 'label',
			label: 'Nickname shown in FOHClock (optional)',
			width: 6,
			default: '',
			isVisible: (options) => options.connectionMode !== 'local',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'iPhone/iPad IP address or hostname',
			width: 8,
			default: '',
			isVisible: (options) => options.connectionMode === 'local',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			min: 1,
			max: 65535,
			default: 8080,
			isVisible: (options) => options.connectionMode === 'local',
		},
		{
			type: 'textinput',
			id: 'token',
			label: 'Access code (leave blank if disabled in the app)',
			width: 8,
			default: '',
			isVisible: (options) => options.connectionMode === 'local',
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Status poll interval (ms)',
			width: 4,
			min: 100,
			max: 5000,
			default: 250,
			isVisible: (options) => options.connectionMode === 'local',
		},
	]
}

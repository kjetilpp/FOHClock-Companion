import type ModuleInstance from './main.js'

export type ActionsSchema = {
	set_mode: { options: { mode: string } }
	set_duration: { options: { hours: number; minutes: number; seconds: number } }
	set_value: { options: { seconds: number } }
	adjust_time: { options: { seconds: number } }
	transport: { options: { command: string } }
}

export function updateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		set_mode: {
			name: 'Set display mode',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: 'countdown',
					choices: [
						{ id: 'clock', label: 'Clock' },
						{ id: 'stopwatch', label: 'Stopwatch' },
						{ id: 'countdown', label: 'Countdown' },
					],
				},
			],
			callback: async (event) => {
				await self.sendCommand('/api/v1/timer/mode', { mode: event.options.mode })
			},
		},
		set_duration: {
			name: 'Set countdown duration',
			options: [
				{ id: 'hours', type: 'number', label: 'Hours', default: 0, min: 0, max: 23, step: 1 },
				{ id: 'minutes', type: 'number', label: 'Minutes', default: 5, min: 0, max: 59, step: 1 },
				{ id: 'seconds', type: 'number', label: 'Seconds', default: 0, min: 0, max: 59, step: 1 },
			],
			callback: async (event) => {
				const seconds =
					Number(event.options.hours ?? 0) * 3600 +
					Number(event.options.minutes ?? 0) * 60 +
					Number(event.options.seconds ?? 0)
				await self.sendCommand('/api/v1/timer/duration', { seconds })
			},
		},
		set_value: {
			name: 'Set current timer value',
			options: [
				{
					id: 'seconds',
					type: 'number',
					label: 'Value in seconds',
					default: 0,
					min: -359999,
					max: 359999,
					step: 1,
				},
			],
			callback: async (event) => {
				await self.sendCommand('/api/v1/timer/value', { seconds: Number(event.options.seconds ?? 0) })
			},
		},
		adjust_time: {
			name: 'Adjust active timer',
			options: [
				{
					id: 'seconds',
					type: 'number',
					label: 'Seconds to add (negative to subtract)',
					default: 60,
					min: -86399,
					max: 86399,
					step: 1,
				},
			],
			callback: async (event) => {
				await self.sendCommand('/api/v1/timer/adjust', { seconds: Number(event.options.seconds ?? 0) })
			},
		},
		transport: {
			name: 'Timer transport',
			options: [
				{
					id: 'command',
					type: 'dropdown',
					label: 'Command',
					default: 'start',
					choices: [
						{ id: 'start', label: 'Start / resume' },
						{ id: 'pause', label: 'Pause' },
						{ id: 'stop', label: 'Stop and reset' },
					],
				},
			],
			callback: async (event) => {
				const endpoint = event.options.command === 'stop' ? 'reset' : String(event.options.command ?? 'start')
				await self.sendCommand(`/api/v1/timer/${endpoint}`)
			},
		},
	})
}

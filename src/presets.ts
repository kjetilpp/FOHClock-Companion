import type { CompanionButtonPresetDefinition, CompanionPresetDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'

const white = 0xffffff
const black = 0x000000
const blue = 0x004c99
const green = 0x006b35
const amber = 0xb36b00
const red = 0x990000

function buttonStyle(text: string, bgcolor = black) {
	return { text, size: 'auto' as const, color: white, bgcolor, show_topbar: false }
}

export function updatePresets(self: ModuleInstance): void {
	const presets: CompanionPresetDefinitions = {
		live_display: {
			type: 'button',
			category: 'Live display',
			name: 'Live timer display',
			style: buttonStyle('$(this:display)'),
			steps: [],
			feedbacks: [
				{ feedbackId: 'running', options: {}, style: { bgcolor: green } },
				{ feedbackId: 'overtime', options: {}, style: { bgcolor: red } },
			],
		},
		live_display_hours: livePartPreset('Live hours display', '$(this:hours)'),
		live_display_minutes: livePartPreset('Live minutes display', '$(this:minutes)'),
		live_display_seconds: livePartPreset('Live seconds display', '$(this:seconds)'),
		mode_clock: modePreset('Clock', 'clock'),
		mode_stopwatch: modePreset('Stopwatch', 'stopwatch'),
		mode_countdown: modePreset('Countdown', 'countdown'),
		start: transportPreset('Start /\nResume', 'start', green, 'running'),
		pause: transportPreset('Pause', 'pause', amber, 'paused'),
		stop: transportPreset('Stop /\nReset', 'stop', red, 'ready'),
	}

	const durations: Array<[string, string, number, number, number]> = [
		['duration_10s', '10 sec', 0, 0, 10],
		['duration_30s', '30 sec', 0, 0, 30],
		['duration_1m', '1 min', 0, 1, 0],
		['duration_5m', '5 min', 0, 5, 0],
		['duration_10m', '10 min', 0, 10, 0],
		['duration_15m', '15 min', 0, 15, 0],
		['duration_30m', '30 min', 0, 30, 0],
		['duration_1h', '1 hour', 1, 0, 0],
	]
	for (const [id, label, hours, minutes, seconds] of durations) {
		presets[id] = {
			type: 'button',
			category: 'Countdown durations',
			name: `Countdown ${label}`,
			style: buttonStyle(label, blue),
			steps: [
				{
					down: [
						{ actionId: 'set_mode', options: { mode: 'countdown' } },
						{ actionId: 'set_duration', options: { hours, minutes, seconds } },
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	const adjustments: Array<[string, string, number]> = [
		['adjust_minus_5m', '−5 min', -300],
		['adjust_minus_1m', '−1 min', -60],
		['adjust_minus_10s', '−10 sec', -10],
		['adjust_plus_10s', '+10 sec', 10],
		['adjust_plus_1m', '+1 min', 60],
		['adjust_plus_5m', '+5 min', 300],
	]
	for (const [id, label, seconds] of adjustments) {
		presets[id] = {
			type: 'button',
			category: 'Adjust time',
			name: `Adjust ${label}`,
			style: buttonStyle(label, seconds < 0 ? red : green),
			steps: [{ down: [{ actionId: 'adjust_time', options: { seconds } }], up: [] }],
			feedbacks: [],
		}
	}

	self.setPresetDefinitions(presets)
}

function livePartPreset(name: string, text: string): CompanionButtonPresetDefinition {
	return {
		type: 'button',
		category: 'Live display',
		name,
		style: buttonStyle(text),
		steps: [],
		feedbacks: [
			{ feedbackId: 'running', options: {}, style: { bgcolor: green } },
			{ feedbackId: 'overtime', options: {}, style: { bgcolor: red } },
		],
	}
}

function modePreset(name: string, mode: string): CompanionButtonPresetDefinition {
	return {
		type: 'button',
		category: 'Modes',
		name: `${name} mode`,
		style: buttonStyle(name),
		steps: [{ down: [{ actionId: 'set_mode', options: { mode } }], up: [] }],
		feedbacks: [{ feedbackId: 'mode', options: { mode }, style: { bgcolor: blue } }],
	}
}

function transportPreset(
	label: string,
	command: string,
	bgcolor: number,
	state: string,
): CompanionButtonPresetDefinition {
	return {
		type: 'button',
		category: 'Transport',
		name: label.replace('\n', ' '),
		style: buttonStyle(label, bgcolor),
		steps: [{ down: [{ actionId: 'transport', options: { command } }], up: [] }],
		feedbacks: [{ feedbackId: 'state', options: { state }, style: { bgcolor, color: white } }],
	}
}

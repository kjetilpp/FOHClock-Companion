import type ModuleInstance from './main.js'

export type FeedbacksSchema = {
	mode: { type: 'boolean'; options: { mode: string } }
	state: { type: 'boolean'; options: { state: string } }
	running: { type: 'boolean'; options: Record<string, never> }
	overtime: { type: 'boolean'; options: Record<string, never> }
}

export function updateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		mode: {
			name: 'Display mode is active',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x0066cc, color: 0xffffff },
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
			callback: (feedback) => self.timerStatus?.mode === feedback.options.mode,
		},
		state: {
			name: 'Timer state is active',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x008c46, color: 0xffffff },
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'running',
					choices: [
						{ id: 'clock', label: 'Clock' },
						{ id: 'ready', label: 'Ready / reset' },
						{ id: 'running', label: 'Running' },
						{ id: 'paused', label: 'Paused' },
					],
				},
			],
			callback: (feedback) => self.timerStatus?.state === feedback.options.state,
		},
		running: {
			name: 'Timer is running',
			type: 'boolean',
			defaultStyle: { bgcolor: 0x008c46, color: 0xffffff },
			options: [],
			callback: () => self.timerStatus?.running === true,
		},
		overtime: {
			name: 'Countdown is in overtime',
			type: 'boolean',
			defaultStyle: { bgcolor: 0xcc0000, color: 0xffffff },
			options: [],
			callback: () => self.timerStatus?.overtime === true,
		},
	})
}

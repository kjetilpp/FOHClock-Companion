import type ModuleInstance from './main.js'

export type VariablesSchema = {
	display: string
	display_seconds: number
	duration_seconds: number
	elapsed_seconds: number
	hours: string
	minutes: string
	mode: string
	overtime: boolean
	running: boolean
	seconds: string
	server_time: string
	state: string
	value_seconds: number
	update_available: boolean
	latest_version: string
}

export const defaultVariableValues: Pick<
	VariablesSchema,
	'display' | 'hours' | 'minutes' | 'seconds' | 'update_available' | 'latest_version'
> = {
	display: 'HH:MM:SS',
	hours: 'HH',
	minutes: 'MM',
	seconds: 'SS',
	update_available: false,
	latest_version: '',
}

export function updateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions([
		{ variableId: 'display', name: 'Displayed time' },
		{ variableId: 'display_seconds', name: 'Displayed time in seconds' },
		{ variableId: 'duration_seconds', name: 'Countdown duration in seconds' },
		{ variableId: 'elapsed_seconds', name: 'Elapsed time in seconds' },
		{ variableId: 'hours', name: 'Displayed hours (HH)' },
		{ variableId: 'minutes', name: 'Displayed minutes (MM)' },
		{ variableId: 'mode', name: 'Mode (clock, stopwatch or countdown)' },
		{ variableId: 'overtime', name: 'Countdown is in overtime' },
		{ variableId: 'running', name: 'Timer is running' },
		{ variableId: 'seconds', name: 'Displayed seconds (SS)' },
		{ variableId: 'server_time', name: 'FOHClock server time' },
		{ variableId: 'state', name: 'Timer state' },
		{ variableId: 'value_seconds', name: 'Current timer value in seconds' },
		{ variableId: 'update_available', name: 'A newer module version is available' },
		{ variableId: 'latest_version', name: 'Latest module version on GitHub' },
	])
}

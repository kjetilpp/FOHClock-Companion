import { fetch } from 'undici'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const RELEASES_URL = 'https://api.github.com/repos/kjetilpp/FOHClock-Companion/releases/latest'

export type UpdateCheckResult = {
	updateAvailable: boolean
	currentVersion: string
	latestVersion: string
	releaseUrl: string
}

function parseVersion(value: string): [number, number, number] | undefined {
	const match = /(\d+)\.(\d+)\.(\d+)/.exec(value.trim())
	if (!match) return undefined
	return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function isNewerVersion(current: string, candidate: string): boolean {
	const a = parseVersion(current)
	const b = parseVersion(candidate)
	if (!a || !b) return false
	for (let index = 0; index < 3; index += 1) {
		if (b[index] > a[index]) return true
		if (b[index] < a[index]) return false
	}
	return false
}

export function readInstalledVersion(): string {
	// Packaged install: companion/manifest.json sits next to main.js.
	// Unpackaged dev build: dist/ and companion/ are siblings.
	const candidates = [
		join(__dirname, 'companion', 'manifest.json'),
		join(__dirname, '..', 'companion', 'manifest.json'),
	]
	for (const manifestPath of candidates) {
		try {
			const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { version?: unknown }
			if (typeof manifest.version === 'string') return manifest.version
		} catch {
			continue
		}
	}
	return '0.0.0'
}

export async function checkForUpdate(currentVersion: string): Promise<UpdateCheckResult> {
	const response = await fetch(RELEASES_URL, {
		headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'fohclock-companion-module' },
	})
	if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`)
	const release = (await response.json()) as { tag_name?: unknown; html_url?: unknown }
	const latestVersion = typeof release.tag_name === 'string' ? release.tag_name : undefined
	if (!latestVersion) throw new Error('Release response is missing tag_name')
	return {
		updateAvailable: isNewerVersion(currentVersion, latestVersion),
		currentVersion,
		latestVersion,
		releaseUrl:
			typeof release.html_url === 'string'
				? release.html_url
				: 'https://github.com/kjetilpp/FOHClock-Companion/releases/latest',
	}
}

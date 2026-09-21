import type {
	CompanionStaticUpgradeProps,
	CompanionStaticUpgradeResult,
	CompanionStaticUpgradeScript,
	CompanionUpgradeContext,
} from '@companion-module/base'
import type { ModuleConfig } from './config.js'
import type { RelaySecrets } from './relay.js'

function upgradeLegacyConnection(
	_context: CompanionUpgradeContext<ModuleConfig>,
	props: CompanionStaticUpgradeProps<ModuleConfig, RelaySecrets>,
): CompanionStaticUpgradeResult<ModuleConfig, RelaySecrets> {
	if (!props.config || props.config.connectionMode) {
		return { updatedConfig: null, updatedSecrets: null, updatedActions: [], updatedFeedbacks: [] }
	}
	return {
		updatedConfig: {
			...props.config,
			connectionMode: props.config.host?.trim() ? 'local' : 'relay',
			deviceId: '',
		},
		updatedSecrets: null,
		updatedActions: [],
		updatedFeedbacks: [],
	}
}

export const UpgradeScripts: CompanionStaticUpgradeScript<ModuleConfig, RelaySecrets>[] = [upgradeLegacyConnection]

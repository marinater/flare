<script lang="ts">
	import type { GuildInfo } from '../user-types'
	export let guildInfo: GuildInfo
	export let selected: boolean
	export let onclick: () => void

	$: guildAbbreviation = guildInfo.name
		.split(' ')
		.map(x => (x ? x[0] : ''))
		.join('')
</script>

<style>
	.root {
		position: relative;
		height: 48px;
		width: 48px;
		display: flex;
		justify-content: center;
		align-items: center;
		border-radius: 50%;
		background-color: var(--vscode-sideBar-dropBackground);
		transition: 0.25s ease-out;
		overflow: hidden;
		margin-bottom: 8px;
		cursor: pointer;
	}

	.selected,
	.root:hover {
		border-radius: 30%;
	}

	.name-text {
		position: absolute;
		font-size: 20px;
		line-height: 20px;
		vertical-align: middle;
	}

	.guild-image {
		height: 100%;
		width: 100%;
		display: inline-block;
	}

	.notification-dot {
		background-color: var(--vscode-minimap-errorHighlight);
		border-radius: 50%;
		position: absolute;
		left: 0;
		top: calc(50% - 6px);
		transform: translate(-50%, 0%);
		height: 12px;
		width: 12px;
	}
</style>

<div class="root {selected ? 'selected' : ''}" on:click={onclick}>
	{#if guildInfo.icon}
		<img class="guild-image" alt={`icon for ${guildInfo.name}`} src={guildInfo.icon} />
	{:else}<span class="name-text"> {guildAbbreviation} </span>{/if}
	{#if guildInfo.unread > 0}
		<div class="notification-dot" />
	{/if}
</div>

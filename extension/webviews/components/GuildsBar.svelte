<script lang="ts">
	import type { GuildInfo } from '../user-types'
	import GuildIcon from './GuildIcon.svelte'
	export let guilds: GuildInfo[]
	export let activeGuildID: string | null
	export let setActiveGuildID: (guildID: string) => void

	const generateOnClickHandler = (guildID: string) => () => setActiveGuildID(guildID)
</script>

<style>
	#root {
		flex: 0 0 72px;
		display: flex;
		flex-direction: column;
		justify-content: flex-start;
		align-items: center;
		padding: 20px 0px;
	}
</style>

<div id="root">
	{#each guilds as guild}
		<GuildIcon guildInfo={guild} selected={guild.id === activeGuildID} onclick={() => setActiveGuildID(guild.id)} />
	{/each}
</div>

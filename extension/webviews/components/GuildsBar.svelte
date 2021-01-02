<script lang="ts">
	import GuildIcon from './GuildIcon.svelte'
	import { user, activeGuild, setActiveGuildID } from '../sockets'
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
	{#each $user.guilds as guild}
		<GuildIcon
			guildInfo={guild}
			selected={guild.id === $activeGuild?.id}
			onclick={() => setActiveGuildID(guild.id)}
		/>
	{/each}
</div>

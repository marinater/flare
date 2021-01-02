<script lang="ts">
	import { activeGuild, activeChannel, setActiveChannelID } from '../sockets'
	import Channel from './Channel.svelte'
</script>

<style>
	#root {
		background-color: var(--vscode-sideBar-background);
		overflow-x: hidden;
		flex: 0 0 240px;
		padding: 12px;
	}

	#header {
		height: 25px;
	}
</style>

<div id="root">
	<div id="header">TEXT CHANNELS</div>
	{#each $activeGuild?.channels || [] as channel}
		<Channel
			channelInfo={channel}
			selected={channel.id === $activeChannel?.id}
			onclick={() => setActiveChannelID(channel.id)}
		/>
	{/each}
</div>

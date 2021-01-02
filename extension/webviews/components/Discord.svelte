<script lang="ts">
	import type { GuildInfo, ChannelInfo, User } from '../user-types'
	import ChannelBar from './ChannelsBar.svelte'
	import GuildsBar from './GuildsBar.svelte'
	import ChatArea from './ChatArea.svelte'
	import { user, activeGuild, activeChannel, setActiveGuildID, setActiveChannelID } from '../sockets'
</script>

<style>
	#root {
		height: 100%;
		width: 100%;
		display: flex;
		flex-direction: row;
		align-items: stretch;
	}
</style>

<div id="root">
	<GuildsBar guilds={$user.guilds} activeGuildID={$user.activeGuildID} {setActiveGuildID} />
	<ChannelBar
		channels={$activeGuild?.channels || null}
		activeChannelID={$activeChannel?.id || null}
		{setActiveChannelID}
	/>
	<ChatArea messages={$activeChannel?.messages || null} channelName={$activeChannel?.name || null} />
</div>

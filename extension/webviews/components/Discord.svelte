<script lang="ts">
	import type { GuildInfo, ChannelInfo, User } from '../types'
	import ChannelBar from './ChannelsBar.svelte'
	import GuildsBar from './GuildsBar.svelte'
	import ChatArea from './ChatArea.svelte'

	let user: User = {
		discordID: gDiscordID,
		sessionID: gSessionID,
		guilds: [
			{
				id: 'guild-1-id',
				icon: null,
				name: 'Guild 1',
				channels: [
					{
						id: 'channel-1-id',
						name: 'Channel 1',
						messages: [],
						unread: 1
					}
				],
				unread: 1
			},
			{
				id: 'guild-2-id',
				icon: null,
				name: 'Guild 2',
				channels: [
					{
						id: 'channel-1-id',
						name: 'Channel 1',
						messages: [],
						unread: 1
					},
					{
						id: 'channel-2-id',
						name: 'Channel 2',
						messages: [],
						unread: 1
					}
				],
				unread: 0
			}
		]
	}

	let activeGuild: GuildInfo | null = null
	let activeChannel: ChannelInfo | null = null

	const setActiveGuildID = (guildID: string) => {
		activeGuild = user.guilds.find(x => x.id === guildID) || null
		if (activeGuild && activeGuild.channels.length > 0) activeChannel = activeGuild.channels[0]
	}

	const setActiveChannelID = (channelID: string) => {
		console.log('here: ' + channelID)
		activeChannel = activeGuild?.channels.find(x => x.id === channelID) || null
	}
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
	<GuildsBar guilds={user.guilds} activeGuildID={activeGuild?.id || null} {setActiveGuildID} />
	<ChannelBar
		channels={activeGuild?.channels || null}
		activeChannelID={activeChannel?.id || null}
		{setActiveChannelID}
	/>
	<ChatArea messages={activeChannel?.messages || null} channelName={activeChannel?.name || null} />
</div>

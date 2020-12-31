<script lang="ts">
    import ChannelBar from './ChannelsBar.svelte';
    import GuildsBar from './GuildsBar.svelte';
    import ChatArea from './ChatArea.svelte';
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
    <GuildBar/>
    <ChannelBar/>
    <ChatArea/>
</div>

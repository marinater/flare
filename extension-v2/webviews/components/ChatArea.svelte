<script lang="ts">
    import ChatBox from './ChatBox.svelte'
</script>

<style>
    #root {
        flex-direction: column;
        flex: 8 0 auto;
        display: flex;
        align-items: stretch;
        padding: 20px;
    }

    #message-list {
        height: 100%;
        overflow-y: scroll;
        flex-direction: column;
        justify-content: flex-end;
        align-items: stretch;
    }

    #message-list-tail {
        height: 20px;
        flex-grow: 0;
        flex-shrink: 0;
    }
</style>

<div id="root">
    <div id="scroll-wrapper">
        <div id="message-list">
            <div id="message-list-tail" />
        </div>
    </div>
    <ChatBox/>
</div>

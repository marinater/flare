<script>
    import type { ChannelInfo } from '../types'
    
</script>

<style>
    .root {
        border-radius: 3px;
        margin-bottom: 6px;
        padding: 5px 10px;
        position: relative;
        color: var(--vscode-debugIcon-breakpointDisabledForeground);
    }

    .root-active,
    .root:hover {
        color: var(--vscode-editor-foreground);
        background-color: var(--vscode-editor-selectionBackground);
    }

    .notification-highlight {
        color: var(--vscode-editor-foreground);
    }

    .notification-dot {
        background-color: var(--vscode-minimap-errorHighlight);
        border-radius: 50%;
        position: absolute; 
        left: 0;
        top: calc(50% - 6px);
        transform: translate(calc(-50% - 12px), 0%); 
        height: 12px; 
        width: 12px; 
    }
</style>

<div class='root'>
    <div class='channel-container'>
        <span class='channel-name-text'></span>
    </div>
</div>

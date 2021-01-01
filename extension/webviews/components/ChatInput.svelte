<script lang="ts">
	export let placeholder: string
</script>

<style>
	input {
		flex-grow: 0;
		flex-shrink: 0;
		width: 100%;
		height: 44px;
		background-color: var(--vscode-input-background);
		border-radius: 8px;
		border: 2px solid var(--vscode-button-secondaryBackground);
		outline: none;
		padding-left: 20px;
		color: var(--vscode-input-foreground);
		transition: 0.25s ease-out;
	}

	input:hover {
		border-color: var(--vscode-button-secondaryHoverBackground);
	}

	input:focus {
		border-color: var(--vscode-button-background);
		transition: 0.25s ease-out;
	}
</style>

<input {placeholder} />

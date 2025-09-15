<script>
    /** @type {{codex: import('$lib/states/codex.svelte').Codex}}*/
    let { codex } = $props();

    const selection = $derived(codex.selection);
</script>

{#if selection.isInside}
    <div class="selection">
        <div class="row">
            <span class="key">Start Block</span>
            <span class="value">{selection.startBlock?.type.toUpperCase()} #{selection.startBlock?.index}</span>
        </div>
        <div class="row">
            <span class="key">End Block</span>
            <span class="value">{selection.endBlock?.type.toUpperCase()} #{selection.endBlock?.index}</span>
        </div>

    </div>

{/if}

<style lang="scss">
    .selection {
        border: 1px dashed rgba(0, 0, 255, 0.336);
        font-size: 12px;
        .row {
            display: flex;
            justify-content: space-between;
            background: hsla(0, 0%, 100%, 0.527);
            &:not(:last-child) {
                border-bottom: 1px dashed rgba(0, 0, 255, 0.336);
            }
            .key{
                padding: 5px 10px;
                color: hsla(0, 0%, 0%, 0.5);
                border-right: 1px dashed rgba(0, 0, 255, 0.336);
            }
            .value {
                padding: 5px 10px;
                color: hsla(0, 0%, 0%, 0.8);
            }

        }
    }
</style>
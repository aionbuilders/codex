<script>
    /** @type {{block: import('../states/blocks/text.svelte').Text}} */
    let { block } = $props();

</script>

<span bind:this={block.element} data-codex-text-index={block.index}
    style:font-weight={block.bold ? 'bold' : 'normal'}
    style:font-style={block.italic ? 'italic' : 'normal'}
    style:text-decoration={block.underline ? 'underline' : block.strikethrough ? 'line-through' : 'none'}
></span>

<style lang="scss">

</style>
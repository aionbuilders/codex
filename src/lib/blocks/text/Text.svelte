<script>
    /** @type {{block: import('./text.svelte').Text}} */
    let { block } = $props();
</script>

<span
    bind:this={block.element}
    style:font-weight={block.styles.bold ? "bold" : "normal"}
    style:font-style={block.styles.italic ? "italic" : "normal"}
    style:text-decoration={block.styles.underline
        ? "underline"
        : block.styles.strikethrough
          ? "line-through"
          : "none"}
></span>

<style lang="scss">
</style>

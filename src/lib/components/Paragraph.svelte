<script>
    /** @type {{block: import('../states/blocks/paragraph.svelte').Paragraph}} */
    let { block } = $props();
</script>

<p bind:this={block.element}>
    {#if block.children}
        {#each block.children as child (child.id)}
            {#if child.component}
                {@const Component = child.component}
                <Component block={child} />
            {/if}
        {/each}
    {/if}
</p>


<style lang="scss">
    p {

        background: hsla(0, 0%, 0%, 0.05);
        margin-bottom: 1rem;
    }
</style>
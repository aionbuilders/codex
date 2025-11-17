<script>
    /** @type {{block: import('./list.svelte').List}} */
    let { block } = $props();
</script>

<ul bind:this={block.element}>
    {#if block.children}
        {#each block.children as child (child.id)}
            {#if child.component}
                {@const Component = child.component}
                <Component block={child} />
            {/if}
        {/each}
    {/if}
</ul>

<style>
    ul {
        padding-left: 20px;
    }
</style>

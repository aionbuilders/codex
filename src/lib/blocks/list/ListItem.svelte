<script>
    /** @type {{block: import('./list.svelte').ListItem}} */
    let { block } = $props();
</script>

<li bind:this={block.element}>
    {#if block.children}
        {#each block.children as child (child.id)}
            {#if child.component}
                {@const Component = child.component}
                <Component block={child} />
            {/if}
        {/each}
    {/if}
</li>
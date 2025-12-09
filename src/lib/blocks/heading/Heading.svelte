<script>
    /** @type {{block: import('./heading.svelte').Heading}} */
    let { block } = $props();

    const tag = $derived(`h${block.level || 1}`);
</script>

<svelte:element this={tag} class="heading" bind:this={block.element}>
    {#if block.children}
        {#each block.children as child (child.id)}
            {#if child.component}
                {@const Component = child.component}
                <Component block={child} />
            {/if}
        {/each}
    {/if}
</svelte:element>

<style>
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        margin-bottom: 1rem;
    }
</style>

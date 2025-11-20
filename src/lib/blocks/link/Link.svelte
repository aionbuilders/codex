<script>
    /** @type {{block: import('./link.svelte.js').Link}}*/
    let {block} = $props();

</script>

<a href={block.href} bind:this={block.element} title={block.title}>
    {#if block.children}
        {#each block.children as child (child.id)}
            {#if child.component}
                {@const Component = child.component}
                <Component block={child} />
            {/if}
        {/each}
    {/if}
</a>

<style>
    a {
        color: rgb(65, 65, 231);
    }
</style>
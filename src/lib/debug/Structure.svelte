<script>
    import Block from './debug/Block.svelte';

    /** @type {{codex: import('$lib/states/codex.svelte').Codex}}*/
    let { codex } = $props();
</script>

<div class="structure">
    {#if codex?.children}
        {#each codex.children as block}
            <Block {block} {codex} />
        {/each}
    {/if}

</div>

<style lang="scss">
    .structure {
        border-top: 1px dashed #ddd;
        border-right: 1px dashed #ddd;
        display: flex;
        flex-direction: column;
    }

</style>


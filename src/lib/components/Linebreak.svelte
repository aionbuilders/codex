<script>
    import { untrack } from 'svelte';

    /** @type {{block: import('../states/blocks/linebreak.svelte').Linebreak}} */
    let { block } = $props();
</script>

<br bind:this={block.element} data-codex-linebreak-index={block.index} />

<style lang="scss">

</style>
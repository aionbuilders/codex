<script>
    import { untrack } from "svelte";

    /** @type {{block: import('./linebreak.svelte').Linebreak}} */
    let { block } = $props();
</script>

<br bind:this={block.element} data-codex-linebreak-index={block.index} />

<style lang="scss">
</style>

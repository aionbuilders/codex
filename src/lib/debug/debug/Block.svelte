<script>
    import Block from "./Block.svelte";
    /** @type {{block: (import('$lib/states/block.svelte').Block)|(import('$lib/states/block.svelte').MegaBlock), codex: import('$lib/states/codex.svelte').Codex}}*/
    let {block, codex} = $props();
</script>

{#if block}
<div class="_">
    <div class="block" class:selected={block.selected}>
        <span class="i">#{block.index}</span>
        <span class="type">{block.type}</span>
        <p class="debug">{block.debug}</p>
    </div>
    <div class="children">
        {#if block.children && block.children.length > 0}
        {#each block.children as child}
        <Block block={child} {codex} />
        {/each}
        {/if}
    </div>
</div>

{/if}

<style lang="scss">
    .block {
        background: white;
        border-bottom: 1px dashed #ddd;
        border-left: 1px dashed #ddd;
        font-size: 12px;
        display: flex;
        align-items: center;
        .i {
            color: hsla(0, 0%, 0%, 0.25);
            border-right: 1px dashed #ddd;
            padding: 10px;
        }
        .type {
            color: hsla(0, 0%, 0%, 0.5);
            border-right: 1px dashed #ddd;
            padding: 10px;
            text-transform: uppercase;
            transition: all 0.3s ease-in-out;
        }
        .debug {
            color: hsla(0, 0%, 0%, 0.5);
            padding: 10px;
        }
        &.selected{
            .type{
                color: rgba(37, 196, 148, 0.795);
                background: rgba(26, 202, 149, 0.1);
            }
        }
    }
    
    .children {
        padding-left: 20px;
    }
    
</style>
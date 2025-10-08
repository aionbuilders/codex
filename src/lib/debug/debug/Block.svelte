<script>
    import Block from "./Block.svelte";
    /** @type {{block: (import('$lib/states/block.svelte').Block)|(import('$lib/states/block.svelte').MegaBlock), codex: import('$lib/states/codex.svelte').Codex}}*/
    let {block, codex} = $props();

    let showTooltip = $state(false);
    let hoverTimeout = $state(null);

    function handleMouseEnter() {
        hoverTimeout = setTimeout(() => {
            showTooltip = true;
        }, 1000);
    }

    function handleMouseLeave() {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = null;
        }
        showTooltip = false;
    }
</script>

{#if block}
<div class="_">
    <div class="block" class:selected={block.selected}>
        <span class="i">#{block.index}</span>
        <span class="type"
              role="button"
              tabindex="0"
              onmouseenter={handleMouseEnter}
              onmouseleave={handleMouseLeave}>
            {block.type}
            {#if showTooltip}
            <div class="tooltip">{block.id}<br>{block.uuid}</div>
            {/if}
        </span>
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
            position: relative;

            .tooltip {
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: #333;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                white-space: nowrap;
                z-index: 1000;
                margin-top: 4px;

                &::before {
                    content: '';
                    position: absolute;
                    bottom: 100%;
                    left: 50%;
                    transform: translateX(-50%);
                    border: 4px solid transparent;
                    border-bottom-color: #333;
                }
            }
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
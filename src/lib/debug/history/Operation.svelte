<script>
    /** @type {{codex: import('$lib/states/codex.svelte').Codex, op: import('$lib/states/operations.svelte').Operation}}*/
    let {codex, op} = $props();

    const index = $state.snapshot(op.block.index);
</script>

<div class="op" class:unlink={op.block.unlink}>
    <span class="index">#{index}</span>
    <span class="type">{op.block.type}.<span class="method">{op.name}</span></span>
    <p class="debug">{op.debug}</p>
</div>

<style lang="scss">
    .op {
        width: 100%;
        border-bottom: 1px solid #ccc;

        font-size: 13px;
        line-height: 13px;

        color: #3333335e;
        display: flex;
        align-items: center;
        padding: 5px 0px;

        .index {
            padding: 0px 10px;
            border-right: 1px dashed #ccc;
        }

        .type {
            padding: 0px 10px;
            border-right: 1px dashed #ccc;            
        }

        .method{
            color: #333333d3;
        }

        .debug {
            padding: 0px 10px;
            color: #555;
        }

        &.unlink {
            opacity: 0.5;
            .index {
                text-decoration: line-through;
            }
        }
    }
</style>
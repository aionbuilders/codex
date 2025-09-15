<script>
    import Operation from "./Operation.svelte";

    /** @type {{codex: import('$lib/states/codex.svelte').Codex, tx: import('$lib/utils/operations.utils').Transaction}} */
    let { codex, tx } = $props();

    const operations = $derived(tx?.operations);

</script>

<div class="tx">
    <div class="side"></div>
    <div class="ops">
        {#each operations as op}
            <Operation {codex} {op}  />
        {/each}
    </div>
</div>

<style lang="scss">
    .tx {
        display: flex;
        position: relative;
        align-items: center;
        .side {
            position: absolute;
            left: -10px;
            // top: 1px;
            height: calc(100% - 5px);
            width: 2px;
            border-radius: 10px;
            background: rgba(35, 32, 228, 0.425);
        }
        .ops {
            width: 100%;
            display: flex;
            flex-direction: column;
        }

    }

</style>
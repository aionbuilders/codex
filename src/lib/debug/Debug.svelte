<script>
    import History from "./History.svelte";
    import Selection from "./Selection.svelte";
    import Structure from "./Structure.svelte";
    
    /** @type {{codex: import('$lib/states/codex.svelte').Codex}}*/
    let { codex } = $props();
</script>

<div class="debug">
    <Structure {codex} />
    <Selection {codex} />
    <History {codex} />
</div>


<style lang="scss">
    .debug {
        flex: 1;
        height: 100%;
        overflow: auto;
        background-color: #f0f0f0;
        padding: 20px;
        border-left: 1px solid #ccc;
        display: flex;
        flex-direction: column;
        gap: 25px;
        position: relative;
    }
    
</style>
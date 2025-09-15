<script>
    import Operation from "./history/Operation.svelte";
    import Transaction from "./history/Transaction.svelte";

    /** @type {{codex: import('$lib/states/codex.svelte').Codex}}*/
    let { codex } = $props();

    const history = $derived(codex.history);
    
    let height = $state(200);
    let isResizing = $state(false);
    let startY = $state(0);
    let startHeight = $state(0);

    function handleMouseDown(event) {
        isResizing = true;
        startY = event.clientY;
        startHeight = height;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        event.preventDefault();
    }

    function handleMouseMove(event) {
        if (!isResizing) return;
        const deltaY = startY - event.clientY;
        height = Math.max(100, startHeight + deltaY);
    }

    function handleMouseUp() {
        isResizing = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }
</script>

<div class="_" style="height: {height}px;">
    <div class="resize-handle" role="button" tabindex="0" onmousedown={handleMouseDown}></div>
    <div class="history" >
        {#each history as tx}
            <Transaction {tx} />
        {/each}
    </div>
</div>


<style lang="scss">
    ._{
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        border-top: 1px dashed #ccc;
        
        background: hsla(0, 0%, 100%, 0.95);
    }
    .history {
        height: 100%;
        width: 100%;
        padding: 20px;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        

    }

    .resize-handle {
        position: absolute;
        top: -3px;
        left: 0;
        right: 0;
        height: 6px;
        cursor: ns-resize;
        background: transparent;
        
        &:hover {
            background: rgba(0, 123, 255, 0.1);
        }
    }
</style>


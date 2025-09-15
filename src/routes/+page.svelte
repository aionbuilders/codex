<script>
    import './global.css';
    import { Codex } from '$lib/states/codex.svelte';
    import History from '$lib/debug/History.svelte';
    import Debug from '$lib/debug/Debug.svelte';
    
    
    const codex = new Codex();
    /** @type {import('$lib/components/Codex.svelte')}*/
    const Editor = codex.components["codex"];
    
    const selection = $derived(codex.selection);
</script>

<div class="_">
    <div class="editor">
        {#if Editor}
        <Editor {codex} />
        {/if}    
    </div>
    <Debug {codex} />
</div>

<style lang="scss">
    ._ {
        // padding: 25px;
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: row;
        align-items: flex-start;
        gap: 20px;
        
        .editor {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 25px;
        }
        

    }
</style>
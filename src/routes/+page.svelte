<script>
    import './global.css';
    import { Codex } from '$lib';
    import { Paragraph } from '$lib/blocks';
    import Debug from '$lib/debug/Debug.svelte';
    
    const data = Codex.data([
        Paragraph.data("hello\nworld"),
        Paragraph.data("this is a second paragraph"),
    ])
    console.log({data});
    
    const codex = new Codex({in: data});
    const Editor = codex.component;
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
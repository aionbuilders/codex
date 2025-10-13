<script>
    import './global.css';
    import { Codex } from '$lib';
    import Debug from '$lib/debug/Debug.svelte';
    import { generateMockCodexData } from './mock';
    import { browser } from '$app/environment';
    import { Paragraph } from '$lib/blocks';
    
    const data = browser && Codex.data([
        // ...generateMockCodexData({count: 200})
        // ...(Array(200).fill(Paragraph.data("This is a sample paragraph. You can edit this text, add new blocks, and explore the features of the Codex editor. Enjoy your writing experience!")))
    ])
    console.log({data});
    
    const codex = new Codex({in: data, config: {styles: true}});
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
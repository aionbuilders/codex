<script>
    import './global.css';
    import { Codex } from '$lib';
    import Debug from '$lib/debug/Debug.svelte';
    import { generateMockCodexData } from './mock';
    import { browser } from '$app/environment';
    import { Paragraph } from '$lib/blocks';
    import { RichPreset, TextareaPreset } from '$lib/presets';
    
    const data = browser && Codex.data([
        // ...generateMockCodexData({count: 200})
        // ...(Array(200).fill(Paragraph.data("This is a sample paragraph. You can edit this text, add new blocks, and explore the features of the Codex editor. Enjoy your writing experience!")))
        // Paragraph.data("This is a sample paragraph. You can edit this text, add new blocks, and explore the features of the Codex editor. Enjoy your writing experience!"),
        // Heading.data("## Welcome to Codex Editor"),
        // Paragraph.data("This is a sample paragraph. You can edit this text, add new blocks, and explore the features of the Codex editor. Enjoy your writing experience!"),
        // List.data()
        Paragraph.data([
            // Text.data("abc "),
            // Link.data({type: "json", data: {
            //     title: "def",
            //     href: "https://kit.svelte.dev",
            //     children: [Text.data("def")]
            // }}),
            // Text.data(" ghi")
        ])
    ]);

    const codex = new Codex({in: data, preset: TextareaPreset, config: {styles: true}});
    browser && (window.__codex__ = () => codex.data());
    browser && (window.__selection__ = () => ({
        start: codex.selection.start,
        end: codex.selection.end
    }));
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

<style lang="">
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
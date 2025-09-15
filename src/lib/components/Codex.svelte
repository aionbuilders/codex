<script>
    /** @type {{codex: import('../states/codex.svelte').Codex}}*/
    let {codex} = $props();
</script>

{#if codex}
    <div class="editor" contenteditable="true" bind:this={codex.element} oninput={codex.oninput} onkeydown={codex.onkeydown} onbeforeinput={codex.onbeforeinput}>
        {#each codex.children as child (child.id)}
            {#if child.component}
                {@const Component = child.component}
                <Component block={child} />
            {/if}
        {/each}
    </div>
{/if}

<style lang="scss">
    .editor {
        width: 100%;
        max-width: 800px;
        height: 100%;
        outline: none;
    }
    
</style>
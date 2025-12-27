import { strategy } from "../../states/strategy.svelte";

export const textareaStrategy = strategy('@codex/textarea')
    .do((codex, context) => {
        console.log('Textarea strategy executed!', codex, context);
    })
    .on('keydown')
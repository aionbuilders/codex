<script>
    import './global.css';
    import { Codex } from '$lib';
    import { RichPreset } from '$lib/presets';
    import { Paragraph, Text } from '$lib/blocks';
    
    // Créer un document avec un Link pour tester
    const data = Codex.data([
        Paragraph.data([
            Text.data("Voici un exemple avec un "),
            Text.data({
                text: "lien vers Google",
                styles: { bold: true }
            }),
            Text.data(" et du "),
            Text.data({
                text: "texte normal",
                styles: { italic: true }
            }),
            Text.data(". Essayez de sortir du lien avec Escape ou Ctrl+Shift+Space !")
        ])
    ]);

    const codex = new Codex({in: data, preset: RichPreset, config: {styles: true}});
    const Editor = codex.component;
    
    // Log pour debugging
    $: console.log("Codex state:", codex.children);
</script>

<div class="_">
    <div class="editor">
        {#if Editor}
            <Editor {codex} />
        {/if}    
    </div>
    
    <div class="instructions">
        <h2>🧪 Test de Transformation Link</h2>
        <div class="test-cases">
            <div class="test-case">
                <h3>🎯 Objectif</h3>
                <p>Tester la transformation d'un block Link en markdown avec Escape ou Ctrl+Shift+Space</p>
            </div>
            
            <div class="test-case">
                <h3>⌨️ Raccourcis</h3>
                <ul>
                    <li><strong>Escape</strong> : Sortir du Link et convertir en markdown</li>
                    <li><strong>Ctrl+Shift+Space</strong> : Alternative pour sortir du Link</li>
                </ul>
            </div>
            
            <div class="test-case">
                <h3>📝 Résultat attendu</h3>
                <p>Le Link doit se transformer en Text contenant le markdown :</p>
                <code>[lien vers Google](https://google.com) et du texte normal</code>
            </div>
            
            <div class="test-case">
                <h3>🔄 Tests à effectuer</h3>
                <ol>
                    <li>Cliquer dans le Link pour le sélectionner</li>
                    <li>Appuyer sur <strong>Escape</strong></li>
                    <li>Vérifier que le Link devient du Text avec format markdown</li>
                    <li>Tester <strong>Ctrl+Z</strong> pour annuler (undo)</li>
                    <li>Tester <strong>Ctrl+Y</strong> pour refaire (redo)</li>
                </ol>
            </div>
        </div>
    </div>
</div>

<style lang="">
    ._ {
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
        
        .instructions {
            width: 300px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 8px;
            height: fit-content;
            
            h2 {
                margin-top: 0;
                color: #333;
            }
            
            .test-case {
                margin-bottom: 20px;
                padding: 15px;
                background: white;
                border-radius: 6px;
                border-left: 4px solid #007bff;
                
                h3 {
                    margin-top: 0;
                    margin-bottom: 10px;
                    color: #007bff;
                }
                
                p, ul, ol {
                    margin: 0;
                    line-height: 1.5;
                }
                
                code {
                    background: #f8f9fa;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: monospace;
                    display: block;
                    margin: 10px 0;
                }
                
                li {
                    margin-bottom: 5px;
                }
            }
        }
    }
</style>
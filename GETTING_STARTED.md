# 📘 Codex Editor Alpha - Guide d'intégration

> **Version:** 1.0.0-alpha.3  
> **Framework:** Svelte 5+ (runes obligatoires)  
> **Status:** Early Alpha - API instable

---

## ⚠️ Avant de commencer

### Ce qui fonctionne
- ✅ Édition de texte basique dans des paragraphes
- ✅ Sauts de ligne avec `Shift+Enter`
- ✅ Sélection et navigation mono-bloc
- ✅ Système de transactions avec rollback
- ✅ Debug panel en temps réel

### Ce qui ne fonctionne PAS
- ❌ Sélection multi-blocs (détection OK, opérations buggées)
- ❌ Copier/Coller
- ❌ Undo/Redo
- ❌ Styles de texte (UI/raccourcis)
- ❌ Tout bloc autre que Paragraph/Text/Linebreak

**Ne pas utiliser en production.**

---

## 📦 Installation

### Prérequis
```json
{
  "svelte": "^5.0.0"
}
```

### Installation du package
```bash
npm install @aionbuilders/codex
```

---

## 🚀 Intégration basique

### 1. Setup minimal (éditeur vide)

```svelte
<script>
  import { Codex } from '@aionbuilders/codex';
  
  // Créer une instance avec preset minimal par défaut
  const codex = new Codex();
  
  // Récupérer le composant Svelte
  const Editor = codex.component;
</script>

<Editor {codex} />

<style>
  /* L'éditeur occupe tout l'espace disponible */
  :global(.editor) {
    width: 100%;
    max-width: 800px;
    outline: none;
  }
</style>
```

### 2. Avec contenu initial

```svelte
<script>
  import { Codex } from '@aionbuilders/codex';
  import { Paragraph } from '@aionbuilders/codex/blocks';
  
  // Créer la structure de données
  const initialData = Codex.data([
    Paragraph.data("Premier paragraphe"),
    Paragraph.data("Second paragraphe\navec saut de ligne"),
  ]);
  
  // Initialiser avec les données
  const codex = new Codex({ in: initialData });
  const Editor = codex.component;
</script>

<Editor {codex} />
```

### 3. Avec le panneau de debug

```svelte
<script>
  import { Codex } from '@aionbuilders/codex';
  import Debug from '@aionbuilders/codex/lib/debug/Debug.svelte';
  
  const codex = new Codex();
  const Editor = codex.component;
</script>

<div class="layout">
  <div class="editor-container">
    <Editor {codex} />
  </div>
  <Debug {codex} />
</div>

<style>
  .layout {
    display: flex;
    height: 100vh;
  }
  
  .editor-container {
    flex: 1;
    padding: 25px;
  }
</style>
```

---

## 📝 Manipulation des données

### Format de données Codex

```javascript
// Structure hiérarchique
const data = {
  type: 'codex',
  root: true,
  children: [
    {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'Hello' },
        { type: 'linebreak' },
        { type: 'text', text: 'World' }
      ]
    }
  ]
};
```

### Helpers de création de données

```javascript
import { Codex } from '@aionbuilders/codex';
import { Paragraph, Text } from '@aionbuilders/codex/blocks';

// Méthode 1: Via Codex.data()
const data1 = Codex.data([
  Paragraph.data("Simple text"),
  Paragraph.data("Text\nwith\nlinebreaks")
]);

// Méthode 2: Via Paragraph.data()
const data2 = Codex.data([
  Paragraph.data({
    type: 'text',
    data: 'Hello World'
  }),
  Paragraph.data({
    type: 'children',
    data: [
      Text.data({ text: 'Custom' }),
      { type: 'linebreak' },
      Text.data({ text: 'structure' })
    ]
  })
]);

// Méthode 3: Structure manuelle
const data3 = {
  type: 'codex',
  root: true,
  children: [
    {
      type: 'paragraph',
      children: [
        { type: 'text', text: 'Manual structure' }
      ]
    }
  ]
};
```

---

## 🎯 API Codex (instance)

### Propriétés réactives principales

```javascript
const codex = new Codex();

// Structure de l'éditeur (réactif)
codex.children         // Block[] - Blocs de premier niveau
codex.recursive        // Block[] - Tous les blocs (flat)
codex.element          // HTMLDivElement - L'élément DOM

// Sélection (réactif)
codex.selection        // CodexSelection - Wrapper de Selection API
codex.selection.isInside           // boolean
codex.selection.startBlock         // Block | null
codex.selection.endBlock           // Block | null
codex.selection.isMultiBlock       // boolean
codex.selection.collapsed          // boolean

// Historique (structure en place, pas fonctionnel)
codex.history          // History (extends SvelteSet<Transaction>)

// Configuration
codex.preset           // Preset - Preset utilisé
codex.blocks           // Array<typeof Block> - Types de blocs disponibles
codex.systems          // System[] - Systèmes actifs
```

### Méthodes principales

```javascript
// Transactions (la bonne façon de modifier)
codex.tx(operations)   // Transaction - Crée une transaction
  .after(callback)     // Ajoute des ops post-exécution
  .execute()           // Promise<results> - Exécute avec rollback

// Focus (buggy, utilise des retries)
codex.focus({
  start: { node: Node, offset: number },
  end: { node: Node, offset: number }  // optionnel
});

// Récupération de valeurs
codex.values.text      // string - Texte brut
codex.values.json      // object - Structure JSON
```

---

## 🔧 Configuration avancée

### Sans preset (éditeur vide)

```javascript
const codex = new Codex({
  preset: null,
  blocks: [Paragraph, Text, Linebreak],
  components: {
    paragraph: CustomParagraphComponent,
    text: CustomTextComponent
  }
});
```

### Avec preset personnalisé

```javascript
import { Preset } from '@aionbuilders/codex/presets';
import { MinimalPreset } from '@aionbuilders/codex/presets';

// Créer un preset personnalisé
const MyPreset = MinimalPreset.extend({
  name: '@myapp/custom',
  // blocks: [...], // Ajout de blocs custom
  // systems: [...] // Ajout de systèmes custom
});

const codex = new Codex({
  preset: MyPreset
});
```

### Omission d'éléments

```javascript
const codex = new Codex({
  preset: MinimalPreset,
  omit: [
    'block:paragraph',
    'strategy:multi-block-delete',
    'system:paragraph'
  ]
});
```

---

## 🎨 Personnalisation visuelle

### Styling CSS

```css
/* Cibler l'éditeur */
:global(.editor) {
  width: 100%;
  max-width: 800px;
  padding: 20px;
  min-height: 300px;
  outline: none;
  
  /* Styles imposés par Codex (important) */
  user-select: text !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}

/* Paragraphes */
:global(.editor p) {
  margin-bottom: 1rem;
  line-height: 1.6;
}

/* Texte */
:global(.editor [data-codex-text-index]) {
  /* Les styles inline sont appliqués directement */
}
```

### Composants personnalisés

```javascript
import CustomParagraph from './CustomParagraph.svelte';

const codex = new Codex({
  components: {
    paragraph: CustomParagraph
  }
});
```

**CustomParagraph.svelte:**
```svelte
<script>
  let { block } = $props();
</script>

<p bind:this={block.element} class="my-paragraph">
  {#each block.children as child (child.id)}
    {#if child.component}
      {@const Component = child.component}
      <Component block={child} />
    {/if}
  {/each}
</p>

<style>
  .my-paragraph {
    /* Custom styles */
  }
</style>
```

---

## ⚙️ Patterns d'utilisation

### 1. Réactivité aux changements

```svelte
<script>
  import { Codex } from '@aionbuilders/codex';
  
  const codex = new Codex();
  const Editor = codex.component;
  
  // Réagir aux changements de texte
  $effect(() => {
    console.log('Text changed:', codex.values.text);
  });
  
  // Réagir aux changements de sélection
  $effect(() => {
    const sel = codex.selection;
    if (sel.isInside) {
      console.log('Selection:', {
        start: sel.startBlock?.type,
        end: sel.endBlock?.type,
        collapsed: sel.collapsed
      });
    }
  });
</script>
```

### 2. Modification programmatique (via transactions)

```javascript
import { Operation } from '@aionbuilders/codex';

// Récupérer un block
const paragraph = codex.children[0];

// Créer des opérations
const ops = paragraph.prepareInsert({
  blocks: [
    { type: 'text', init: { text: 'New text' } }
  ],
  offset: 0
});

// Exécuter
await codex.tx(ops).execute();
```

### 3. Lecture de valeurs

```javascript
// Texte brut
const text = codex.values.text;

// Structure JSON
const json = codex.values.json;

// Par block
codex.children.forEach(paragraph => {
  console.log(paragraph.values.text);
  console.log(paragraph.values.json);
});
```

---

## 🐛 Problèmes connus & Workarounds

### 1. Focus instable
**Symptôme:** Le curseur ne se place pas toujours correctement.

**Workaround:**
```javascript
// Utiliser requestAnimationFrame
requestAnimationFrame(() => {
  codex.focus({
    start: { node, offset }
  });
});
```

### 2. Sélection multi-blocs buggée
**Symptôme:** Supprimer du texte sur plusieurs blocs peut crasher.

**Workaround:** Éviter les sélections multi-blocs pour l'instant. Limiter à un seul paragraphe.

### 3. Normalisation agressive
**Symptôme:** Des blocs vides peuvent apparaître/disparaître automatiquement.

**Explication:** Le système normalise automatiquement (fusion de textes adjacents, suppression d'empties). C'est voulu mais peut surprendre.

### 4. Pas de stockage persistant
**Important:** Ne jamais utiliser `localStorage` ou `sessionStorage` dans les composants ou extensions. Tout doit rester en mémoire.

```javascript
// ❌ Ne PAS faire
localStorage.setItem('content', JSON.stringify(codex.values.json));

// ✅ Faire (dans votre app parent)
function saveContent() {
  const data = codex.values.json;
  // Envoyer à votre backend
  await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}
```

---

## 📊 Exemple complet

```svelte
<script>
  import { Codex } from '@aionbuilders/codex';
  import { Paragraph } from '@aionbuilders/codex/blocks';
  import Debug from '@aionbuilders/codex/lib/debug/Debug.svelte';
  
  // État de l'app
  let showDebug = $state(true);
  let savedContent = $state('');
  
  // Données initiales
  const initialData = Codex.data([
    Paragraph.data("Bienvenue dans Codex Editor Alpha"),
    Paragraph.data("Appuyez sur Shift+Enter pour un saut de ligne\nComme ceci !"),
  ]);
  
  // Initialisation
  const codex = new Codex({ in: initialData });
  const Editor = codex.component;
  
  // Sauvegarder le contenu
  function saveContent() {
    savedContent = JSON.stringify(codex.values.json, null, 2);
  }
  
  // Réactivité aux changements
  $effect(() => {
    console.log('Content length:', codex.values.text.length);
  });
</script>

<div class="app">
  <div class="toolbar">
    <button onclick={saveContent}>
      Save Content
    </button>
    <button onclick={() => showDebug = !showDebug}>
      Toggle Debug
    </button>
  </div>
  
  <div class="layout">
    <div class="editor-container">
      <h1>Mon éditeur</h1>
      <Editor {codex} />
    </div>
    
    {#if showDebug}
      <Debug {codex} />
    {/if}
  </div>
  
  {#if savedContent}
    <div class="saved">
      <h3>Saved Content:</h3>
      <pre>{savedContent}</pre>
    </div>
  {/if}
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .toolbar {
    padding: 10px;
    border-bottom: 1px solid #ccc;
    display: flex;
    gap: 10px;
  }
  
  .layout {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  
  .editor-container {
    flex: 1;
    padding: 25px;
    overflow-y: auto;
  }
  
  .saved {
    padding: 20px;
    background: #f5f5f5;
    border-top: 1px solid #ccc;
  }
  
  pre {
    overflow: auto;
    padding: 10px;
    background: white;
    border: 1px solid #ddd;
  }
  
  :global(.editor) {
    min-height: 300px;
    outline: none;
  }
</style>
```

---

## 🔍 Debug & Inspection

### Panneau de debug

Le panneau de debug affiche en temps réel:
- **Structure des blocs** (hiérarchie visuelle)
- **Sélection actuelle** (start/end blocks)
- **Historique des transactions** (liste des opérations)

```svelte
<script>
  import Debug from '@aionbuilders/codex/lib/debug/Debug.svelte';
  
  const codex = new Codex();
</script>

<Debug {codex} />
```

### Console logging

```javascript
// Activer les logs d'un block
const paragraph = codex.children[0];
paragraph.log('Debug message', { data: 'value' });

// Observer les transactions
codex.history.current; // Transaction en cours
Array.from(codex.history); // Toutes les transactions
```

---

## 📚 Ressources

- **Repository:** [github.com/aionbuilders/codex](https://github.com/aionbuilders/codex)
- **NPM:** [@aionbuilders/codex](https://www.npmjs.com/package/@aionbuilders/codex)
- **Issues:** Rapporter les bugs sur GitHub
- **Architecture:** Voir `CLAUDE.md` dans le repo

---

## ⚡ Notes de performance

- **$derived usage:** Beaucoup de computations réactives. Performances non testées à grande échelle.
- **Limite recommandée:** ~50 paragraphes maximum pour l'alpha
- **MutationObserver actif:** Observe tous les changements DOM
- **Pas d'optimisations:** Aucune virtualisation, tout est rendu

---

## 🚨 Checklist d'intégration

Avant d'intégrer dans votre projet:

- [ ] Svelte 5+ installé
- [ ] Environnement de dev fonctionnel
- [ ] Accepter l'instabilité de l'API
- [ ] Prévoir un fallback/alternative
- [ ] Ne PAS utiliser localStorage
- [ ] Tester uniquement sélections mono-bloc
- [ ] Prévoir sauvegarde fréquente côté serveur
- [ ] Lire les problèmes connus ci-dessus

---

**Version du document:** 1.0 (30 Sept 2025)  
**Basé sur:** @aionbuilders/codex@1.0.0-alpha.3
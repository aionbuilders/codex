# Stratégie de Test pour l'Éditeur Codex

## 📊 État actuel des tests

**Aucun test détecté** dans le projet Codex actuel. Le [`package.json`](package.json) ne contient aucune dépendance de test et aucun script de test n'est configuré.

## 🎯 Objectifs de test prioritaires

### 1. Tests "All in keyboard" (CRITIQUE)
- **Navigation clavier complète** : Arrow keys, Home/End, Page Up/Down
- **Édition au clavier** : Insertion, suppression, sélection
- **Transformations** : Link → Text, Paragraph → Heading, etc.
- **Gestion du focus** : Positionnement après transformations

### 2. Tests de régression (HAUTE)
- **Focus après transformOut** : Problème détecté dans [`link.svelte.js`](src/lib/blocks/link/link.svelte.js:211)
- **Normalisation automatique** : Fusion de Text/Linebreak consécutifs
- **Transactions avec rollback** : Intégrité des opérations

### 3. Tests d'intégration (MOYENNE)
- **Copy/Paste** : Une fois [`DataTransformSystem`](src/lib/utils/operations.utils.js) connecté
- **Multi-sélection** : Sélection et manipulation de plusieurs blocks
- **Undo/Redo** : Finalisation du système transactionnel

## 🛠️ Outils de test recommandés

### Option 1 : Vitest (RECOMMANDÉ)
**Avantages pour Codex :**
- **Intégration Svelte native** : Support des composants Svelte 5
- **Tests unitaires + intégration** : Architecture flexible
- **Mocking DOM** : Essentiel pour les tests de focus
- **Coverage intégré** : Suivi des parties testées

**Installation :**
```bash
npm install -D vitest @vitest/ui jsdom @testing-library/svelte
```

**Configuration de base :**
```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config'
import { sveltekit } from '@sveltejs/kit/vite'

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: true
  }
})
```

### Option 2 : Playwright (End-to-end)
**Avantages pour Codex :**
- **Tests navigateur réels** : Interaction clavier authentique
- **Multi-navigateurs** : Chrome, Firefox, Safari
- **Visual testing** : Captures d'écran automatiques
- **Tests d'accessibilité** : Screen readers, navigation ARIA

**Installation :**
```bash
npm install -D @playwright/test
```

### Option 3 : Cypress (Alternative)
**Avantages pour Codex :**
- **Tests interactifs** : Time travel, debugging visuel
- **Assertions intelligentes** : Vérification automatique du DOM
- **Plugins écosystème** : Richesse des extensions

## 🏗️ Architecture de test proposée

### Structure des dossiers
```
test/
├── unit/                    # Tests unitaires
│   ├── blocks/             # Tests des blocks individuels
│   │   ├── text.test.js
│   │   ├── link.test.js
│   │   └── paragraph.test.js
│   ├── utils/              # Tests des utilitaires
│   │   ├── operations.test.js
│   │   └── coordinates.test.js
│   └── states/             # Tests des états réactifs
│       ├── selection.test.js
│       └── history.test.js
├── integration/             # Tests d'intégration
│   ├── keyboard/           # Tests "All in keyboard"
│   │   ├── navigation.test.js
│   │   ├── editing.test.js
│   │   └── transformations.test.js
│   ├── focus/              # Tests de focus
│   │   ├── positioning.test.js
│   │   └── normalization.test.js
│   └── transactions/       # Tests transactionnels
│       ├── undo-redo.test.js
│       └── rollback.test.js
├── e2e/                    # Tests end-to-end
│   ├── workflows/          # Workflows utilisateur complets
│   │   ├── document-creation.test.js
│   │   ├── complex-editing.test.js
│   │   └── accessibility.test.js
│   └── regression/         # Tests de régression
│       ├── link-transform-out.test.js
│       └── multi-selection.test.js
├── fixtures/               # Données de test
│   ├── documents/
│   └── scenarios/
├── helpers/                # Utilitaires de test
│   ├── keyboard.js         # Simulation clavier
│   ├── focus.js            # Utilitaires focus
│   └── transactions.js     # Helpers transactions
└── setup.js               # Configuration globale
```

### Tests de focus spécialisés

**Helper de test focus :**
```javascript
// test/helpers/focus.js
export async function testFocusAfterTransform(testName, transformFn, expectedPosition) {
  // Test spécialisé pour le problème de focus après transformation
}
```

**Scénarios critiques à tester :**
1. **Link → Text transformation** : Focus après normalisation
2. **Paragraph → Heading** : Préservation position curseur
3. **Multi-sélection → Delete** : Focus après suppression
4. **Copy/Paste → Focus** : Positionnement après collage

### Tests clavier avancés

**Simulation clavier réaliste :**
```javascript
// test/helpers/keyboard.js
export async function simulateKeyboardSequence(element, sequence) {
  // Simulation complète des événements clavier
  // keydown, keypress, keyup, input
}
```

**Séquences à tester :**
- **Ctrl+A, Delete** : Sélection totale + suppression
- **Shift+Arrow keys** : Sélection étendue
- **Ctrl+Z/Ctrl+Y** : Undo/Redo clavier
- **Escape sur Link** : TransformOut avec focus

## 🚀 Plan d'implémentation

### Phase 1 : Infrastructure de test (1-2 jours)
1. **Installer Vitest** : Configuration base
2. **Créer structure** : Dossiers et helpers
3. **Setup tests** : Configuration DOM et Svelte

### Phase 2 : Tests unitaires (2-3 jours)
1. **Blocks individuels** : Text, Link, Paragraph
2. **Utils critiques** : Operations, Coordinates
3. **States réactifs** : Selection, History

### Phase 3 : Tests focus (2-3 jours)
1. **Helper focus** : Utilitaires spécialisés
2. **Transformations** : Link → Text, etc.
3. **Normalisation** : Fusion consécutive

### Phase 4 : Tests clavier (3-4 jours)
1. **Navigation** : Arrow keys, Home/End
2. **Édition** : Insertion, suppression
3. **Workflows complets** : Scénarios "All in keyboard"

### Phase 5 : Tests E2E (2-3 jours)
1. **Playwright setup** : Configuration navigateur
2. **Scénarios utilisateur** : Workflows réels
3. **Tests régression** : Problèmes connus

## 📈 Métriques de succès

### Coverage cible
- **Blocks** : 95%+ (Text, Link, Paragraph critiques)
- **Utils** : 90%+ (Operations, Coordinates)
- **Focus** : 100% (tous les scénarios de transformation)

### Scénarios de validation
- **100% des raccourcis clavier** testés
- **Toutes les transformations** avec focus validé
- **Workflows utilisateur** complets testés

## 🎯 Recommandation finale

**Commencer avec Vitest** pour les tests unitaires et d'intégration, puis ajouter **Playwright** pour les tests E2E critiques. Cette combinaison offre le meilleur équilibre entre vitesse de développement et confiance dans les fonctionnalités clavier.

**Priorité absolue** : Tests de focus après transformation pour résoudre le problème critique identifié dans [`link.svelte.js`](src/lib/blocks/link/link.svelte.js:211).
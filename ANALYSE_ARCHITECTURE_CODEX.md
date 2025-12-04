# Analyse Architecturale Complète de Codex

## Vue d'Ensemble

Codex est un éditeur de texte block-based ultra-modulaire construit sur Svelte 5 avec les runes, utilisant un seul `contenteditable` pour profiter des fonctionnalités natives du navigateur (caret, selection API, a11y) tout en offrant une expérience de développement exceptionnelle.

## 1. Schéma Mental de l'Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CODEX (ROOT)                        │
│  ┌─────────────────┬─────────────────┬─────────────────┐    │
│  │   PRESETS      │    SYSTEMS     │   STRATEGIES   │    │
│  │                 │                 │                 │    │
│  │ • Minimal      │ • DataTransform │ • MultiBlock   │    │
│  │ • Rich         │ • Style        │ • UndoRedo     │    │
│  │ • Plain        │ • Link         │ • Paragraph    │    │
│  │ • Custom...    │ • Paragraph    │ • Text...      │    │
│  └─────────────────┴─────────────────┴─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MEGABLOCKS (CONTAINERS)                  │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │ Paragraph   │   Link      │  Heading    │    List     │  │
│  │             │             │             │             │  │
│  │ • Text[]    │ • Text[]    │ • Text[]    │ • Item[]    │  │
│  │ • Linebreak │ • Linebreak │ • Linebreak │ • Text[]    │  │
│  │ • Link[]    │             │             │             │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BLOCKS (ATOMIQUES)                       │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │    Text     │  Linebreak  │   Image     │   Code      │  │
│  │             │             │             │             │  │
│  │ • Content   │ • Break     │ • Src       │ • Language  │  │
│  │ • Styles    │             │ • Alt       │ • Content   │  │
│  │ • Bold      │             │ • Title     │             │  │
│  │ • Italic    │             │             │             │  │
│  │ • ...       │             │             │             │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Hiérarchie des Classes

### 2.1 Block (Classe de Base)
- **Rôle** : Fondation atomique de tous les éléments
- **Propriétés clés** :
  - `id`, `type`, `metadata`
  - `parent`, `before`, `after` (réactivité)
  - `element` (référence DOM)
  - `selected` (dérivé de la sélection)
  - `start`, `end` (coordonnées calculées)
- **Pattern** : Préparateurs → Exécuteurs → Méthodes (trinity pattern)

### 2.2 MegaBlock (Étend Block)
- **Rôle** : Conteneur de blocks avec gestion des enfants
- **Propriétés clés** :
  - `children[]` (tableau réactif)
  - `recursive`, `endpoints` (calculs dérivés)
  - `selection` (agrégation des sélections enfants)
- **Fonctionnalités** :
  - Insertion/suppression/remplacement d'enfants
  - Gestion des coordonnées relatives
  - Normalisation automatique

### 2.3 Codex (Étend MegaBlock)
- **Rôle** : Racine de l'éditor, orchestrateur global
- **Propriétés clés** :
  - `registry` (Map des blocks par ID)
  - `selection`, `history` (états globaux)
  - `preset`, `systems`, `strategies` (extensibilité)
- **Fonctionnalités** :
  - Gestion des événements avec propagation ascendante
  - Système de transactions avec undo/redo
  - Coordination des systèmes et stratégies

## 3. Système de Transactions et Opérations

### 3.1 Architecture Transactionnelle
```
Transaction
├── Operations[] (préparées)
├── Execution séquentielle
├── Rollback automatique en erreur
├── Commit dans l'historique
└── Gestion du focus avant/après
```

### 3.2 Types d'Opérations
- **BlocksInsertion** : Insertion de blocks
- **BlocksRemoval** : Suppression de blocks  
- **BlocksReplacement** : Remplacement de blocks
- **TextEdition** : Modification de texte
- **TextStyling** : Application de styles

### 3.3 Pattern Prepare/Execute/Apply
1. **Prepare** : Génère les opérations nécessaires
2. **Execute** : Exécute les opérations dans une transaction
3. **Apply** : Applique les changements à l'état réactif

## 4. Système de Coordonnées Réactif

### 4.1 Calcul Automatique
- Chaque block calcule ses coordonnées `start`/`end`
- Propagation réactive via les runes Svelte 5
- Mise à jour automatique lors des modifications

### 4.2 Navigation et Focus
- `getFocusData()` : Conversion coordonnées → DOM
- `focus()` : Conversion DOM → coordonnées
- Gestion des sélections multi-blocks
- Normalisation des positions relatives

## 5. Pattern Strategy

### 5.1 Architecture de Stratégies
```
Strategy
├── canHandle(codex, context) → boolean
├── execute(codex, context) → void
└── tags[] (classification)
```

### 5.2 Types de Stratégies
- **Codex** : Opérations multi-blocks (undo/redo, delete)
- **Paragraph** : Gestion des paragraphes (split, merge)
- **Text** : Manipulation du texte (style, navigation)
- **Custom** : Extension par les utilisateurs

### 5.3 Système de Tags
- Classification par type d'événement
- Priorisation des stratégies
- Filtrage par contexte

## 6. Système de Presets

### 6.1 Architecture Modulaire
```
Preset
├── blocks[] (types disponibles)
├── systems[] (comportements)
├── strategies[] (règles)
├── extends (héritage)
└── config (personnalisation)
```

### 6.2 Presets Disponibles
- **Plain** : Texte brut minimal
- **Minimal** : Paragraphes + liens + styles de base
- **Rich** : Minimal + titres + listes
- **Custom** : Extension par l'utilisateur

## 7. Système de Components

### 7.1 Séparation Responsabilités
- **Classe JS** : Logique métier, état, opérations
- **Component Svelte** : Rendu DOM, événements UI
- **Liaison** : `bind:this={block.element}`

### 7.2 Pattern de Rendu
```svelte
{#each block.children as child (child.id)}
    {@const Component = child.component}
    <Component block={child} />
{/each}
```

## 8. Forces de l'Architecture

### 8.1 Modularité Exceptionnelle
- **Ajout de blocks** : Simple héritage de Block/MegaBlock
- **Extension de comportements** : Systèmes et stratégies plug-and-play
- **Personnalisation** : Presets configurables

### 8.2 Performance Optimale
- **Un seul contenteditable** : Pas de synchronisation multiple
- **Réactivité Svelte 5** : Mises à jour ciblées
- **Calculs dérivés** : Coordonnées auto-gérées

### 8.3 DX Exceptionnelle
- **TypeScript complet** : Sécurité du typage
- **Patterns clairs** : Prepare/Execute/Apply
- **Debug intégré** : Outils de développement

### 8.4 Robustesse
- **Transactions atomiques** : Rollback automatique
- **Undo/redo natif** : Historique des opérations
- **Normalisation automatique** : Cohérence du DOM

## 9. Faiblesses Identifiées

### 9.1 Complexité Cognitive
- **Courbe d'apprentissage** : Architecture riche mais complexe
- **Multiples couches** : Block → MegaBlock → Codex → Systems → Strategies
- **Réactivité distribuée** : Difficile à tracer les changements

### 9.2 Points de Friction Actuels

#### Link Block (WIP)
- ✅ Structure + transformation markdown
- ✅ Gestion événements clavier  
- ❌ **UI d'édition manquante** (modal pour href/title)
- ❌ **Transformation reverse manquante** (sortir du Link)

#### Stabilité Multi-Block
- **Focus retry** : Parfois nécessaire après opérations
- **Text styling bugs** : Styles parfois perdus
- **Navigation complexe** : Coordination inter-blocks

#### Copy/Paste
- **Non implémenté** : Fonctionnalité critique manquante
- **Clipboard handling** : Système préparé mais non connecté

### 9.3 Performance sur Gros Documents
- **Registry size** : Map de tous les blocks en mémoire
- **Recursive calculations** : Coordonnées recalculées souvent
- **DOM updates** : Potentiellement fréquentes

## 10. Recommandations

### 10.1 Priorités Courtes

#### 1. Finaliser Link Block (Priorité HAUTE)
```javascript
// Modal d'édition
Link.editModal = {
  open: true,
  href: this.href,
  title: this.title
}

// Transformation reverse
Link.transformOut = () => {
  return Text.data(`[${this.text}](${this.href})`)
}
```

#### 2. Stabiliser Text Styling (Priorité HAUTE)
- Isoler les cas de perte de styles
- Renforcer la normalisation automatique
- Ajouter des tests de régression

#### 3. Implémenter Copy/Paste (Priorité MOYENNE)
- Connecter le DataTransformSystem au clipboard
- Gérer les formats multiples (text, html, markdown)
- Maintenir les métadonnées de blocks

### 10.2 Refactoring Moyen Terme

#### 1. Simplification Cognitive
- **Documentation visuelle** : Schémas interactifs
- **Patterns simplifiés** : Réduire les couches
- **Exemples guidés** : Cas d'usage courants

#### 2. Performance Optimisation
- **Virtualisation** : Pour les gros documents
- **Lazy loading** : Des systèmes/presets
- **Memoization** : Calculs de coordonnées

#### 3. Public API
- **Interface stable** : Pour les extensions
- **Plugin system** : Architecture d'extensions
- **Versioning** : Compatibilité ascendante

### 10.3 Architecture Long Terme

#### 1. Collaboration Features
- **OT/CRDT** : Édition collaborative
- **Conflict resolution** : Gestion des conflits
- **Real-time sync** : Synchronisation serveur

#### 2. Advanced Blocks
- **Tables** : Structure tabulaire complexe
- **Embeds** : Contenu externe (vidéo, iframe)
- **Components** : Blocks personnalisables

#### 3. Ecosystem
- **Marketplace** : Presets et blocks partagés
- **CLI tools** : Génération de blocks
- **Dev tools** : Debug avancé

## 11. Questions et Clarifications

### 11.1 Architecture
- **Scalabilité** : Comment l'architecture évolue-t-elle avec 1000+ blocks ?
- **Memory management** : Y-a-t'il des leaks potentiels dans le registry ?
- **Event propagation** : Comment éviter les boucles infinies ?

### 11.2 Implémentation
- **Focus management** : Pourquoi le focus retry est-il nécessaire ?
- **Text normalization** : Quand et comment normaliser automatiquement ?
- **Block boundaries** : Comment gérer les cas limites (début/fin) ?

### 11.3 Extensibilité
- **Custom blocks** : Quelle est la complexité réelle d'ajout ?
- **Strategy conflicts** : Comment résoudre les conflits de stratégies ?
- **Version compatibility** : Comment gérer l'évolution des presets ?

## Conclusion

Codex présente une architecture remarquablement bien pensée qui équilibre modularité, performance et expérience développeur. Les fondations sont solides avec le système de transactions, les coordonnées réactives et le pattern strategy.

Les points de friction actuels (Link UI, text styling, copy/paste) sont des problèmes de finalisation plutôt que des défauts architecturaux. La complexité cognitive est le principal défi à moyen terme, mais peut être atténuée par une meilleure documentation et des patterns simplifiés.

L'architecture est prête pour l'évolution vers des fonctionnalités avancées (collaboration, blocks complexes) tout en maintenant sa cohérence et ses performances.
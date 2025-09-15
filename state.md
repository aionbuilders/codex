# 🚀 Codex Editor v1.0 - Roadmap & Progress Tracker

> *"The best text editor is the one that gets out of your way"*

## 📊 Dashboard Global

```
Progression Globale: ████████████░░░░░░░░ 60%

Architecture:     ██████████████████░░ 90%
Core Editor:      ████████████████░░░░ 80%
Sélection:        ████████░░░░░░░░░░░░ 40%
Interactions:     ████░░░░░░░░░░░░░░░░ 20%
API & Utils:      ░░░░░░░░░░░░░░░░░░░░ 0%
```

## 🏆 Ce qui est FAIT (et bien fait !)

### ✅ Architecture Fondamentale
- [x] **Système de blocks modulaire** - `Block` → `MegaBlock` → Blocks concrets
- [x] **Hiérarchie réactive** avec Svelte 5 runes
- [x] **Système de coordonnées absolues** - `start`/`end` sur chaque block
- [x] **Pattern Strategy** pour comportements complexes avec tags
- [x] **Système de composants** découplé de la logique

### ✅ Core Editing
- [x] **ContentEditable unique** managé proprement
- [x] **Paragraph block** fonctionnel avec children (`Text`, `Linebreak`)
- [x] **Text block** avec gestion du contenu et styles (structure en place)
- [x] **Linebreak block** avec comportements spéciaux
- [x] **Navigation basique** au clavier (flèches, début/fin de ligne)
- [x] **Gestion du focus** avec retry et `requestAnimationFrame`

### ✅ Sélection (Basique)
- [x] **SvelteSelection** - wrapper réactif autour de l'API Selection
- [x] **MutationObserver** pour changements DOM subtils
- [x] **Détection collapsed/expanded**
- [x] **Calcul des blocks sélectionnés** (`anchoredBlock`, `focusedBlock`)
- [x] **Sélection mono-block** (dans un seul Text)

### ✅ Infrastructure Technique
- [x] **Build setup** (Vite, SvelteKit)
- [x] **Hot reload** fonctionnel
- [x] **Debug panel** temps réel
- [x] **Structure de fichiers** claire et scalable

---

## 📝 Ce qui RESTE À FAIRE pour la v1

### 🔴 P0 - Bloquants (Sans ça, c'est pas un éditeur)

#### 1. **Multisélection dans Paragraph** 
```
Complexité: ████████░░ (8/10)
Temps estimé: 2-3 jours
```
- [ ] Sélection qui traverse plusieurs `Text`/`Linebreak`
- [ ] Suppression de sélection multi-blocks (Backspace/Delete)
- [ ] Remplacement par frappe sur sélection
- [ ] Gestion des cas limites (sélection commence/finit sur Linebreak)

#### 2. **Copier/Coller Basique**
```
Complexité: ██████░░░░ (6/10)
Temps estimé: 1 jour
```
- [ ] Copier du texte simple (Ctrl+C)
- [ ] Coller du texte simple (Ctrl+V)
- [ ] Nettoyer le HTML collé (strip formatting)
- [ ] Préserver la structure paragraph/linebreak

#### 3. **Sélection Complète**
```
Complexité: ████░░░░░░ (4/10)
Temps estimé: 0.5 jour
```
- [ ] Ctrl+A sélectionne tout le paragraph
- [ ] Triple-clic sélectionne le paragraph
- [ ] Gestion de la sélection inversée (de bas en haut)

### 🟡 P1 - Important (Pour que ce soit utilisable)

#### 4. **Styles de Texte**
```
Complexité: █████░░░░░ (5/10)
Temps estimé: 1 jour
```
- [ ] Toggle Bold (Ctrl+B)
- [ ] Toggle Italic (Ctrl+I)
- [ ] Toggle Underline (Ctrl+U)
- [ ] Appliquer styles sur sélection multi-blocks
- [ ] Préserver styles lors du split/merge

#### 5. **Undo/Redo Simple**
```
Complexité: ███████░░░ (7/10)
Temps estimé: 2 jours
```
- [ ] Command pattern pour les opérations
- [ ] Stack d'historique (limite 50 actions)
- [ ] Ctrl+Z / Ctrl+Y fonctionnels
- [ ] Grouper les frappes consécutives

#### 6. **API Publique Minimale**
```
Complexité: ███░░░░░░░ (3/10)
Temps estimé: 0.5 jour
```
- [ ] `getValue()` → retourne le contenu
- [ ] `setValue(content)` → définit le contenu
- [ ] `clear()` → vide l'éditeur
- [ ] `focus()` → focus l'éditeur
- [ ] Events: `onChange`, `onSelectionChange`

### 🟢 P2 - Nice to Have (Pour faire pro)

#### 7. **Navigation Avancée**
```
Complexité: ████░░░░░░ (4/10)
Temps estimé: 1 jour
```
- [ ] Ctrl+Flèches (navigation par mots)
- [ ] Home/End (début/fin de ligne)
- [ ] Ctrl+Home/End (début/fin document)
- [ ] PageUp/PageDown

#### 8. **Normalisation & Nettoyage**
```
Complexité: █████░░░░░ (5/10)
Temps estimé: 1 jour
```
- [ ] Fusion automatique des Text adjacents identiques
- [ ] Suppression des blocks vides inutiles
- [ ] Normalisation des Linebreak consécutifs
- [ ] Validation de la structure

#### 9. **Performance**
```
Complexité: ██████░░░░ (6/10)
Temps estimé: 1-2 jours
```
- [ ] Debounce sur les $derived coûteux
- [ ] Virtual scrolling prep (structure ready)
- [ ] Batch updates DOM
- [ ] Profiling & optimisations

---

## 📋 Checklist Technique Détaillée

### Multisélection - Détail d'implémentation

```javascript
// Dans paragraph.svelte.js
- [ ] deleteRange(startOffset, endOffset)
- [ ] getSelectedBlocks(startOffset, endOffset) 
- [ ] mergeAdjacentTexts()

// Dans text.svelte.js  
- [ ] deletePartial(startOffset, endOffset)
- [ ] isFullySelected()
- [ ] getSelectedText()

// Nouvelles strategies
- [ ] multiSelectionDeleteStrategy
- [ ] multiSelectionTypeStrategy
```

### Opérations à implémenter

| Opération | Touche | Single Block | Multi Block | Implémenté |
|-----------|---------|--------------|-------------|------------|
| Delete Forward | Delete | ✅ | ❌ | 🟡 Partial |
| Delete Backward | Backspace | ✅ | ❌ | 🟡 Partial |
| Delete Word | Ctrl+Delete | ❌ | ❌ | ❌ |
| Select All | Ctrl+A | ❌ | ❌ | ❌ |
| Bold | Ctrl+B | ❌ | ❌ | ❌ |
| Copy | Ctrl+C | ❌ | ❌ | ❌ |
| Paste | Ctrl+V | ❌ | ❌ | ❌ |

---

## 🎯 Définition de "Done" pour la v1

Une v1 complète quand :

1. ✅ **L'éditeur est utilisable** pour écrire du texte simple avec formatage basique
2. ✅ **Pas de perte de données** lors des opérations standards
3. ✅ **Performance fluide** jusqu'à ~1000 blocks
4. ✅ **API minimale** pour intégration
5. ✅ **Zéro erreur console** en utilisation normale

## 🚦 Prochaines Étapes Suggérées

1. **Finir la multisélection** (P0) - C'est LE morceau manquant
2. **Ajouter Copy/Paste** (P0) - Indispensable 
3. **Implémenter les styles** (P1) - Quick win visuel
4. **Tester, tester, tester** - Créer une suite de tests E2E

## 💡 Notes & Conseils

### Sur la Multisélection
La multisélection est complexe mais ton architecture la rend faisable. Conseil : commence par implémenter `deleteRange` sur Paragraph, puis généralise.

### Sur l'Historique  
Pour l'undo/redo, pense "Command Pattern light". Chaque opération = un objet avec `execute()` et `undo()`.

### Sur les Performances
Ne t'inquiète pas trop pour l'instant. Ton architecture permet d'optimiser plus tard sans tout casser.

---

## 📈 Métriques de Succès v1

- [ ] Peut écrire un document de 500 mots sans bugs
- [ ] Sélection/suppression fonctionne dans tous les cas
- [ ] Copier/coller préserve le formatage basique  
- [ ] < 100ms de latence sur les opérations
- [ ] 0 erreurs console en 10min d'utilisation

---

*Dernière mise à jour : À remplir*
*Version : 1.0.0-alpha*
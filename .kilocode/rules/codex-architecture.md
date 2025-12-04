## Brief overview
Règles spécifiques au projet Codex pour l'analyse architecturale et le développement de l'éditeur de texte block-based basé sur Svelte 5.

## Communication style
- Utiliser le français pour les discussions et analyses architecturales
- Fournir des analyses structurées avec schémas mentaux clairs
- Prioriser la compréhension des patterns existants avant de proposer des changements
- Documenter les forces et faiblesses de manière équilibrée

## Development workflow
- Explorer d'abord la structure complète avant d'analyser des parties spécifiques
- Lire les fichiers clés dans l'ordre hiérarchique : Block → MegaBlock → Codex → Systems → Strategies
- Analyser les patterns de réactivité Svelte 5 ($state, $derived, $effect)
- Identifier les points de friction actuels (WIP, bugs, fonctionnalités manquantes)

## Coding best practices
- Respecter le pattern Prepare/Execute/Apply pour les opérations
- Maintenir la séparation entre classes JS (logique) et composants Svelte (rendu)
- Utiliser les runes Svelte 5 pour la réactivité ($state, $derived, $effect)
- Implémenter les transactions avec rollback automatique
- Normaliser automatiquement les structures (textes consécutifs, liens identiques)

## Project context
- Éditeur block-based avec un seul contenteditable
- Architecture : Codex → MegaBlock → Block avec coordonnées réactives
- Système de presets modulaires pour l'extensibilité
- Pattern Strategy pour la gestion des événements
- Priorités actuelles : finaliser Link Block, stabiliser text styling, implémenter copy/paste

## Architecture analysis focus
- Identifier les forces : modularité, performance, DX, robustesse
- Documenter les faiblesses : complexité cognitive, points de friction
- Évaluer les patterns utilisés : Strategy, transactions, coordonnées réactives
- Valider les choix d'extensibilité : presets, systèmes, stratégies
- Proposer des recommandations priorisées avec rationale clair

## Other guidelines
- Créer des schémas ASCII pour visualiser l'architecture
- Utiliser des exemples de code concrets pour illustrer les patterns
- Distinguer les problèmes d'implémentation des défauts architecturaux
- Proposer des solutions avec des priorités (haute/moyenne/basse)
- Poser des questions sur les parties obscures de l'architecture
## Brief overview
Règles de workflow spécifiques au projet Codex pour optimiser le développement itératif de l'éditeur block-based basé sur Svelte 5, en intégrant les leçons apprises des problèmes de focus, de finalisation des handlers et de gestion du roadmap.

## Communication style
- Utiliser le français pour les discussions techniques et architecturales
- Prioriser l'analyse des patterns existants avant de proposer des changements
- Documenter systématiquement les forces et faiblesses de manière équilibrée
- Fournir des exemples de code concrets pour illustrer les patterns

## Development workflow
- **Phase d'exploration** : Analyser d'abord la structure complète avant d'implémenter
- **Détection des TODOs** : Rechercher systématiquement les TODOs et handlers non implémentés
- **Validation de focus** : Toujours tester les scénarios de focus après transformations
- **Mise à jour roadmap** : Actualiser roadmap.yaml après chaque fonctionnalité complétée
- **Tests de régression** : Vérifier que les nouvelles implémentations ne cassent pas l'existant

## Coding best practices
- **Handlers obligatoires** : Tout block doit avoir ses handlers d'input implémentés
- **Gestion du focus** : Préserver le focus utilisateur à travers toutes les transformations
- **Pattern Prepare/Execute/Apply** : Maintenir ce pattern pour toutes les opérations
- **Normalisation automatique** : Implémenter la normalisation des structures consécutives
- **Transactions avec rollback** : Utiliser systématiquement les transactions pour les modifications

## Project context
- **Objectif principal** : "All in keyboard" - Navigation et édition complètes au clavier
- **Architecture** : Codex → MegaBlock → Block avec coordonnées réactives
- **Maturité actuelle** : ~90% fonctionnel, focus sur la finalisation des 10% manquants
- **Priorités** : Copy/Paste, sélection multi-blocks, undo/redo finalisé

## Focus management rules
- **Après transformation** : Toujours restaurer le focus à la position attendue
- **Normalisation** : Gérer le focus avant/après les opérations de normalisation
- **TransformOut** : Préserver la position relative du curseur lors des transformations
- **Transactions** : Inclure les opérations de focus dans les transactions atomiques

## Roadmap integration
- **Mise à jour continue** : Documenter les progrès dans roadmap.yaml
- **Priorisation dynamique** : Ajuster les priorités selon les découvertes
- **TODO tracking** : Lier les TODOs code aux items de roadmap
- **Validation fonctionnelle** : Cocher les items seulement après tests complets

## Other guidelines
- **Analyse avant code** : Toujours analyser en profondeur avant d'implémenter
- **Solutions minimales** : Privilégier les solutions simples qui fonctionnent
- **Documentation des décisions** : Expliquer le pourquoi des choix architecturaux
- **Tests manuels** : Vérifier systématiquement les scénarios clavier
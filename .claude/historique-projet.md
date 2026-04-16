# Historique Projet — Danish World Championship

---

## SESSION — Chantier layout GameBoard (Milestone UI v2)

### Objectif

Rendre le plateau entièrement visible en 100vh sans scroll, repositionner les zones UI, refactoriser le panneau émotes.

### Modifications

- Layout GameBoard : flex column 100vh overflow hidden
- Bot haut 36vh · Rangée centrale 16vh · Zone humain flex 1 · Zone UI basse ~10vh
- Bots latéraux rapprochés du centre
- Bouton "Ramasser la pile" correctement positionné
- Panneau émotes : bas gauche, grille 2×2, textes supprimés
- Log de jeu : bas droit, max 4 entrées, 300px

### Décisions

- Textes bulles émotes supprimés — hors scope Phase 1
- Hauteurs en vh avec fallback flex 1

### État

- Layout validé ✅
- cannotPlay sous Jack/As : résolu ✅

---

## SESSION — Bilan PM + Structuration méthode IA

### Objectif

Faire le point sur l'état du projet, structurer la méthode de travail avec les agents IA.

### Décisions

- Conversations séparées par axe : PM · UI/UX · Bugs · Backend/Algo
- Skill `project-context` créé et installé (Claude navigateur)
- Commande `/project-context` créée pour Claude Code (`.claude/commands/`)
- Skill `frontend-design` Anthropic installé
- CLAUDE.md allégé — règles complètes déplacées dans `docs/game-rules.md`

### Feedbacks client intégrés au backlog

- Latence bots à augmenter
- Log de jeu structuré par tour (style Pokémon Showdown), scrollable
- Effets des cartes explicités dans le log (ex : "X joue J → Y doit jouer double")
- Messages fun contextuels (ex : 7 joué → "Tournée des 4 !")
- Toggle règles pour le tuto (vert/rouge), règles OG en partie normale
- Auth username sans email (sécurité Supabase à valider avant)
- Landing page : hero header + 4 cards (Rules · Play · Who are we · Profil)
- Rules Page interactive : select par carte, explication + use case jouable
- Maquettes reçues : hero header · landing page · rules page · log de jeu

### État

- Bug du 3 (mirror) non encore validé → priorité Bloc 1
- Backlog structuré en 5 blocs (voir CLAUDE.md)

---

## PROCHAINE SESSION — Bloc 1

Objectif : refacto `cardRules.ts` + valider comportement du 3
Critère de sortie : 86+ tests passent, comportement du 3 documenté et validé
Agent : backend / logique algorithmique

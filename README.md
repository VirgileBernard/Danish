# 🃏 Danish

> Jeu de cartes Danish en ligne — jouez contre des bots en attendant le tournoi annuel.

---

## À propos

Danish est un jeu de cartes traditionnel joué en famille lors d'un tournoi annuel.
Cette app permet de s'entraîner contre des bots en solo, avec les règles complètes du jeu.

**Phase 1 (actuelle) :** solo vs bots  
**Phase 2 (à venir) :** multijoueur + inscription au tournoi + fil d'actualité

---

## Jouer

🔗 **[Jouer maintenant](https://virgilbernard.github.io/Danish)** *(lien à mettre à jour après deploy)*

---

## Règles du jeu

Chaque joueur commence avec :
- 3 cartes cachées (face cachée)
- 3 cartes visibles (face visible, posées sur les cachées)
- 3 cartes en main

**Objectif :** se débarrasser de toutes ses cartes en premier.

### Déroulement
- Tu dois jouer une carte de valeur **supérieure ou égale** à la dernière jouée.
- Si tu ne peux pas jouer, tu prends **toute la pile**.
- Vide ta main avant de toucher tes cartes visibles, puis tes cartes cachées.

### Cartes spéciales

| Carte | Effet |
|-------|-------|
| 2 | Remet la pile à 0 (pile reste en jeu) |
| 3 | Miroir — copie la valeur de la carte précédente |
| 4 | Carte la plus faible — impossible sur pile vide |
| 6 | Le suivant doit jouer même couleur + valeur supérieure |
| 7 | Le suivant doit jouer valeur ≤ 7 |
| 8 | Passe le tour du joueur suivant |
| 10 | Coupe la pile — le joueur rejoue sur pile vide |
| J | Le suivant doit jouer une paire (n'importe quelle valeur) |
| A | L'attaquant désigne un joueur — ce joueur doit jouer |

### Carré automatique
Quand 4 cartes de même valeur sont jouées consécutivement (entre plusieurs joueurs), la pile est coupée automatiquement. Le joueur qui a complété le carré rejoue.

### Mode de jeu
- **Patriarcal** (défaut) : K > Q
- **Matriarcal** : Q > K

---

## Bots

Trois niveaux de difficulté :

- **Facile** — joue aléatoirement parmi les coups valides
- **Moyen** — joue les cartes faibles en premier, garde les spéciales
- **Difficile** — lit la table, cible les joueurs avancés, prépare les carrés

---

## Stack technique

- React + Vite + TypeScript
- TailwindCSS + Framer Motion
- Zustand (state management)
- Supabase (phase 2)

---

## Développement local

```bash
npm install
npm run dev        # serveur de développement
npm run test       # tests unitaires (Vitest)
npm run build      # build de production
```

---

## Roadmap

- [x] Moteur de jeu complet (règles + cas limites)
- [x] Interface de jeu vs bots
- [x] Écran de fin de partie
- [ ] Système de thèmes (Casino · Cyberpunk · Scout)
- [ ] Inscription au tournoi
- [ ] Fil d'actualité communautaire
- [ ] Multijoueur en ligne
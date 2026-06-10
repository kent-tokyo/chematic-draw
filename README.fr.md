# chematic-draw（Version Française）

Éditeur de structures chimiques multiplateforme. Construit avec **Electron, React et WebAssembly**.

[![Tests](https://github.com/yourusername/chematic-draw/actions/workflows/test.yml/badge.svg)](https://github.com/yourusername/chematic-draw/actions/workflows/test.yml)
[![Build](https://github.com/yourusername/chematic-draw/actions/workflows/build.yml/badge.svg)](https://github.com/yourusername/chematic-draw/actions/workflows/build.yml)
[![Couverture](https://codecov.io/gh/yourusername/chematic-draw/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/chematic-draw)

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [Español](./README.es.md) | Français

---

## Fonctionnalités Principales

### Fonctionnalités de Base
- **Éditeur de Structures 2D** — Interface de canevas intuitive pour dessiner des molécules
- **Visionneuse de Molécules 3D** — Visualisation 3D avec rotation, zoom et export
- **Mécanismes de Réaction** — Visualisation pas à pas des voies de réaction
- **Prédiction de Propriétés** — Masse moléculaire, LogP, ESOL, score SA, Règle de Lipinski
- **Énumération des Stéréoisomères** — Détection des centres chiraux et génération de tous les stéréoisomères
- **Recherche en Base de Données** — Recherche par similarité et détection de sous-structure commune maximale (MCS)
- **Traitement par Lot** — Traiter efficacement plusieurs molécules

### Fonctionnalités Avancées
- **Moteur WASM** — Calculs chimiques rapides utilisant la bibliothèque chematic 0.1.40
- **Génération de Coordonnées 3D** — Géométrie de distance + minimisation du champ de force UFF
- **Empreintes Moléculaires** — Génération ECFP4 et calcul de similarité Tanimoto/Dice
- **Export de Fichiers** — Formats SVG, PNG, JSON, XYZ, CSV
- **Raccourcis Clavier** — Opération compatible avec ChemDraw
- **Mode Sombre** — Support du thème clair/sombre

---

## Installation

### macOS
```bash
# Télécharger le fichier DMG
open chematic-draw-x.x.x.dmg
# Ou utiliser Homebrew
brew install chematic-draw
```

### Windows
```bash
# Télécharger depuis la page des versions
chematic-draw-x.x.x.exe
# Exécuter le programme d'installation
```

### Linux
```bash
# AppImage
./chematic-draw-x.x.x.AppImage

# Ou snap
sudo snap install chematic-draw
```

---

## Démarrage Rapide

1. **Lancer l'Application** — Cliquer sur l'icône
2. **Dessiner une Molécule** — Cliquer sur le canevas pour placer des atomes, faire glisser pour créer des liaisons
3. **Charger depuis SMILES** — Fichier → Nouveau à partir de SMILES → Coller la structure
4. **Afficher 3D** — Cliquer sur l'onglet «3D» → Bouton «3D 生成»
5. **Exporter** — Fichier → Choisir le format → Exporter

Consultez le [Guide de Démarrage Rapide](./docs/QUICK_START.md) pour plus de détails.

---

## Pile Technologique

| Composant | Technologie | Version |
|-----------|-----------|---------|
| **Bureau** | Electron | 33.x |
| **UI** | React + TypeScript | 18.x |
| **Gestion d'État** | Zustand | 4.x |
| **Canvas** | Canvas 2D API | Natif |
| **Moteur Chimique** | chematic (Rust) | 0.1.40 |
| **WASM** | wasm-bindgen | Dernière |
| **Build** | Vite + wasm-pack | Dernière |
| **Tests** | Jest + Playwright | Dernière |

---

## Configuration Requise

### Minimum
- **OS**: macOS 11+, Windows 10+, Ubuntu 20.04+
- **RAM**: 4 GB
- **Disque**: 500 MB

### Développement
- **Node.js**: 18+
- **Rust**: 1.70+
- **Git**: 2.30+

---

## Compiler à partir du Source

### Mode Développement
```bash
# Cloner le dépôt
git clone https://github.com/yourusername/chematic-draw.git
cd chematic-draw

# Installer les dépendances
npm install
rustup target add wasm32-unknown-unknown
cargo install wasm-pack

# Exécuter avec rechargement à chaud
npm start
```

### Build pour la Production
```bash
# Compiler pour la distribution
npm run make

# Sortie dans: out/make/
# - *.AppImage (Linux)
# - *.dmg (macOS)
# - *.exe (Windows)
```

Consultez le [Guide de Compilation](./docs/BUILD.md) pour plus de détails.

---

## Exemples d'Utilisation

### Dessiner et Exporter des Molécules
```
1. Fichier → Nouveau à partir de SMILES
2. Coller: CC(=O)Oc1ccccc1C(=O)O (aspirine)
3. Fichier → Exporter sous → SVG
```

### Générer et Visualiser la Structure 3D
```
1. Charger une molécule
2. Cliquer sur l'onglet «3D»
3. Cliquer sur le bouton «3D 生成»
4. Faire glisser pour faire tourner, faire défiler pour zoomer
5. Cliquer sur «XYZ 导出» pour enregistrer
```

### Vérifier la Ressemblance Pharmacologique
```
1. Charger une molécule
2. Cliquer sur l'onglet «Props»
3. Vérifier les violations de Lipinski et le score SA
```

### Comparer les Molécules
```
1. Charger la molécule A
2. Cliquer sur l'onglet «DB»
3. Cliquer sur «Search Database»
4. Cliquer sur la molécule similaire B
5. MCS surligne dans les deux structures
```

---

## Documentation

| Guide | Objectif | Temps de Lecture |
|-------|----------|-----------------|
| [Démarrage Rapide](./docs/QUICK_START.md) | Commencer en 5 minutes | 5 min |
| [Tutoriel Utilisateur](./docs/TUTORIAL.md) | Explication détaillée des fonctions | 20 min |
| [Référence API](./docs/API.md) | Spécification des fonctions WASM | 30 min |
| [Guide de Compilation](./docs/BUILD.md) | Configuration de l'environnement de développement | 15 min |
| [Architecture](./docs/ARCHITECTURE.md) | Conception du système | 25 min |
| [CI/CD](./docs/CI_CD.md) | Opération des tests et des versions | 20 min |
| [Dépannage](./docs/TROUBLESHOOTING.md) | Résolution des problèmes | Au besoin |

---

## Raccourcis Clavier

| Touche | Action |
|--------|--------|
| `Ctrl+N` / `Cmd+N` | Nouvelle molécule |
| `Ctrl+O` / `Cmd+O` | Ouvrir un fichier |
| `Ctrl+S` / `Cmd+S` | Enregistrer le fichier |
| `Ctrl+Z` / `Cmd+Z` | Annuler |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Rétablir |
| `Ctrl+V` / `Cmd+V` | Coller SMILES |
| `D` | Mode dessin |
| `S` | Mode sélection |
| `B` | Outil de liaison |
| `Delete` | Supprimer la sélection |
| `?` | Aide |

---

## Performance

### Points de Référence

| Opération | Temps | Statut |
|-----------|-------|--------|
| Analyse SMILES | 5ms | ✅ Rapide |
| Génération d'empreinte | 30ms | ✅ Rapide |
| Génération 3D (50 atomes) | 300ms | ✅ Rapide |
| Génération 3D (200 atomes) | 1.2s | ✅ Bon |
| Rendu Canvas | 14ms | ✅ 60 FPS |
| Utilisation mémoire | <50MB | ✅ Efficace |

Consultez [Points de Référence de Performance](./docs/CI_CD.md#performance-optimization) pour plus de détails.

---

## Tests

### Exécuter les Tests
```bash
# Tests unitaires
npm test

# Tests E2E
npm run test:e2e

# Points de référence de performance
npm run test:perf

# Rapport de couverture
npm test -- --coverage
```

### Intégration Continue
Tous les push et PR exécutent automatiquement:
- Vérification des types TypeScript
- Tests unitaires + couverture
- Tests de navigateur E2E
- Tests de régression de performance

Consultez le [Guide CI/CD](./docs/CI_CD.md) pour plus de détails.

---

## Contributions

Les contributions sont bienvenues! Consultez [CONTRIBUTING.md](./CONTRIBUTING.md) pour:
- Configuration de l'environnement de développement
- Directives de style de code
- Exigences de test
- Processus de demande de tirage
- Format du message de commit

### Contribution Rapide
```bash
# Fork et cloner
git clone https://github.com/YOUR_USERNAME/chematic-draw.git

# Créer une branche de fonctionnalité
git checkout -b feature/my-feature

# Faire des changements et tester
npm test

# Push et créer une PR
git push origin feature/my-feature
```

---

## Feuille de Route

### v0.2.x (Actuel)
- ✅ Visionneuse de molécules 3D
- ✅ Prédiction de propriétés
- ✅ Visualisation des mécanismes de réaction
- ✅ Énumération des stéréoisomères
- ✅ Recherche en base de données
- ✅ Optimisation des performances
- ✅ Documentation complète

### v0.3.x (Planifié)
- [ ] Version web (navigateur)
- [ ] Édition collaborative en temps réel
- [ ] Intégration du stockage en nuage
- [ ] Prédiction RMN avancée

### v0.4.x (Futur)
- [ ] Rendu WebGL
- [ ] Support VR/AR
- [ ] Intégration d'apprentissage automatique

Consultez la [Feuille de Route](./ROADMAP.md) pour plus de détails.

---

## Licence

chematic-draw est sous double licence:
- **Licence MIT** — Pour les projets open source
- **Licence Apache 2.0** — Pour l'utilisation commerciale

Consultez [LICENSE.MIT](./LICENSE.MIT) et [LICENSE.APACHE](./LICENSE.APACHE).

---

## Support

### Documentation
- 📖 [Documentation Complète](./docs/)
- 🚀 [Démarrage Rapide](./docs/QUICK_START.md)
- 🆘 [Dépannage](./docs/TROUBLESHOOTING.md)

### Communauté
- 💬 [GitHub Discussions](https://github.com/yourusername/chematic-draw/discussions)
- 🐛 [GitHub Issues](https://github.com/yourusername/chematic-draw/issues)
- 📧 Email: support@example.com

---

## Informations de Version

| Composant | Statut | Remarques |
|-----------|--------|----------|
| **Développement** | ✅ Actif | Mises à jour régulières |
| **Tests** | ✅ Complet | Jest + Playwright |
| **CI/CD** | ✅ Automatisé | GitHub Actions |
| **Documentation** | ✅ Complète | 7 guides |
| **Prêt pour la Production** | ✅ Oui | v0.2.0+ stable |

---

**Profitez de la chimie! 🧪**

❤️ Fait pour la communauté chimique.

---

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [Español](./README.es.md) | Français

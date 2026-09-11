# Éditeur Mermaid local

Application web autonome pour créer, modifier et visualiser des diagrammes Mermaid **sans Internet** et **sans installation** (hors Python pour le serveur local).

## Lancer

### Windows

Double-cliquez sur `start.bat`, ou dans un terminal :

```bat
start.bat
```

Le navigateur s’ouvre sur [http://localhost:47823](http://localhost:47823).

### Linux / macOS

```bash
chmod +x start.sh
./start.sh
```

Puis ouvrez [http://localhost:47823](http://localhost:47823).

Le port **47823** est volontairement atypique pour limiter les conflits avec d’autres outils.

### Python introuvable

Le serveur local utilise le module standard `http.server`. Installez [Python 3](https://www.python.org/downloads/), puis relancez le script. Sous Windows, l’installateur propose aussi la commande `py`.

## Utilisation

- **Code** : éditez la source Mermaid ; l’aperçu se met à jour automatiquement.
- **Visuel** : pour les *flowcharts* simples (`flowchart TD` / `LR`), glissez des formes, reliez-les, double-cliquez pour renommer, Suppr pour effacer.
- **Ouvrir / Enregistrer** : fichiers `.mmd`, `.md` ou `.txt`.
- **Export** : SVG ou PNG du diagramme rendu.
- **Présenter** : affiche uniquement le diagramme en plein écran (sans code). Raccourci **F8**, **Échap** pour quitter.
- **Thèmes** : interface clair/sombre et thème Mermaid (default, dark, forest, neutral).

Le brouillon est conservé dans le navigateur (`localStorage`). Un rafraîchissement ne perd pas le travail en cours.

Hors-ligne : la librairie Mermaid (v11.16.1) est déjà dans `vendor/mermaid.min.js`. Aucun CDN n’est appelé au runtime.

## Prérequis navigateur

Chrome, Edge ou Firefox récents. L’enregistrement direct sur le disque (sans téléchargement) est disponible dans Chromium ; Firefox utilise un enregistrement par téléchargement.

# Cahier des Charges — DocJourney

**Application de gestion de circuits de validation documentaire**

---

## 1. Présentation du projet

### 1.1 Contexte

Dans le contexte professionnel actuel, la validation de documents (contrats, factures, rapports, procès-verbaux) implique souvent des échanges multiples par email entre différents intervenants. Ce processus est chronophage, difficile à tracer et source d'erreurs.

### 1.2 Objectif

**DocJourney** est une application web de gestion de circuits de validation documentaire. Elle permet de créer des workflows structurés où les documents transitent entre plusieurs participants (relecteurs, validateurs, approbateurs, signataires) avec des fonctionnalités d'annotation, de signature électronique et de traçabilité complète.

### 1.3 Cible utilisateur

- PME et TPE
- Services administratifs
- Cabinets d'avocats et notaires
- Services RH
- Tout professionnel nécessitant une validation documentaire structurée

---

## 2. Périmètre fonctionnel

### 2.1 Gestion documentaire

#### 2.1.1 Types de documents supportés

| Type | Extensions |
|------|------------|
| PDF | `.pdf` |
| Word | `.doc`, `.docx` |
| Excel | `.xls`, `.xlsx` |
| PowerPoint | `.ppt`, `.pptx` |
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` |
| Texte | `.txt`, `.csv`, `.md` |

#### 2.1.2 Import de documents

- Import par glisser-déposer (drag & drop)
- Import par sélecteur de fichiers
- Stockage local en Base64 dans IndexedDB
- Extraction automatique des métadonnées (nom, extension, taille, type MIME)

#### 2.1.3 Métadonnées documentaires

- Nom du document
- Description
- Catégorie
- Tags
- Auteur
- Nombre de pages (si applicable)

#### 2.1.4 Statuts documentaires

| Statut | Description |
|--------|-------------|
| `draft` | Brouillon, aucun workflow démarré |
| `in_progress` | Workflow de validation en cours |
| `completed` | Validation terminée avec succès |
| `rejected` | Document rejeté |
| `archived` | Document archivé |

---

### 2.2 Système de workflow

#### 2.2.1 Concept

Un **workflow** est un circuit de validation composé d'étapes séquentielles. Chaque étape est assignée à un participant avec un rôle défini.

#### 2.2.2 Rôles des participants

| Rôle | Libellé | Capacités |
|------|---------|-----------|
| `reviewer` | Relecteur | Annoter, commenter |
| `validator` | Validateur | Valider ou rejeter |
| `approver` | Approbateur | Approuver ou rejeter avec autorité finale |
| `signer` | Signataire | Signer électroniquement |

#### 2.2.3 Statuts des étapes

| Statut | Description |
|--------|-------------|
| `pending` | En attente de traitement |
| `sent` | Paquet envoyé au participant |
| `completed` | Étape terminée |
| `rejected` | Étape rejetée |
| `skipped` | Étape ignorée |

#### 2.2.4 Décisions possibles

- **Approuvé** (`approved`)
- **Validé** (`validated`)
- **Relu** (`reviewed`)
- **Rejeté** (`rejected`)
- **Modification demandée** (`modification_requested`)

#### 2.2.5 Catégories de rejet

- Document incomplet
- Informations incorrectes
- Non conforme
- Documents manquants
- Non autorisé
- Autre

#### 2.2.6 Modèles de workflow

Possibilité de créer et réutiliser des modèles prédéfinis :

| Modèle | Étapes |
|--------|--------|
| Circuit de signature | Relecteur → Signataire |
| Validation simple | Relecteur → Validateur |
| Validation complète | Relecteur → Validateur → Approbateur → Signataire |

#### 2.2.7 Gestion des délais

- Délai global pour le workflow
- Délais par étape (optionnel)
- Alertes automatiques à l'approche des échéances
- Extension de délai possible

---

### 2.3 Gestion des contacts

#### 2.3.1 Fiche contact

| Champ | Obligatoire | Description |
|-------|-------------|-------------|
| Nom | Oui | Nom complet |
| Email | Oui | Adresse email (unique) |
| Organisation | Non | Entreprise/Structure |
| Téléphone | Non | Numéro de téléphone |
| Département | Non | Service/Direction |
| Notes | Non | Notes internes |

#### 2.3.2 Fonctionnalités contacts

- Création manuelle de contacts
- Enregistrement automatique lors de l'ajout à un workflow
- Recherche par nom, email ou organisation
- Filtrage par favoris et absents
- Tri par nom, dernière utilisation ou nombre de workflows
- Statistiques d'utilisation (rôles joués, nombre de participations)
- Marquage en favori

#### 2.3.3 Gestion des absences

- Définition de période d'absence (date début/fin)
- Désignation d'un remplaçant
- Détection automatique des workflows bloqués
- Réassignation en un clic vers le remplaçant

#### 2.3.4 Groupes de participants

- Création de groupes nommés (ex: "Direction juridique")
- Ajout/suppression de membres
- Utilisation rapide lors de la création de workflow
- Description optionnelle du groupe

---

### 2.4 Signature électronique

#### 2.4.1 Modes de signature

| Mode | Description |
|------|-------------|
| Dessin | Signature manuscrite sur canvas |
| Import | Upload d'image de signature |
| Sauvegardée | Réutilisation d'une signature précédente |

#### 2.4.2 Données de signature

- Image PNG en Base64
- Horodatage précis
- Hash SHA-256 pour intégrité
- Métadonnées (nom, email, navigateur)
- Position sur le document (optionnel)

#### 2.4.3 Paraphes (Initiales)

- Mêmes modes que la signature
- Application multi-pages
- Configuration de pages :
  - Toutes les pages
  - Sélection personnalisée
  - Exclusion première/dernière page
- Position cohérente sur toutes les pages

---

### 2.5 Système d'annotations

#### 2.5.1 Types d'annotations

| Type | Description |
|------|-------------|
| Commentaire | Note textuelle positionnée |
| Surbrillance | Zone mise en évidence |
| Épingle | Point d'attention |

#### 2.5.2 Propriétés

- Position précise (page, coordonnées X/Y)
- Couleur selon le rôle
- Horodatage
- Possibilité de réponse (fil de discussion)
- Visibilité pour tous les participants suivants

---

### 2.6 Paquets de validation (HTML)

#### 2.6.1 Concept

Un **paquet** est un fichier HTML autonome contenant tout le nécessaire pour qu'un participant effectue sa validation sans connexion à l'application.

#### 2.6.2 Contenu du paquet

- Document intégré (Base64)
- Visionneuse de document
- Historique des étapes précédentes
- Toutes les annotations existantes
- Outils d'annotation
- Interface de décision
- Canvas de signature/paraphes
- Génération du fichier retour

#### 2.6.3 Sécurité

- Hash SHA-256 du document
- Hash de la chaîne de validation
- Verrouillage pour signature (étape signataire)
- Métadonnées de traçabilité

---

### 2.7 Fichiers retour

#### 2.7.1 Format

Fichier JSON contenant :
- Identifiants (workflow, étape, document)
- Décision prise
- Commentaire général
- Annotations ajoutées
- Signature (si applicable)
- Paraphes (si applicable)
- Horodatage

#### 2.7.2 Import

- Upload manuel par le propriétaire
- Synchronisation automatique via Firebase (si activé)
- Traitement automatique et avancement du workflow

---

### 2.8 Rapport de validation (CRV)

#### 2.8.1 Contenu

- En-tête avec référence unique (CRV-DJ-XXXXXXXX)
- Informations du document
- Timeline visuelle du workflow
- Détail de chaque étape :
  - Participant et rôle
  - Décision
  - Commentaires
  - Annotations
- Signatures affichées
- Vérification d'intégrité (hash)
- QR Code de référence

#### 2.8.2 Format

- Export PDF généré avec jsPDF
- Design professionnel et épuré
- Police Grand Hotel pour la marque

---

### 2.9 Notifications et rappels

#### 2.9.1 Notifications email

- Envoi via EmailJS
- Template HTML responsive
- Contenu :
  - Nom du document et catégorie
  - Rôle assigné
  - Instructions spécifiques
  - Progression du workflow
  - Lien ou instructions de téléchargement

#### 2.9.2 Système de rappels

| Type | Déclencheur |
|------|-------------|
| Échéance approchante | X jours avant deadline |
| Échéance dépassée | Jour de la deadline |
| Étape en attente | Étape non traitée |

#### 2.9.3 Notifications navigateur

- Demande de permission
- Notifications push pour les rappels
- Activation/désactivation dans les paramètres

---

### 2.10 Intégrations cloud

#### 2.10.1 Google Drive

- Authentification OAuth2
- Upload de documents
- Suivi de progression
- Scope limité aux fichiers créés par l'app

#### 2.10.2 Dropbox

- Authentification OAuth2
- Upload de documents
- Renommage automatique si doublon

#### 2.10.3 Firebase (Synchronisation temps réel)

| Service | Utilisation |
|---------|-------------|
| Realtime Database | Synchronisation des retours |
| Storage | Hébergement des paquets HTML |
| Authentication | Auth anonyme pour participants |

**Avantages de la synchronisation :**
- Lien direct vers le paquet (au lieu de pièce jointe)
- Réception automatique des retours
- Pas besoin d'upload manuel

---

### 2.11 Sauvegarde automatique

#### 2.11.1 Fréquences

- Quotidienne
- Hebdomadaire
- Mensuelle

#### 2.11.2 Fonctionnement

- Utilisation de l'API File System Access
- Sélection d'un dossier de destination
- Création automatique du sous-dossier `DocJourney-Backups`
- Format JSON horodaté
- Fallback vers téléchargement si permission refusée

#### 2.11.3 Données sauvegardées

- Documents
- Workflows
- Contacts
- Paramètres
- Historique d'activité
- Modèles
- Groupes
- Rappels

---

### 2.12 Journal d'activité

#### 2.12.1 Types d'événements

| Catégorie | Événements |
|-----------|------------|
| Document | Import, archivage, export cloud, génération rapport |
| Workflow | Création, démarrage, génération paquet, complétion, rejet |
| Étape | Complétion, saut, réassignation |
| Organisation | Création/modification/suppression templates et groupes |
| Notification | Envoi de rappel |
| Cloud | Connexion/déconnexion providers |

#### 2.12.2 Fonctionnalités

- Affichage chronologique
- Filtrage par période, catégorie, recherche
- Regroupement par date
- Export CSV
- Lien vers les documents/workflows concernés

---

### 2.13 Tableau de bord

#### 2.13.1 Métriques

- Documents importés
- Workflows validés
- Workflows rejetés
- Workflows en cours
- Délai moyen de validation

#### 2.13.2 Widgets

- Activité récente
- Workflows bloqués (absences)
- Échéances à venir (7 jours)
- Actions rapides

---

### 2.14 Paramètres

#### 2.14.1 Profil utilisateur

- Nom du propriétaire
- Email
- Organisation
- Instructions par défaut

#### 2.14.2 Configuration email

- Service ID EmailJS
- Template ID
- Clé publique
- Test d'envoi

#### 2.14.3 Configuration Firebase

- Clé API
- URL de base de données
- ID du projet
- Test de connexion

#### 2.14.4 Préférences

- Rappels activés/désactivés
- Délai par défaut (jours)
- Jours d'avance pour rappel
- Notifications navigateur
- Sauvegarde automatique

---

## 3. Architecture technique

### 3.1 Stack technologique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Framework UI | React | 18.3.1 |
| Routage | React Router | 7.13.0 |
| Langage | TypeScript | 5.5.3 |
| Build | Vite | 5.4.2 |
| CSS | Tailwind CSS | 3.4.1 |
| Base de données | IndexedDB (Dexie) | 4.2.1 |
| Icônes | Lucide React | 0.344.0 |

### 3.2 Librairies principales

| Librairie | Utilisation |
|-----------|-------------|
| date-fns | Manipulation de dates |
| jsPDF | Génération PDF |
| html2canvas | Capture HTML |
| qrcode | Génération QR codes |
| mammoth | Parsing Word |
| pdfjs-dist | Rendu PDF |
| jszip | Gestion ZIP |
| xlsx | Gestion Excel |
| uuid | Génération d'identifiants |
| @emailjs/browser | Envoi d'emails |

### 3.3 Stockage de données

**IndexedDB** avec 11 tables :

1. `documents` — Documents
2. `workflows` — Circuits de validation
3. `validationReports` — Rapports CRV
4. `participants` — Contacts
5. `activityLog` — Journal d'activité
6. `settings` — Paramètres
7. `workflowTemplates` — Modèles de workflow
8. `reminders` — Rappels
9. `documentGroups` — Groupes de documents
10. `cloudConnections` — Connexions cloud
11. `participantGroups` — Groupes de contacts

### 3.4 Architecture applicative

```
┌─────────────────────────────────────────────────────────┐
│                      Interface React                      │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │
│  │  Pages  │ │Components│ │  Hooks  │ │     Utils       │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘ │
│       │           │           │                │          │
│  ┌────┴───────────┴───────────┴────────────────┴────────┐ │
│  │                      Services                          │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │ │
│  │  │  Document    │ │   Workflow   │ │  Participant │  │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘  │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │ │
│  │  │   Activity   │ │   Reminder   │ │    Email     │  │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘  │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │ │
│  │  │   Blockage   │ │  CloudExport │ │ FirebaseSync │  │ │
│  │  └──────────────┘ └──────────────┘ └──────────────┘  │ │
│  └───────────────────────────┬──────────────────────────┘ │
│                              │                            │
│  ┌───────────────────────────┴──────────────────────────┐ │
│  │                  Database (Dexie/IndexedDB)           │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
   │   EmailJS   │     │   Firebase  │     │ Google/     │
   │             │     │  (Realtime  │     │ Dropbox     │
   │             │     │   + Storage)│     │             │
   └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 4. Sécurité

### 4.1 Intégrité documentaire

- Hash SHA-256 du document original
- Hash de la chaîne de validation (document + réponses)
- Verrouillage du document à l'étape de signature
- Vérification d'intégrité dans le rapport CRV

### 4.2 Traçabilité

- Horodatage de chaque action
- Capture du User-Agent lors des signatures
- Journal d'activité complet
- Rapport de validation détaillé

### 4.3 Isolation des données

- Stockage local uniquement (pas de serveur backend)
- Channel ID hashé (SHA-256 de l'email) pour Firebase
- Authentification anonyme pour les participants externes

### 4.4 Protection des credentials

- Tokens OAuth stockés localement
- Expiration des tokens gérée
- Pas de stockage de mots de passe

---

## 5. Parcours utilisateur type

### 5.1 Création d'un workflow

```
1. Importer un document (drag & drop ou sélection)
           ↓
2. Renseigner les métadonnées (catégorie, description)
           ↓
3. Créer le workflow :
   - Nommer le circuit
   - Ajouter les participants avec leurs rôles
   - Définir les instructions par étape
   - Fixer une deadline (optionnel)
   - Ou utiliser un modèle existant
           ↓
4. Le système génère le premier paquet
           ↓
5. Envoi de l'email au premier participant
```

### 5.2 Validation par un participant

```
1. Réception de l'email avec le paquet HTML
           ↓
2. Ouverture du fichier dans le navigateur
           ↓
3. Consultation du document et des annotations précédentes
           ↓
4. Ajout d'annotations si nécessaire
           ↓
5. Signature/Paraphes si rôle signataire
           ↓
6. Prise de décision (approuver/rejeter/etc.)
           ↓
7. Téléchargement du fichier retour
   (ou synchronisation automatique via Firebase)
           ↓
8. Envoi du fichier retour au propriétaire
```

### 5.3 Traitement d'un retour

```
1. Réception du fichier retour (upload ou sync auto)
           ↓
2. Traitement automatique par le système
           ↓
3. Si APPROUVÉ et étapes restantes :
   → Génération du paquet suivant
   → Envoi à l'étape suivante
           ↓
4. Si APPROUVÉ et dernière étape :
   → Workflow terminé
   → Génération du rapport CRV
   → Document marqué comme complété
           ↓
5. Si REJETÉ :
   → Workflow arrêté
   → Document marqué comme rejeté
```

---

## 6. Interfaces principales

### 6.1 Pages de l'application

| Route | Page | Description |
|-------|------|-------------|
| `/` | Tableau de bord | Vue d'ensemble et actions rapides |
| `/new` | Nouveau document | Import et création de workflow |
| `/documents` | Documents | Liste de tous les documents |
| `/document/:id` | Détail document | Suivi du workflow |
| `/contacts` | Contacts | Annuaire et groupes |
| `/activity` | Activité | Journal des événements |
| `/archives` | Archives | Documents archivés |
| `/groups/:id` | Groupe de documents | Vue d'un groupe |
| `/settings` | Paramètres | Configuration |

### 6.2 Composants clés

- **Sidebar** — Navigation latérale
- **JourneyTracker** — Visualisation du workflow
- **ParticipantPicker** — Sélection de contacts
- **ParticipantCard** — Fiche contact détaillée
- **AbsenceManager** — Gestion des absences
- **BlockageAlert** — Alerte workflows bloqués

---

## 7. Contraintes et prérequis

### 7.1 Navigateurs supportés

- Chrome (recommandé)
- Firefox
- Edge
- Safari

### 7.2 Prérequis techniques

- Navigateur moderne avec support IndexedDB
- JavaScript activé
- Pour les fonctionnalités cloud : connexion Internet

### 7.3 Limitations

- Stockage local limité par le navigateur (~50-100 MB typique)
- Pas de mode hors-ligne pour les fonctionnalités cloud
- Taille des paquets HTML proportionnelle au document

---

## 8. Évolutions futures possibles

- Mode collaboratif multi-utilisateurs
- Application mobile native
- Intégration avec d'autres clouds (OneDrive, Box)
- Signature électronique qualifiée (eIDAS)
- OCR pour extraction de données
- Templates de documents
- API REST pour intégration tierce
- Statistiques et tableaux de bord avancés

---

## 9. Glossaire

| Terme | Définition |
|-------|------------|
| **Workflow** | Circuit de validation composé d'étapes |
| **Étape** | Action d'un participant dans le workflow |
| **Paquet** | Fichier HTML autonome de validation |
| **Retour** | Fichier JSON contenant la réponse d'un participant |
| **CRV** | Compte-Rendu de Validation (rapport final) |
| **Paraphe** | Initiales apposées sur les pages |
| **IndexedDB** | Base de données intégrée au navigateur |

---

**Document rédigé le** : Février 2026
**Version** : 1.0
**Application** : DocJourney v0.0.0

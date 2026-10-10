# Royeel — boutique en ligne

Site de la marque Royeel (manteau « Le Manteau Perle », 1 500 DH) : boutique en
français et en arabe, panneau d’administration, base de données Supabase,
hébergement Netlify.

## Ce qu’il y a dedans

- **Boutique** (`/fr`, `/ar`, langue choisie selon le téléphone) : intro animée,
  photos en arche, détails zoomables, carrousel 3D (ou modèle 3D `.glb`),
  tailles avec stock, commande sans compte, page de remerciement.
- **Paiements** : à la livraison, virement, WhatsApp, carte CMI (prête, activée
  quand les clés CMI existent).
- **Admin** (`/admin`) : tableau de bord, commandes (statuts, WhatsApp en un clic,
  export Excel), produit (textes FR/AR, prix, tailles, stock, photos, 3D),
  clientes, réglages (paiements, notifications, pixels Meta/TikTok).
- **Publicité** : pixels Meta et TikTok + envoi serveur des achats (API
  Conversions / Events API) ; source de chaque commande enregistrée.

## Démarrer en local

```bash
npm install
cp .env.example .env.local   # puis remplir les clés Supabase
npm run dev
```

Sans clés Supabase, la boutique s’affiche en mode aperçu (données d’exemple).

## Base de données (Supabase)

Les migrations sont dans `supabase/migrations/` (schéma, sécurité RLS, stock,
fonctions de commande, premier manteau). Pour les tester sans Supabase :

```bash
npm run test:db
```

Créer le compte admin (après avoir rempli `.env.local`) :

```bash
npm run create-admin -- vous@exemple.com "un-mot-de-passe-long"
```

## Vérifications

```bash
npm run typecheck && npm run lint && npm run build
```

## Mise en ligne (Netlify)

Ajouter les variables de `.env.example` dans Netlify (Site configuration →
Environment variables), avec `NEXT_PUBLIC_SITE_URL=https://royeel.com`.

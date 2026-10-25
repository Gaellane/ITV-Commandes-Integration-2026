# Commandes de repas · I Meet You 2026

Petit système de commandes pour la vente de repas : les étudiants remplissent un formulaire,
tu suis les commandes sur une page admin et tu télécharges un fichier Excel.

- `/` : formulaire de commande (nom et prénoms, ETU, plats et quantités, total calculé automatiquement)
- `/admin.html` : liste des commandes, quantités à préparer, montant total, bouton « Télécharger l'Excel »

Prix : 10.000 Ar par plat (sur commande). Pour changer le menu ou le prix : `lib/menu.js`.

## Lancer en local (sur ton ordinateur)

1. Installe Node.js (version 18 ou plus) : https://nodejs.org
2. Dans le dossier du projet, ouvre un terminal et lance :
   ```
   npm install
   npm start
   ```
3. Ouvre http://localhost:3000 (formulaire) et http://localhost:3000/admin.html (admin, mot de passe demandé à chaque visite). Avant de lancer : copie `.env.example` en `.env` et mets ton mot de passe dans `ADMIN_PASSWORD`.

Les commandes sont enregistrées dans le dossier `data/` :
- `data/orders.json` : les commandes (c'est la vraie base, à ne pas supprimer)
- `data/commandes.xlsx` : l'Excel, mis à jour automatiquement à chaque commande.
  Si ce fichier est ouvert dans Excel, Windows le verrouille : la commande est quand même enregistrée,
  et tu peux toujours télécharger un Excel à jour depuis la page admin.

Changer le mot de passe : modifie `ADMIN_PASSWORD` dans le fichier `.env` (jamais commité) puis relance `npm start`.

Pour tester depuis un téléphone connecté au même Wi-Fi : remplace `localhost` par l'adresse IP de ton ordinateur
(par exemple http://192.168.1.20:3000). Pour repartir de zéro, arrête le serveur et supprime le dossier `data/`.

## Pourquoi l'Excel est généré à la demande (sur Vercel)

Vercel n'a pas de disque permanent : un fichier Excel ne peut pas y être « mis à jour » commande par commande.
Les commandes sont donc gardées dans une petite base (Upstash Redis) et le fichier `.xlsx` est fabriqué
à jour à chaque clic sur « Télécharger l'Excel » (feuille « Commandes » + feuille « Récap »).

## Mise en ligne (≈ 10 minutes)

1. Mets le dossier sur GitHub (ou lance `npx vercel` dans le dossier).
2. Sur vercel.com : **Add New → Project** → importe le dépôt → **Deploy**.
3. Dans le projet : onglet **Storage** → **Upstash Redis** (gratuit) → crée la base et connecte-la au projet.
   Vercel ajoute tout seul les variables `KV_REST_API_URL` et `KV_REST_API_TOKEN`.
4. Onglet **Settings → Environment Variables** : ajoute `ADMIN_PASSWORD` avec ton mot de passe.
5. **Deployments → Redeploy** pour que les variables soient prises en compte.
6. Teste : passe une commande, ouvre `/admin.html`, télécharge l'Excel, puis clique sur **Tout effacer**
   pour supprimer tes commandes de test avant de partager le lien.

Le lien du projet est celui à partager (remplace le lien Forms). Ta page admin : `ton-lien.vercel.app/admin.html`.

## Fermer les commandes

Ajoute la variable `ORDERS_CLOSED=1` puis redéploie : le formulaire affiche que les commandes sont closes.

## Sécurité

- Le total est toujours recalculé côté serveur (impossible de le falsifier depuis le navigateur).
- L'admin et l'Excel sont protégés par `ADMIN_PASSWORD` (envoyé en en-tête, jamais dans l'URL).
- Les noms saisis sont affichés comme du texte simple dans la page admin.

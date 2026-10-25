// Menu et prix : seule source de vérité (le formulaire et l'Excel s'y réfèrent).
const PRICE = 10000; // Ar, prix "sur commande" pour chaque plat

const DISHES = [
  { id: 'spaghetti', name: 'Spaghetti à la sauce bolognaise' },
  { id: 'brochettes', name: 'Brochettes de poulet & frites' },
  { id: 'riz', name: "Riz + hen'omby ritra & légumes sautés" },
];

// Classes proposées dans le formulaire. Si "Autre", le paiement se fait obligatoirement par Orange Money.
const CLASSES = ['P-17A', 'P-17B', 'P-18A', 'P-18B', 'P-19A', 'P-19B', 'P-20A', 'P-20B', 'DSP4', 'DSP5', 'DSP6', 'DSP7', 'DLA-P1'];
const OTHER_CLASS = 'Autre';

module.exports = { PRICE, DISHES, CLASSES, OTHER_CLASS };

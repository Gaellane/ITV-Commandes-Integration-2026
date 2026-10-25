const ExcelJS = require('exceljs');
const { PRICE, DISHES } = require('./menu');

const fmtDate = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Indian/Antananarivo',
});

const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF141A52' } };

// Construit le fichier Excel (Buffer) à partir de la liste des commandes.
async function buildWorkbook(orders) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'IT-Volunteers';

  // ---- Feuille 1 : une ligne par commande ----
  const ws = wb.addWorksheet('Commandes', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Réf', key: 'ref', width: 10 },
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Nom et prénoms', key: 'nom', width: 34 },
    { header: 'ETU', key: 'etu', width: 14 },
    { header: 'Classe', key: 'classe', width: 12 },
    { header: 'Contact', key: 'contact', width: 18 },
    ...DISHES.map((d) => ({ header: d.name, key: d.id, width: 24 })),
    { header: 'Total à payer (Ar)', key: 'total', width: 20 },
    { header: 'Statut', key: 'statut', width: 14 },
  ];

  const sums = Object.fromEntries(DISHES.map((d) => [d.id, 0]));
  let grand = 0;
  for (const o of orders) {
    const row = { ref: o.ref, date: fmtDate.format(new Date(o.createdAt)), nom: o.nom, etu: o.etu, classe: o.classe || '', contact: o.contact || '', total: o.total, statut: o.confirmed ? 'Confirmée' : 'En attente' };
    for (const d of DISHES) {
      const it = (o.items || []).find((i) => i.id === d.id);
      row[d.id] = it ? it.qty : 0;
      sums[d.id] += row[d.id];
    }
    grand += o.total;
    ws.addRow(row);
  }

  ws.addRow({ nom: 'TOTAL', total: grand, ...sums }).font = { bold: true };

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.height = 34;
  header.eachCell((c) => { c.fill = headerFill; });
  ws.getColumn('total').numFmt = '#,##0';

  // ---- Feuille 2 : récap pour préparer les plats ----
  const rc = wb.addWorksheet('Récap');
  rc.columns = [
    { header: 'Plat', key: 'plat', width: 42 },
    { header: 'Quantité à préparer', key: 'qty', width: 22 },
    { header: 'Montant (Ar)', key: 'amount', width: 18 },
  ];
  for (const d of DISHES) rc.addRow({ plat: d.name, qty: sums[d.id], amount: sums[d.id] * PRICE });
  rc.addRow({
    plat: `TOTAL (${orders.length} commande${orders.length > 1 ? 's' : ''})`,
    qty: Object.values(sums).reduce((a, b) => a + b, 0),
    amount: grand,
  }).font = { bold: true };
  const rh = rc.getRow(1);
  rh.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  rh.eachCell((c) => { c.fill = headerFill; });
  rc.getColumn('amount').numFmt = '#,##0';

  return Buffer.from(await wb.xlsx.writeBuffer());
}

module.exports = { buildWorkbook };

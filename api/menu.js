const { PRICE, DISHES, CLASSES, OTHER_CLASS } = require('../lib/menu');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ price: PRICE, dishes: DISHES, classes: CLASSES, otherClass: OTHER_CLASS, closed: process.env.ORDERS_CLOSED === '1' });
};

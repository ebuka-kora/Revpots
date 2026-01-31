import express from 'express';
import Product from '../models/Product.js';
import Invoice from '../models/Invoice.js';

const router = express.Router();

// Full sync - get all data
router.get('/all', async (req, res) => {
  try {
    const products = await Product.find();
    const invoices = await Invoice.find().populate('items.productId');
    
    res.json({
      products,
      invoices,
      syncedAt: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Push sync - upload local data
router.post('/push', async (req, res) => {
  try {
    const { products, invoices, deviceId } = req.body;
    
    // Sync products
    const productResults = [];
    for (const productData of products) {
      const query = productData._id 
        ? { _id: productData._id }
        : { name: productData.name, deviceId: productData.deviceId || deviceId };
      
      const product = await Product.findOneAndUpdate(
        query,
        { ...productData, deviceId: productData.deviceId || deviceId, syncedAt: new Date() },
        { new: true, upsert: true }
      );
      productResults.push(product);
    }
    
    // Sync invoices
    const invoiceResults = [];
    for (const invoiceData of invoices) {
      const query = invoiceData._id 
        ? { _id: invoiceData._id }
        : { createdAt: invoiceData.createdAt, deviceId: invoiceData.deviceId || deviceId };
      
      const invoice = await Invoice.findOneAndUpdate(
        query,
        { ...invoiceData, deviceId: invoiceData.deviceId || deviceId, syncedAt: new Date() },
        { new: true, upsert: true }
      );
      invoiceResults.push(invoice);
    }
    
    res.json({
      success: true,
      products: productResults,
      invoices: invoiceResults
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

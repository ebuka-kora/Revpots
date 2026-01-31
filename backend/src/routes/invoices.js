import express from 'express';
import Invoice from '../models/Invoice.js';

const router = express.Router();

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('items.productId')
      .sort({ createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get invoice by ID
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('items.productId');
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    const invoice = new Invoice(req.body);
    await invoice.save();
    res.status(201).json(invoice);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk sync
router.post('/sync', async (req, res) => {
  try {
    const { invoices, deviceId } = req.body;
    const results = [];

    for (const invoiceData of invoices) {
      if (invoiceData._id) {
        const invoice = await Invoice.findByIdAndUpdate(
          invoiceData._id,
          { ...invoiceData, syncedAt: new Date(), deviceId },
          { new: true, upsert: true }
        );
        results.push(invoice);
      } else {
        const invoice = new Invoice({ ...invoiceData, deviceId });
        await invoice.save();
        results.push(invoice);
      }
    }

    res.json({ success: true, invoices: results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get one product by id (MongoDB _id)
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Create product (validate required fields)
router.post('/', async (req, res) => {
  try {
    const { name, costPrice, sellingPrice, quantity, lowStockLevel } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Product name is required' });
    }
    if (typeof costPrice !== 'number' || costPrice < 0) {
      return res.status(400).json({ error: 'Valid costPrice is required' });
    }
    if (typeof sellingPrice !== 'number' || sellingPrice < 0) {
      return res.status(400).json({ error: 'Valid sellingPrice is required' });
    }
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }
    const product = new Product({
      name: name.trim(),
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      quantity: Math.floor(Number(quantity)),
      lowStockLevel: typeof lowStockLevel === 'number' ? Math.floor(lowStockLevel) : 5,
    });
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update product (partial update allowed)
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    delete updates._id;
    delete updates.createdAt;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid product id' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk sync
router.post('/sync', async (req, res) => {
  try {
    const { products, deviceId } = req.body;
    const results = [];

    for (const productData of products) {
      if (productData._id) {
        // Update existing
        const product = await Product.findByIdAndUpdate(
          productData._id,
          { ...productData, syncedAt: new Date(), deviceId },
          { new: true, upsert: true }
        );
        results.push(product);
      } else {
        // Create new
        const product = new Product({ ...productData, deviceId });
        await product.save();
        results.push(product);
      }
    }

    res.json({ success: true, products: results });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;

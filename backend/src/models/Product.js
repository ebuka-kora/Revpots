import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  costPrice: { type: Number, required: true, min: 0 },
  sellingPrice: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0 },
  lowStockLevel: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  syncedAt: { type: Date },
  deviceId: { type: String }
}, {
  timestamps: true
});

productSchema.index({ name: 1 });
productSchema.index({ deviceId: 1 });

export default mongoose.model('Product', productSchema);

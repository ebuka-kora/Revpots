import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  totalAmount: { type: Number, required: true, min: 0 },
  totalItems: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now },
  syncedAt: { type: Date },
  deviceId: { type: String },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  }]
}, {
  timestamps: true
});

invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ deviceId: 1 });

export default mongoose.model('Invoice', invoiceSchema);

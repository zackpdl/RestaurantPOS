import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
  id: String,
  type: {
    type: String,
    enum: ['dine-in', 'takeaway'],
    required: true
  },
  tableNumber: String,
  items: [{
    id: String,
    name: String,
    price: Number,
    quantity: Number,
    category: String
  }],
  total: Number,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const existingOrderModel =
  (mongoose as unknown as { models?: Record<string, unknown> }).models?.Order ??
  null;

export default existingOrderModel || mongoose.model('Order', OrderSchema);

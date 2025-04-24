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

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
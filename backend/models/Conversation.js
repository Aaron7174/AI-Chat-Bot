const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['user', 'bot'], required: true },
    text: { type: String, required: true, maxlength: 10000 },
    time: { type: String, required: true },
    response: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true },
);

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 80 },
    messages: { type: [chatMessageSchema], default: [] },
    context: {
      lastIntent: { type: String, default: null },
      department: { type: String, default: null },
      employee: {
        id: { type: String, default: null },
        name: { type: String, default: null },
      },
    },
  },
  { timestamps: true },
);

conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, title: 1 });
conversationSchema.index({ userId: 1, 'messages.text': 1 });

module.exports = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

import { model, Schema } from 'mongoose';

const email = {
  type: String,
  required: true,
  trim: true,
  lowercase: true,
  match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

export const User = model('User', new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { ...email, unique: true },
  phone: { type: String, required: true, trim: true },
}, { timestamps: true, versionKey: false }));

export const Teacher = model('Teacher', new Schema({
  fullName: { type: String, required: true, trim: true },
  email,
  specialization: { type: String, required: true, trim: true },
  experience: { type: Number, required: true, min: 0 },
}, { timestamps: true, versionKey: false }));

export const SessionStatus = {
  available: 'AVAILABLE',
  booked: 'BOOKED',
  completed: 'COMPLETED',
} as const;

const sessionSchema = new Schema({
  teacherId: { type: Schema.Types.ObjectId, required: true, ref: 'Teacher' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: {
    type: String,
    enum: Object.values(SessionStatus),
    default: SessionStatus.available,
    required: true,
  },
  completedAt: { type: Date, default: null },
}, { timestamps: true, versionKey: false });

sessionSchema.index({ status: 1, startTime: 1, _id: 1 });
sessionSchema.index({ userId: 1 });

export const Session = model('Session', sessionSchema);

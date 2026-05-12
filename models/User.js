const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  role: { type: String, enum: ['admin', 'client', 'freelancer'], default: 'client' },
  
  // Avatar - stored as Buffer in MongoDB
  avatar: { type: Buffer },
  avatarContentType: { type: String },
  googleAvatar: { type: String }, // Google profile pic URL
  
  // Google OAuth
  googleId: { type: String },
  
  // Email Verification OTP
  otp: { type: String },
  otpExpiry: { type: Date },
  isVerified: { type: Boolean, default: false },
  
  // Profile
  bio: { type: String, maxlength: 500 },
  location: { type: String },
  phone: { type: String },
  website: { type: String },
  
  // Freelancer specific
  skills: [{ type: String }],
  hourlyRate: { type: Number },
  portfolio: [{
    title: String,
    description: String,
    link: String
  }],
  availability: { type: String, enum: ['available', 'busy', 'not_available'], default: 'available' },
  
  // Client specific
  company: { type: String },
  industry: { type: String },
  
  // Stats
  totalEarnings: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  completedProjects: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  
  // Account status
  isActive: { type: Boolean, default: true },
  isBanned: { type: Boolean, default: false },
  
  // Password reset
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Date },
  
  lastLogin: { type: Date },
  payoutMethod: { type: String, enum: ['upi', 'bank'] },
  payoutDetails: {
    method:        String,
    upiId:         String,
    accountName:   String,
    accountNumber: String,
    ifsc:          String,
    bankName:      String
  }
}, { timestamps: true });

// Virtual: get avatar URL
userSchema.virtual('avatarUrl').get(function() {
  if (this.googleAvatar) return this.googleAvatar;
  if (this.avatar) return `/avatar/${this._id}`;
  return '/images/default-avatar.png';
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
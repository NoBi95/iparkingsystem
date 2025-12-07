// pages/api/admin-login.js
import { connectToMongo } from '../../lib/mongo';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    // Connect to MongoDB
    const { db } = await connectToMongo();

    // Find an active admin with the given username
    const admin = await db.collection('admins').findOne({ username, status: 'Active' });

    if (!admin) {
      // Admin not found or inactive
      return res.status(401).json({ success: false, message: 'Admin not found or inactive' });
    }

    // Check password (plain-text)
    if (password !== admin.password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    // Success: return admin details
    res.status(200).json({
      success: true,
      admin: {
        _id: admin._id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

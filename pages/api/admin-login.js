// pages/api/admin-login.js
import { connectToDatabase } from '../../lib/db';
import bcrypt from 'bcryptjs'; // for hashed passwords

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { username, password } = req.body;

  try {
    const connection = await connectToDatabase();

    // fetch admin from database
    const [rows] = await connection.execute(
      'SELECT * FROM admin WHERE Username = ? AND Status = "Active"',
      [username]
    );

    await connection.end();

    if (rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Admin not found or inactive' });
    }

    const admin = rows[0];

    // check password
   // check password
const isValid = password === admin.Password; // compare plain text directly
if (!isValid) {
  return res.status(401).json({ success: false, message: 'Incorrect password' });
}

    // optionally, you can include role type in response
    res.status(200).json({ 
      success: true, 
      message: 'Login successful', 
      admin: {
        AdminID: admin.AdminID,
        Username: admin.Username,
        RoleType: admin.RoleType
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

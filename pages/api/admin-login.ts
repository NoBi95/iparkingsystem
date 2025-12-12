import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongo";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { username, password } = req.body as { username: string; password: string };

  try {
    const client = await clientPromise;
    const db = client.db("park");

    // Find admin by username
    const admin = await db.collection("admins").findOne({ username });
    if (!admin) {
      return res.status(401).json({ success: false, message: "Admin not found or inactive" });
    }

    // 1️⃣ Check if role is allowed
    const allowedRoles = ["SuperAdmin", "Moderator"];
    if (!allowedRoles.includes(admin.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: insufficient role",
      });
    }

    // 2️⃣ Check password
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    // ✅ Login success
    return res.status(200).json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("MongoDB Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

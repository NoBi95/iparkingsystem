import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongo";
import bcrypt from "bcryptjs";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { username, password } = req.body as { username: string; password: string };

  console.log("LOGIN BODY:", { username });

  try {
    const client = await clientPromise;

    // 👇 VERY IMPORTANT: use the correct DB name here
    const db = client.db("park");
    console.log("DB NAME FROM CODE:", db.databaseName);

    // 1) Show all collections in this DB
    const collections = await db.listCollections().toArray();
    console.log("COLLECTIONS IN DB:", collections.map((c) => c.name));

    // 2) Show up to 10 docs from the "admin" collection
    const allAdmins = await db.collection("admin").find().limit(10).toArray();
    console.log("ADMINS FROM CODE:", allAdmins);

    // 3) Username-only query
    const admin = await db.collection("admins").findOne({ username });
    console.log("FOUND ADMIN (username only):", admin);

    if (!admin) {
      console.log("RESULT: NO ADMIN MATCHED QUERY (username only)");
      return res.status(401).json({
        success: false,
        message: "Admin not found or inactive",
      });
    }

    // 4) If that works, test password
    const valid = await bcrypt.compare(password, admin.password);
    console.log("PASSWORD VALID?", valid);

    if (!valid) {
      console.log("RESULT: PASSWORD MISMATCH");
      return res.status(401).json({ success: false, message: "Incorrect password" });
    }

    console.log("RESULT: LOGIN OK");

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

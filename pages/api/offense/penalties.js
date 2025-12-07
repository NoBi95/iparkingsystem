import { connectToDatabase } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const db = await connectToDatabase();

    // Exclude "Expired Registration" penalty
    const [penalties] = await db.execute(
      "SELECT PenaltyID, PenaltyType, Amount FROM penalty WHERE LOWER(TRIM(PenaltyType)) != 'expired registration'"
    );

    await db.end();

    res.status(200).json(penalties);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
}

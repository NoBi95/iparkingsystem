import { connectToDatabase } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { vehicleID, penaltyID } = req.body;

  if (!vehicleID) return res.status(400).json({ success: false, message: "Missing vehicleID" });
  if (!penaltyID) return res.status(400).json({ success: false, message: "Missing penaltyID" });

  const db = await connectToDatabase();

  try {
    // Check if vehicle exists
    const [vehicles] = await db.execute(
      "SELECT VehicleID, Status FROM vehicle WHERE VehicleID = ?",
      [vehicleID]
    );
    if (!vehicles.length) return res.status(404).json({ success: false, message: "Vehicle not found" });

    // Check if penalty exists
    const [penalties] = await db.execute(
      "SELECT PenaltyID, PenaltyType FROM penalty WHERE PenaltyID = ?",
      [penaltyID]
    );
    if (!penalties.length) return res.status(404).json({ success: false, message: "Penalty not found" });

    // Insert offense
    await db.execute(
      "INSERT INTO offensetable (VehicleID, Status, OffenseDate, PenaltyID) VALUES (?, 'Pending', NOW(), ?)",
      [vehicleID, penaltyID]
    );

    return res.status(200).json({
      success: true,
      message: `Offense recorded for vehicle ${vehicleID} with penalty "${penalties[0].PenaltyType}"`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  } finally {
    await db.end();
  }
}

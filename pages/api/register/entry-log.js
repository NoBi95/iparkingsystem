// /pages/api/register/entry-log.js
import { connectToDatabase } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { vehicleID } = req.body;

  if (!vehicleID)
    return res.status(400).json({ success: false, message: "Missing vehicleID" });

  const db = await connectToDatabase();

  try {
    // 1. Get vehicle info
    const [vehicles] = await db.execute(
      "SELECT VehicleType, Status FROM vehicle WHERE VehicleID = ?",
      [vehicleID]
    );

    if (!vehicles.length)
      return res.status(404).json({ success: false, message: "Vehicle not found" });

    const { VehicleType, Status } = vehicles[0];

    // 2. Check vehicle status
    if (Status !== "Active") {
      await db.execute(
        'INSERT INTO offensetable (VehicleID, Status, OffenseDate, PenaltyID) VALUES (?, "Pending", NOW(), 2)',
        [vehicleID]
      );
      return res
        .status(400)
        .json({ success: false, message: "Vehicle expired! Offense logged." });
    }

    // 3. Check for active entry (vehicle already parked)
    const [activeEntries] = await db.execute(
      "SELECT EntryID, SlotID FROM entry_log WHERE VehicleID = ? AND ExitTime IS NULL LIMIT 1",
      [vehicleID]
    );

    if (activeEntries.length > 0) {
      const { EntryID, SlotID } = activeEntries[0];

      await db.execute("UPDATE entry_log SET ExitTime = NOW() WHERE EntryID = ?", [EntryID]);
      await db.execute("UPDATE parking_slot SET Status = 'Available' WHERE SlotID = ?", [SlotID]);

      return res.status(200).json({
        success: true,
        message: "Exit logged successfully",
        slotID: SlotID,
      });
    }

    // 4. Assign parking slot for new entry
    const [slots] = await db.execute(
      "SELECT SlotID FROM parking_slot WHERE SlotType = ? AND Status = 'Available' LIMIT 1",
      [VehicleType]
    );

    if (!slots.length)
      return res.status(400).json({ success: false, message: "No available slot" });

    const slotID = slots[0].SlotID;

    await db.execute("INSERT INTO entry_log (VehicleID, SlotID, EntryTime) VALUES (?, ?, NOW())", [
      vehicleID,
      slotID,
    ]);

    await db.execute("UPDATE parking_slot SET Status = 'Occupied' WHERE SlotID = ?", [slotID]);

    return res.status(200).json({
      success: true,
      message: "Entry logged successfully",
      slotID,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  } finally {
    await db.end();
  }
}

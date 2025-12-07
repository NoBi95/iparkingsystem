// pages/api/visitor-exit.js
console.log('TEST:', require.resolve('../../../lib/db'));
import { connectToDatabase } from "../../../lib/db";



export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { plateNumber } = req.body;
  if (!plateNumber) {
    return res.status(400).json({ success: false, message: "Plate Number is required" });
  }

  const db = await connectToDatabase();

  try {
    await db.beginTransaction();

    // 1. Find visitor vehicle
    const [vehicles] = await db.execute(
      "SELECT VisitorVehicleID FROM visitor_vehicle WHERE PlateNumber = ?",
      [plateNumber]
    );

    if (vehicles.length === 0) {
      await db.rollback();
      return res.status(404).json({ success: false, message: "Visitor vehicle not found" });
    }

    const visitorId = vehicles[0].VisitorVehicleID;

    // 2. Find active entry log
    const [entries] = await db.execute(
      "SELECT EntryID, SlotID FROM entry_log WHERE VisitorVehicleID = ? AND ExitTime IS NULL ORDER BY EntryTime DESC LIMIT 1",
      [visitorId]
    );

    if (entries.length === 0) {
      await db.rollback();
      return res.status(400).json({ success: false, message: "No active entry found for this vehicle" });
    }

    const entryId = entries[0].EntryID;
    const slotId = entries[0].SlotID;

    // 3. Update ExitTime
    await db.execute(
      "UPDATE entry_log SET ExitTime = NOW() WHERE EntryID = ?",
      [entryId]
    );

    // 4. Free the parking slot
    await db.execute(
      "UPDATE parking_slot SET Status = 'Available' WHERE SlotID = ? AND SlotType = 'Visitor'",
      [slotId]
    );

    await db.commit();

    return res.status(200).json({ success: true, message: "Visitor exit recorded and slot freed!" });
  } catch (err) {
    await db.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

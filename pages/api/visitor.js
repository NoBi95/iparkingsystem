import { connectToDatabase } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { plateNumber, vehicleType, companyName, driverName, purpose, recordedBy } = req.body;

  if (!plateNumber || !vehicleType) {
    return res.status(400).json({ success: false, message: 'Plate Number and Vehicle Type are required' });
  }

  const db = await connectToDatabase();

  try {
    await db.beginTransaction();

    // 1. Insert visitor_vehicle
    const [insertResult] = await db.execute(
      `INSERT INTO visitor_vehicle (PlateNumber, VehicleType, CompanyName, DriverName, Purpose, RecordedBy)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [plateNumber, vehicleType, companyName, driverName, purpose, recordedBy]
    );

    const visitorVehicleID = insertResult.insertId;

    // 2. Find an available Visitor slot
    const [slots] = await db.execute(
      `SELECT SlotID FROM parking_slot 
       WHERE SlotType = 'Visitor' AND Status = 'Available' 
       LIMIT 1 FOR UPDATE` // locks the row
    );

    if (slots.length === 0) {
      await db.rollback();
      return res.status(400).json({ success: false, message: 'No available visitor parking slots' });
    }

    const slotID = slots[0].SlotID;

    // 3. Insert into entry_log with assigned slot
    await db.execute(
      `INSERT INTO entry_log (VisitorVehicleID, SlotID, EntryTime)
       VALUES (?, ?, NOW())`,
      [visitorVehicleID, slotID]
    );

    // 4. Update parking_slot to Occupied
    await db.execute(
      `UPDATE parking_slot 
       SET Status = 'Occupied' 
       WHERE SlotID = ? AND SlotType = 'Visitor'`,
      [slotID]
    );

    await db.commit();

    return res.status(200).json({ success: true, message: 'Visitor vehicle recorded and slot assigned!' });
  } catch (err) {
    await db.rollback();
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

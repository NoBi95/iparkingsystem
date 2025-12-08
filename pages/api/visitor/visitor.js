// pages/api/visitor.js
import { connectToDatabase } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { action, plateNumber, vehicleType, companyName, driverName, purpose, recordedBy } = req.body;
  if (!action) return res.status(400).json({ success: false, message: 'Action is required' });

  const db = await connectToDatabase();
  const visitorCollection = db.collection('visitor_vehicle');
  const slotCollection = db.collection('parking_slot');
  const entryCollection = db.collection('entry_log');

  try {
    if (action === 'entry') {
      if (!plateNumber || !vehicleType) {
        return res.status(400).json({ success: false, message: 'Plate Number and Vehicle Type are required' });
      }

      // Insert visitor vehicle
      const visitor = await visitorCollection.insertOne({
        plate: plateNumber,
        type: vehicleType,
        company: companyName || '',
        driver: driverName || '',
        purpose: purpose || '',
        recordedBy,
        createdAt: new Date(),
        isActive: 1
      });

      // Find available visitor slot
      const slot = await slotCollection.findOne({ type: 'Visitor', status: 'Available' });
      if (!slot) {
        return res.status(400).json({ success: false, message: 'No available visitor parking slots' });
      }

      // Create entry log
      await entryCollection.insertOne({
        visitorId: visitor.insertedId,
        slotId: slot._id,
        plate: plateNumber,
        entryTime: new Date(),
        exitTime: null
      });

      // Update slot status
      await slotCollection.updateOne({ _id: slot._id }, { $set: { status: 'Occupied' } });

      return res.status(200).json({ success: true, message: 'Visitor vehicle recorded and slot assigned!' });
    }

    if (action === 'exit') {
      if (!plateNumber) return res.status(400).json({ success: false, message: 'Plate Number is required' });

      // Find active entry
      const entry = await entryCollection.findOne({ plate: plateNumber, exitTime: null });
      if (!entry) return res.status(400).json({ success: false, message: 'No active entry found for this vehicle' });

      // Update exitTime
      await entryCollection.updateOne({ _id: entry._id }, { $set: { exitTime: new Date() } });

      // Free the slot
      await slotCollection.updateOne({ _id: entry.slotId }, { $set: { status: 'Available' } });

      return res.status(200).json({ success: true, message: 'Visitor exit recorded and slot freed!' });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

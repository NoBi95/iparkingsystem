import { connectToMongo } from '../../lib/mongo';
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { vehicleID } = req.body;

  if (!vehicleID) return res.status(400).json({ message: "vehicleID required" });

  try {
    const client = await clientPromise;
    const db = client.db("park");

    // 1️⃣ Find the vehicle by its _id
    const vehicle = await db.collection("vehicles").findOne({
      _id: new ObjectId(vehicleID),
    });

    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    // 2️⃣ Find the user info for this vehicle
    const user = await db.collection("users").findOne({
      _id: new ObjectId(vehicle.userID),
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // 3️⃣ Create entry log
    const entryLog = {
      vehicleID: vehicleID,
      userID: vehicle.userID,
      name: user.name,
      slotID: "A1", // You can generate or assign dynamically
      entryTime: new Date(),
      exitTime: null,
    };

    const result = await db.collection("entry_logs").insertOne(entryLog);

    return res.status(200).json({
      message: "Entry logged",
      logID: result.insertedId,
      name: user.name,
      vehicleID,
      slotID: entryLog.slotID,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}

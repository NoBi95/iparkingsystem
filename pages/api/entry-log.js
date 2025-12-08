import clientPromise from "@/lib/mongodb"; // MongoDB connection helper
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  const { vehicleID } = req.body;
  if (!vehicleID) return res.status(400).json({ message: "vehicleID required" });

  try {
    const client = await clientPromise;
    const db = client.db("park");

    // 1️⃣ Find vehicle by its _id
    const vehicle = await db.collection("vehicles").findOne({ _id: new ObjectId(vehicleID) });
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

    // 2️⃣ Find user info
    const user = await db.collection("users").findOne({ _id: new ObjectId(vehicle.userID) });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 3️⃣ Check if vehicle is already parked (active entry)
    const activeEntry = await db.collection("entry_logs").findOne({
      vehicleID: vehicleID,
      exitTime: null,
    });

    if (activeEntry) {
      // Vehicle is exiting
      await db.collection("entry_logs").updateOne(
        { _id: activeEntry._id },
        { $set: { exitTime: new Date() } }
      );

      // Make slot available again
      await db.collection("parking_slots").updateOne(
        { slotID: activeEntry.slotID },
        { $set: { status: "Available" } }
      );

      return res.status(200).json({
        message: "Exit logged successfully",
        vehicleID,
        slotID: activeEntry.slotID,
        type: "exit",
      });
    }

    // 4️⃣ Assign an available slot
    const slot = await db.collection("parking_slots").findOneAndUpdate(
      { type: vehicle.type, status: "Available" },
      { $set: { status: "Occupied" } }
    );

    if (!slot.value) return res.status(400).json({ message: "No available slot" });

    const entryLog = {
      vehicleID,
      userID: vehicle.userID,
      name: user.name,
      slotID: slot.value.slotID,
      entryTime: new Date(),
      exitTime: null,
    };

    const result = await db.collection("entry_logs").insertOne(entryLog);

    return res.status(200).json({
      message: "Entry logged successfully",
      logID: result.insertedId,
      vehicleID,
      slotID: slot.value.slotID,
      name: user.name,
      type: "entry",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
}

// pages/api/visitor.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongo";
import { Db } from "mongodb";
import { getNextSequence } from "../../lib/getNextSequence.js";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const { action } = req.body as { action?: string };

  if (!action) {
    return res
      .status(400)
      .json({ success: false, message: "Missing action" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("park");

    if (action === "entry") {
      return await handleEntry(req, res, db);
    }

    if (action === "exit") {
      return await handleExit(req, res, db);
    }

    return res
      .status(400)
      .json({ success: false, message: "Invalid action" });
  } catch (err) {
    console.error("Error in /api/visitor:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
}

async function handleEntry(req: NextApiRequest, res: NextApiResponse, db: Db) {
  const {
    plateNumber,
    vehicleType,
    companyName,
    driverName,
    purpose,
    recordedById,
    recordedByName,
  } = req.body as {
    plateNumber?: string;
    vehicleType?: string;
    companyName?: string;
    driverName?: string;
    purpose?: string;
    recordedById?: number | string | null;
    recordedByName?: string | null;
  };

  if (!plateNumber || !vehicleType) {
    return res.status(400).json({
      success: false,
      message: "Plate Number and Vehicle Type are required",
    });
  }

  // 1️⃣ Find first available VISITOR slot
  const slot = await db.collection("parkingSlots").findOne({
    slotType: "visitor",
    status: "available",
  });

  if (!slot) {
    return res.status(400).json({
      success: false,
      message: "No available visitor parking slot",
    });
  }

  // 2️⃣ Insert into visitorVehicles with integer _id (auto-increment)
  const visitorId = await getNextSequence(db, "visitorVehicles");

  const visitorDoc = {
    _id: visitorId, // int, not ObjectId
    plate: plateNumber,
    type: vehicleType,
    company: companyName || "",
    driver: driverName || "",
    purpose: purpose || "",
    recordedById: recordedById ?? null,     // admin.id
    recordedByName: recordedByName ?? null, // admin.username
    createdAt: new Date(),
  };

  // cast as any to avoid TS complaining about numeric _id
  await db.collection("visitorVehicles").insertOne(visitorDoc as any);

  // 3️⃣ Create entrylogs row with auto-increment id
  const entryLogId = await getNextSequence(db, "entrylogs");
  const entryTime = new Date();
  const entryDoc = {
    _id: entryLogId, // int
    visitorId,
    entryTime,
    exitTime: null,
    slotId: slot._id,
  };

  await db.collection("entrylogs").insertOne(entryDoc as any);

  // 4️⃣ Create parking record in parkingRecords collection
  const parkingRecordId = await getNextSequence(db, "parkingRecords");
  const parkingRecord = {
    _id: parkingRecordId,
    name: driverName || plateNumber, // Use driver name if available, otherwise plate number
    type: "visitor", // Visitor type
    entryTime,
    exitTime: null,
    slotId: slot._id,
    entryLogId: entryLogId, // Link to entrylog
    visitorId: visitorId,
  };

  await db.collection("parkingRecords").insertOne(parkingRecord as any);

  // 5️⃣ Mark slot as occupied
  await db.collection("parkingSlots").updateOne(
    { _id: slot._id },
    { $set: { status: "occupied" } }
  );

  return res.status(200).json({
    success: true,
    message: `Visitor recorded. Assigned slot #${slot._id}`,
    visitorId,
    slotId: slot._id,
  });
}

async function handleExit(req: NextApiRequest, res: NextApiResponse, db: Db) {
  const { plateNumber } = req.body as { plateNumber?: string };

  if (!plateNumber || !plateNumber.trim()) {
    return res.status(400).json({
      success: false,
      message: "Plate number (or driver) is required for exit",
    });
  }

  const search = plateNumber.trim();

  // 1️⃣ Find visitor by plate OR driver (case-insensitive)
  const visitor = await db.collection("visitorVehicles").findOne({
    $or: [
      { plate: { $regex: search, $options: "i" } },
      { driver: { $regex: search, $options: "i" } },
    ],
  });

  if (!visitor) {
    return res.status(404).json({
      success: false,
      message: "Visitor not found for that plate/driver",
    });
  }

  // 2️⃣ Find open entrylog (no exitTime yet)
  const entryLog = await db.collection("entrylogs").findOne({
    visitorId: visitor._id,
    $or: [{ exitTime: null }, { exitTime: { $exists: false } }],
  });

  if (!entryLog) {
    return res.status(404).json({
      success: false,
      message: "No active entry found for this visitor",
    });
  }

  const exitTime = new Date();

  // 3️⃣ Update entrylog with exitTime
  await db.collection("entrylogs").updateOne(
    { _id: entryLog._id },
    { $set: { exitTime } }
  );

  // 4️⃣ Update parking record with exit time
  await db.collection("parkingRecords").updateOne(
    { entryLogId: entryLog._id } as any,
    { $set: { exitTime } }
  );

  // 5️⃣ Free parking slot
  if (entryLog.slotId != null) {
    await db.collection("parkingSlots").updateOne(
      { _id: entryLog.slotId },
      { $set: { status: "available" } }
    );
  }

  return res.status(200).json({
    success: true,
    message: `Exit recorded for ${visitor.plate || visitor.driver}`,
    data: {
      visitorId: visitor._id,
      plate: visitor.plate,
      driver: visitor.driver,
      slotId: entryLog.slotId ?? null,
      entryTime: entryLog.entryTime,
      exitTime,
    },
  });
}

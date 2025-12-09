// pages/api/entrylog-scan.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongo";
import { Db } from "mongodb";

// Auto-increment helper
async function getNextSequence(db: Db, name: string): Promise<number> {
  const counters = db.collection<any>("counters");

  const doc = await counters.findOne({ _id: name } as any);

  if (!doc) {
    const first = { _id: name, seq: 1 };
    await counters.insertOne(first as any);
    return 1;
  }

  const newSeq = (doc.seq ?? 0) + 1;
  await counters.updateOne({ _id: name } as any, { $set: { seq: newSeq } });
  return newSeq;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { vehicleId } = req.body as { vehicleId?: string | number };

  if (!vehicleId) {
    return res.status(400).json({ success: false, message: "vehicleId is required" });
  }

  const parsedId = typeof vehicleId === "string" ? parseInt(vehicleId, 10) : vehicleId;

  if (!parsedId || Number.isNaN(parsedId)) {
    return res.status(400).json({ success: false, message: "Invalid vehicleId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("park");

    const vehicles = db.collection<any>("vehicles");
    const entrylogs = db.collection<any>("entrylogs");

    const vehicle = await vehicles.findOne({ _id: parsedId } as any);

    if (!vehicle) {
      return res.status(404).json({ success: false, message: `Vehicle not found` });
    }

    const activeLog = await entrylogs.findOne(
      {
        vehicleId: vehicle._id,
        $or: [{ exitTime: null }, { exitTime: { $exists: false } }],
      } as any
    );

    if (activeLog) {
      return await handleExit(db, res, vehicle, activeLog);
    } else {
      return await handleEntry(db, res, vehicle);
    }
  } catch (err) {
    console.error("Error in /api/entrylog-scan:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

async function handleEntry(db: Db, res: NextApiResponse, vehicle: any) {
  const now = new Date();

  let isInactive = false;

  if (vehicle.status && vehicle.status.toLowerCase() === "inactive") {
    isInactive = true;
  }

  if (vehicle.expiryDate && new Date(vehicle.expiryDate) < now) {
    isInactive = true;
  }

  if (vehicle.validUntil && new Date(vehicle.validUntil) < now) {
    isInactive = true;
  }

  let offenseDoc = null;

  if (isInactive) {
    const penalties = db.collection<any>("penalty");
    let penalty = await penalties.findOne({ type: "Illegal Parking" });

    if (!penalty) penalty = await penalties.findOne({});

    const offenseId = await getNextSequence(db, "offenses");

    offenseDoc = {
      _id: offenseId,
      vehicleId: vehicle._id,
      status: "Pending",
      penaltyId: penalty ? penalty._id : null,
      date: now,
    };

    await db.collection("offenses").insertOne(offenseDoc as any);
  }

  const vType = (vehicle.vehicleType || vehicle.type || "").toLowerCase();
  const slotType = vType === "motorcycle" ? "motorcycle" : "car";

  const parkingSlots = db.collection<any>("parkingSlots");
  const slot = await parkingSlots.findOne(
    {
      slotType,
      status: "available",
    } as any
  );

  if (!slot) {
    return res.status(400).json({
      success: false,
      mode: "entry",
      message: `No available ${slotType} parking slot`,
      inactive: isInactive,
    });
  }

  const entryLogId = await getNextSequence(db, "entrylogs");

  const entryDoc = {
    _id: entryLogId,
    vehicleId: vehicle._id,
    visitorId: null,
    entryTime: now,
    exitTime: null,
    slotId: slot._id,
  };

  await db.collection("entrylogs").insertOne(entryDoc as any);

  await parkingSlots.updateOne(
    { _id: slot._id } as any,
    { $set: { status: "occupied" } }
  );

  return res.status(200).json({
    success: true,
    mode: "entry",
    message: `Entry recorded. Assigned slot #${slot._id}`,
    data: {
      entryId: entryLogId,
      vehicleId: vehicle._id,
      slotId: slot._id,
      entryTime: now,
    },
    inactive: isInactive,
    offense: offenseDoc,
  });
}

async function handleExit(db: Db, res: NextApiResponse, vehicle: any, activeLog: any) {
  const exitTime = new Date();

  await db.collection("entrylogs").updateOne(
    { _id: activeLog._id } as any,
    { $set: { exitTime } }
  );

  if (activeLog.slotId != null) {
    await db.collection("parkingSlots").updateOne(
      { _id: activeLog.slotId } as any,
      { $set: { status: "available" } }
    );
  }

  return res.status(200).json({
    success: true,
    mode: "exit",
    message: `Exit recorded for vehicle ID ${vehicle._id}`,
    data: {
      vehicleId: vehicle._id,
      slotId: activeLog.slotId,
      entryTime: activeLog.entryTime,
      exitTime,
    },
  });
}

// pages/api/entrylog-scan.ts
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

  const { vehicleId } = req.body as { vehicleId?: string | number };

  if (!vehicleId) {
    return res
      .status(400)
      .json({ success: false, message: "vehicleId is required" });
  }

  const parsedId =
    typeof vehicleId === "string" ? parseInt(vehicleId, 10) : vehicleId;

  if (!parsedId || Number.isNaN(parsedId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid vehicleId" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("park");

    const vehicles = db.collection<any>("vehicles");
    const entrylogs = db.collection<any>("entrylogs");

    const vehicle = await vehicles.findOne({ _id: parsedId } as any);

    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: `Vehicle not found` });
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
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
}

async function handleEntry(
  db: Db,
  res: NextApiResponse,
  vehicle: any
) {
  const now = new Date();

  // 👇 determine if vehicle is inactive / expired
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

  // this will hold the created offense doc (if any)
  let offenseDoc: any = null;

  // 🔴 IF INACTIVE/EXPIRED → CREATE OFFENSE WITH "Expired Registration"
  if (isInactive) {
    const penaltiesCol = db.collection<any>("penalty");
    const offensesCol = db.collection<any>("offenses");

    // find the Expired Registration penalty
    const penalty = await penaltiesCol.findOne(
      { type: "Expired Registration" } as any
    );

    if (penalty) {
      const offenseId = await getNextSequence(db, "offenses");

      offenseDoc = {
        _id: offenseId,
        vehicleId: vehicle._id,
        status: "Pending",
        penaltyId: penalty._id, // 👈 correct penalty id
        date: now,
      };

      await offensesCol.insertOne(offenseDoc as any);
    }
  }

  // 🔵 slot type: car or motorcycle
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
      offense: offenseDoc,
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

  await db.collection<any>("entrylogs").insertOne(entryDoc as any);

  // 🔹 Get user information for registered users
  let userName = "";
  let userType = "user"; // default to "user"
  const userId = (vehicle as any).userId ?? (vehicle as any).userID;

  if (userId !== undefined && userId !== null) {
    const usersCol = db.collection<any>("users");
    const user = await usersCol.findOne({ _id: userId } as any);
    if (user) {
      userName = user.name || "";
      // Determine type: "staff" or "user" based on userType field
      userType =
        (user.userType || "").toLowerCase() === "staff"
          ? "staff"
          : "user";
    }
  }

  // 🔹 Create parking record in parkingRecords collection
  const parkingRecordId = await getNextSequence(db, "parkingRecords");
  const parkingRecord = {
    _id: parkingRecordId,
    name:
      userName ||
      vehicle.plateNumber ||
      vehicle.plate ||
      `Vehicle ${vehicle._id}`,
    type: userType, // "user", "staff", or "visitor"
    entryTime: now,
    exitTime: null,
    slotId: slot._id,
    entryLogId: entryLogId, // Link to entrylog
    vehicleId: vehicle._id,
  };

  await db.collection<any>("parkingRecords").insertOne(
    parkingRecord as any
  );

  await parkingSlots.updateOne(
    { _id: slot._id } as any,
    { $set: { status: "occupied" } }
  );

  // optional: slightly nicer message if offense was created
  let message = `Entry recorded. Assigned slot #${slot._id}`;
  if (isInactive && offenseDoc) {
    message = `Entry recorded. Offense "Expired Registration" created. Assigned slot #${slot._id}`;
  }

  return res.status(200).json({
    success: true,
    mode: "entry",
    message,
    data: {
      entryId: entryLogId,
      vehicleId: vehicle._id,
      slotId: slot._id,
      entryTime: now,
    },
    inactive: isInactive,
    offense: offenseDoc, // null if active, offense doc if inactive
  });
}

async function handleExit(
  db: Db,
  res: NextApiResponse,
  vehicle: any,
  activeLog: any
) {
  const exitTime = new Date();

  await db.collection<any>("entrylogs").updateOne(
    { _id: activeLog._id } as any,
    { $set: { exitTime } }
  );

  // 🔹 Update parking record with exit time
  await db.collection<any>("parkingRecords").updateOne(
    { entryLogId: activeLog._id } as any,
    { $set: { exitTime } }
  );

  if (activeLog.slotId != null) {
    await db.collection<any>("parkingSlots").updateOne(
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

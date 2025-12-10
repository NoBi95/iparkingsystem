// pages/api/offense-create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongo";
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

  const { vehicleId, penaltyId } = req.body as {
    vehicleId?: string | number;
    penaltyId?: string | number;
  };

  if (!vehicleId || !penaltyId) {
    return res.status(400).json({
      success: false,
      message: "vehicleId and penaltyId are required",
    });
  }

  const vId =
    typeof vehicleId === "string" ? parseInt(vehicleId, 10) : vehicleId;
  const pId =
    typeof penaltyId === "string" ? parseInt(penaltyId, 10) : penaltyId;

  if (!vId || Number.isNaN(vId) || !pId || Number.isNaN(pId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid ids supplied" });
  }

  try {
    const client = await clientPromise;
    const db = client.db("park");

    const vehicles = db.collection<any>("vehicles");
    const penaltiesCol = db.collection<any>("penalty");
    const offensesCol = db.collection<any>("offenses");

    // 🔹 new collections for logs + users
    const usersCol = db.collection<any>("users");
    const logsCol = db.collection<any>("logs");

    // 🔹 find vehicle
    const vehicle = await vehicles.findOne({ _id: vId } as any);
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

    // 🔹 find penalty
    const penalty = await penaltiesCol.findOne({ _id: pId } as any);
    if (!penalty) {
      return res
        .status(404)
        .json({ success: false, message: "Penalty not found" });
    }

    // 🚫 "Expired Registration" is automatic – don't allow manual
    if (penalty.type === "Expired Registration") {
      return res.status(400).json({
        success: false,
        message: "Expired Registration is handled automatically.",
      });
    }

    // 🔹 try to get user (via vehicle.userId or vehicle.userID)
    const userId = (vehicle as any).userId ?? (vehicle as any).userID;
    let user: any = null;
    if (userId !== undefined && userId !== null) {
      user = await usersCol.findOne({ _id: userId } as any);
    }

    // ✅ get next integer _id for offenses using centralized helper
    const offenseId = await getNextSequence(db, "offenses");

    const now = new Date();

    const offenseDoc = {
      _id: offenseId, // integer _id auto-increment
      vehicleId: vehicle._id,
      status: "Pending",
      penaltyId: penalty._id,
      date: now,
    };

    // 🔹 insert into offenses
    await offensesCol.insertOne(offenseDoc as any);

    // ✅ get next integer _id for logs using centralized helper
    const logId = await getNextSequence(db, "logs");

    // 🔹 insert into logs (userName, penaltyType, amount, status = Pending)
    const logDoc = {
      _id: logId,                    // 👈 integer _id, not ObjectId
      offenseId: offenseId,
      vehicleId: vehicle._id,
      userName: user?.name ?? "",    // falls back to empty string if no user
      penaltyType: penalty.type,
      amount: penalty.amount,
      status: offenseDoc.status,     // "Pending"
      date: now,
    };

    await logsCol.insertOne(logDoc as any);

    return res.status(200).json({
      success: true,
      message: `Offense recorded for vehicle ${
        vehicle.plateNumber ?? vehicle.plate ?? vehicle._id
      }`,
      offense: offenseDoc,
      log: logDoc,
      vehicle: {
        id: vehicle._id,
        plateNumber: vehicle.plateNumber ?? vehicle.plate ?? "",
        vehicleType: vehicle.vehicleType ?? vehicle.type ?? "",
      },
      penalty,
      user,
    });
  } catch (err: any) {
    console.error("Error in /api/offense-create:", err);

    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate offense id generated. Please try again.",
      });
    }

    return res
      .status(500)
      .json({ success: false, message: "Server error creating offense" });
  }
}

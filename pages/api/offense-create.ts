// pages/api/offense-create.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongo";
import { Db } from "mongodb";

async function getNextSequence(db: Db, name: string): Promise<number> {
  const counters = db.collection<any>("counters");

  const result = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    {
      upsert: true,
    }
  );

  const prev = result?.value as any;

  // ⚠️ If there was no previous document (first time), result.value can be null.
  // In that case, the new seq in DB is 1.
  if (!prev || typeof prev.seq !== "number") {
    // Make sure the stored value is 1
    await counters.updateOne({ _id: name }, { $set: { seq: 1 } });
    return 1;
  }

  // With no returnDocument option, result.value is the *previous* doc
  // and we just increment it in code as well.
  return prev.seq + 1;
}


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

    const vehicle = await vehicles.findOne({ _id: vId } as any);
    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

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

    const offenseId = await getNextSequence(db, "offenses");
    const now = new Date();

    const offenseDoc = {
      _id: offenseId,          // integer _id auto-increment
      vehicleId: vehicle._id,
      status: "Pending",
      penaltyId: penalty._id,
      date: now,
    };

    await offensesCol.insertOne(offenseDoc as any);

    return res.status(200).json({
      success: true,
      message: `Offense recorded for vehicle ${
        vehicle.plateNumber ?? vehicle.plate ?? vehicle._id
      }`,
      offense: offenseDoc,
      vehicle: {
        id: vehicle._id,
        plateNumber: vehicle.plateNumber ?? vehicle.plate ?? "",
        vehicleType: vehicle.vehicleType ?? vehicle.type ?? "",
      },
      penalty,
    });
  } catch (err: any) {
    console.error("Error in /api/offense-create:", err);

    // Optional: friendlier duplicate key handling
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

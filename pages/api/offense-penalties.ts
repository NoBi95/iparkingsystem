// pages/api/offense-penalties.ts
import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "../../lib/mongo";

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

  if (vehicleId === undefined || vehicleId === null || vehicleId === "") {
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
    const penaltiesCol = db.collection<any>("penalty");
    const offensesCol = db.collection<any>("offenses");

    // 🔹 load vehicle (numeric _id)
    const vehicle = await vehicles.findOne({ _id: parsedId } as any);

    if (!vehicle) {
      return res
        .status(404)
        .json({ success: false, message: "Vehicle not found" });
    }

    // 🔹 penalties except "Expired Registration"
    const penalties = await penaltiesCol
      .find({ type: { $ne: "Expired Registration" } })
      .toArray();

    // 🔹 latest offenses for this vehicle
    const recentOffenses = await offensesCol
      .find({ vehicleId: vehicle._id } as any)
      .sort({ date: -1 })
      .limit(10)
      .toArray();

    return res.status(200).json({
      success: true,
      vehicle: {
        id: vehicle._id,
        plateNumber: vehicle.plateNumber ?? vehicle.plate ?? "",
        vehicleType: vehicle.vehicleType ?? vehicle.type ?? "",
        color: vehicle.color ?? "",
        status: vehicle.status ?? "",
      },
      penalties,
      recentOffenses,
    });
  } catch (err) {
    console.error("Error in /api/offense-penalties:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error loading penalties" });
  }
}


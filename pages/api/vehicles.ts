import type { NextApiRequest, NextApiResponse } from "next";
import clientPromise from "@/lib/mongo"; // path to your mongo.ts

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const client = await clientPromise;
    const db = client.db("iparking"); // your database name

    const vehicles = await db.collection("park.vehicle").find({}).toArray();
    res.status(200).json({ vehicles });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

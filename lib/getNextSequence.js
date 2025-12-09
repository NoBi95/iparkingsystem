// lib/getNextSequence.js
import clientPromise from "./mongo.js";

export async function getNextSequence(name) {
  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" } // create if not exists
  );

  if (!result.value) throw new Error("Failed to get sequence for " + name);
  return result.value.seq; // integer ID
}

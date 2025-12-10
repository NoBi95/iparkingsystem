// lib/getNextSequence.js
import clientPromise from "./mongo.ts";
import { Db } from "mongodb";

/**
 * Get next sequence number for a given counter name.
 * @param {Db} db - MongoDB database instance (optional, will use default if not provided)
 * @param {string} name - Counter name (e.g., "entrylogs", "offenses")
 * @returns {Promise<number>} Next sequence number
 */
export async function getNextSequence(db, name) {
  // If db is not provided, use default connection
  if (!db) {
    const client = await clientPromise;
    db = client.db("park"); // Default to "park" database
  }

  const result = await db.collection("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" } // create if not exists
  );

  if (!result.value) throw new Error("Failed to get sequence for " + name);
  return result.value.seq; // integer ID
}

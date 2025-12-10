// lib/getNextSequence.js
import clientPromise from "./mongo"; // note: no .ts here, safer for Node

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

  const counters = db.collection("counters");

  const result = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    {
      upsert: true,
      // v4 style:
      returnDocument: "after",
      // v3 style (ignored by v4, but safe):
      returnOriginal: false,
    }
  );

  // Some driver versions still return null on first upsert, so handle that:
  if (!result.value) {
    const doc = await counters.findOne({ _id: name });
    if (!doc || typeof doc.seq !== "number") {
      throw new Error("Failed to get sequence for " + name);
    }
    return doc.seq;
  }

  return result.value.seq;
}

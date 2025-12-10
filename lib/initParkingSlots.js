import clientPromise from "./mongo.ts";
import { getNextSequence } from "./getNextSequence.js";

async function initSlots() {
  const client = await clientPromise;
  const db = client.db("park");

  // Define slot types and how many slots for each
  // Note: Using lowercase to match API queries
  const slotConfig = [
    { type: "motorcycle", count: 100 },
    { type: "car", count: 30 },
    { type: "visitor", count: 30 },
  ];

  for (const config of slotConfig) {
    for (let i = 0; i < config.count; i++) {
      const slotId = await getNextSequence(db, "parkingSlots");

      const slot = {
        _id: slotId,
        slotType: config.type,
        status: "available",
      };

      await db.collection("parkingSlots").insertOne(slot);
      console.log(`Created slot: ${JSON.stringify(slot)}`);
    }
  }

  console.log("All parking slots initialized successfully!");
  process.exit(0);
}

initSlots().catch((err) => {
  console.error(err);
  process.exit(1);
});

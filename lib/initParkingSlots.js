import clientPromise from "../lib/mongo.js";
import { getNextSequence } from "../lib/getNextSequence.js";

async function initSlots() {
  const client = await clientPromise;
  const db = client.db();

  // Define slot types and how many slots for each
  const slotConfig = [
    { type: "Motorcycle", count: 100 },
    { type: "Car", count: 30 },
    { type: "Visitor", count: 30 },
  ];

  for (const config of slotConfig) {
    for (let i = 0; i < config.count; i++) {
      const slotId = await getNextSequence("parkingSlots");

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

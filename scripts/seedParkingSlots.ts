// scripts/seedParkingSlots.ts
import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGO_URI;
if (!uri) throw new Error("Missing MONGO_URI in .env.local");

const client = new MongoClient(uri);

interface CounterDoc {
  _id: string;  // e.g. "parkingSlots"
  seq: number;
}

async function getNextSequence(db: Db, name: string): Promise<number> {
  const counters = db.collection<CounterDoc>("counters");

  // Get existing counter doc
  const doc = await counters.findOne({ _id: name });

  if (!doc) {
    // First time: create with seq = 1
    const first: CounterDoc = { _id: name, seq: 1 };
    await counters.insertOne(first);
    return first.seq;
  }

  // Next times: increment seq by 1
  const newSeq = (doc.seq ?? 0) + 1;
  await counters.updateOne(
    { _id: name },
    { $set: { seq: newSeq } }
  );

  return newSeq;
}

async function runSeeder() {
  try {
    await client.connect();
    const db = client.db("park");
    console.log("Connected to DB:", db.databaseName);

    const counters = db.collection<CounterDoc>("counters");

    // Optional: reset counter for parkingSlots to 0 if it exists
    await counters.updateOne(
      { _id: "parkingSlots" },
      { $set: { seq: 0 } },
      { upsert: true }
    );
    console.log('Counter "parkingSlots" set to 0 (created or reset).');

    const parkingSlots = db.collection("parkingSlots");

    // Clear existing slots
    await parkingSlots.deleteMany({});
    console.log("Cleared parkingSlots collection.");

    const totalVisitor = 30;
    const totalCar = 30;
    const totalMoto = 100;

    const bulkOps: any[] = [];

    // Visitor slots
    for (let i = 0; i < totalVisitor; i++) {
      const id = await getNextSequence(db, "parkingSlots");
      bulkOps.push({
        insertOne: {
          document: {
            _id: id,
            slotType: "visitor",
            status: "available",
          },
        },
      });
    }

    // Car slots
    for (let i = 0; i < totalCar; i++) {
      const id = await getNextSequence(db, "parkingSlots");
      bulkOps.push({
        insertOne: {
          document: {
            _id: id,
            slotType: "car",
            status: "available",
          },
        },
      });
    }

    // Motorcycle slots
    for (let i = 0; i < totalMoto; i++) {
      const id = await getNextSequence(db, "parkingSlots");
      bulkOps.push({
        insertOne: {
          document: {
            _id: id,
            slotType: "motorcycle",
            status: "available",
          },
        },
      });
    }

    if (bulkOps.length > 0) {
      await parkingSlots.bulkWrite(bulkOps);
    }

    console.log("Seeder complete!");
    console.log(`
Created:
  - ${totalVisitor} Visitor slots
  - ${totalCar} Car slots
  - ${totalMoto} Motorcycle slots
`);
  } catch (err) {
    console.error("Seeder Error:", err);
  } finally {
    await client.close();
  }
}

runSeeder();

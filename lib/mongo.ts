// import { MongoClient } from "mongodb";

// if (!process.env.MONGO_URI) {
//   throw new Error("Please define the MONGO_URI environment variable inside .env.local");
// }

// const uri = process.env.MONGO_URI;
// let client: MongoClient;
// let clientPromise: Promise<MongoClient>;

// if (process.env.NODE_ENV === "development") {
//   // In development, use a global variable so the client is not recreated on every request
//   if (!(global as any)._mongoClientPromise) {
//     client = new MongoClient(uri);
//     (global as any)._mongoClientPromise = client.connect();
//   }
//   clientPromise = (global as any)._mongoClientPromise;
// } else {
//   // In production, create a new client for every connection
//   client = new MongoClient(uri);
//   clientPromise = client.connect();
// }

// export default clientPromise;
// lib/mongo.ts
import { MongoClient } from "mongodb";

declare global {
  // Allow global var in TS + prevent multiple instances
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGO_URI) {
  throw new Error("❌ Please define the MONGO_URI environment variable inside .env.local");
}

const uri: string = process.env.MONGO_URI;
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // Reuse connection during hot reloads
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // New connection in production
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

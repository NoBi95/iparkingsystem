// lib/mongo.js
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI not defined!');

let cachedClient = null;
let cachedDb = null;

export async function connectToMongo() {
  if (cachedClient && cachedDb) return { client: cachedClient, db: cachedDb };

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('park'); // Use your seeded DB
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

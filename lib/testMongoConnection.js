import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

// Load env variables explicitly for standalone script
dotenv.config({ path: '../.env.local' });

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('❌ MONGO_URI is undefined. Check your .env.local!');
  process.exit(1);
}

async function testMongoConnection() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB connected successfully!');
    const db = client.db(); // default DB from URI
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  } finally {
    await client.close();
  }
}

testMongoConnection();

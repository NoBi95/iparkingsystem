// lib/seedAdmin.js
import { connectToMongo } from './mongo.js';
import { ObjectId } from 'mongodb';

async function seedAdmin() {
  const { db } = await connectToMongo();

  // Check if a SuperAdmin already exists
  const existing = await db.collection('admin').findOne({ RoleType: 'SuperAdmin' });
  if (existing) {
    console.log('SuperAdmin already exists with _id:', existing._id.toString());
    process.exit(0);
  }

  // Create a new SuperAdmin
  const newAdmin = {
    _id: new ObjectId(),
    Username: 'SuperAdmin',
    Password: 'admin123', // You may hash this in production
    RoleType: 'SuperAdmin',
    Status: 'Active',
    CreatedAt: new Date()
  };

  const result = await db.collection('admin').insertOne(newAdmin);
  console.log('SuperAdmin created with _id:', result.insertedId.toString());
  process.exit(0);
}

seedAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});

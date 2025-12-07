import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
dotenv.config({ path: '../.env.local' });

const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI not defined!');

const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    const db = client.db('park');

    // Clear existing collections
    const collections = await db.listCollections().toArray();
    for (const col of collections) await db.collection(col.name).drop();

    // Users
    const users = [
      { _id: 1, name: 'Noel Biol', gender: 'Male', phone: '09914200136', userType: 'Student', isActive: true },
      { _id: 2, name: 'Jessa Mae', gender: 'Male', phone: '0994200136', userType: 'Student', isActive: true },
      { _id: 3, name: 'Dylan Wang', gender: 'Male', phone: '09914200136', userType: 'Student', isActive: true },
      { _id: 4, name: 'Teteng Manso', gender: 'Male', phone: '09914200136', userType: 'Student', isActive: true },
      { _id: 5, name: 'sdsadas', gender: 'Female', phone: 'asfsfa', userType: 'Staff', isActive: true },
      { _id: 6, name: 'Alphaire', gender: 'Male', phone: '09121324244234', userType: 'Student', isActive: true }
    ];
    await db.collection('users').insertMany(users);

    // Vehicles
    const vehicles = [
      { _id: 1, type: 'Motorcycle', plate: 'Z333', status: 'Active', expiryDate: new Date('2029-12-05'), userId: 1, feePaid: 100 },
      { _id: 2, type: 'Car', plate: 'TR563T', status: 'Active', expiryDate: new Date('2026-12-05'), userId: 3, feePaid: 200 },
      { _id: 3, type: 'Motorcycle', plate: 'TF555', status: 'Active', expiryDate: new Date('2026-12-06'), userId: 4, feePaid: 100 },
      { _id: 4, type: 'Motorcycle', plate: 'NoPlate', status: 'Active', expiryDate: new Date('2026-12-07'), userId: 5, feePaid: 1233 },
      { _id: 5, type: 'Motorcycle', plate: 'NoPlate', status: 'Active', expiryDate: new Date('2026-12-07'), userId: 6, feePaid: 100 },
    ];
    await db.collection('vehicles').insertMany(vehicles);

    // Visitor Vehicles
    const visitors = [
      { _id: 20, plate: 'TR777', type: 'Car', company: 'NBA', driver: 'Nole Biol', purpose: 'Wala', recordedBy: 1 },
      { _id: 21, plate: '717', type: 'Car', company: 'Pisot', driver: 'Bobong', purpose: 'Visit', recordedBy: 1 },
      { _id: 22, plate: '1234', type: 'Car', company: 'NBA', driver: 'Jessa Biol', purpose: 'Visit', recordedBy: 1 },
      { _id: 23, plate: '1235689', type: 'Car', company: 'Durso', driver: 'Lumen', purpose: 'Visits', recordedBy: 2 }
    ];
    await db.collection('visitorVehicles').insertMany(visitors);

    // Parking Slots
    const slots = [];
    for (let i = 1; i <= 20; i++) slots.push({ _id: i, type: 'Car', status: 'Available' });
    for (let i = 21; i <= 50; i++) slots.push({ _id: i, type: 'Motorcycle', status: i <= 22 ? 'Occupied' : 'Available' });
    for (let i = 51; i <= 70; i++) slots.push({ _id: i, type: 'Visitor', status: i <= 53 ? 'Occupied' : 'Available' });
    await db.collection('parkingSlots').insertMany(slots);

    // Admins
    const admins = [
    { _id: 1, username: 'admin', password: '123456', role: 'SuperAdmin', status: 'Active' },
    { _id: 2, username: 'Jess', password: '123456', role: 'Moderator', status: 'Active', userId: 2 },
    { _id: 3, username: 'sdsdsad', password: '123456', role: 'Moderator', status: 'Inactive' },
    { _id: 4, username: 'bcbd', password: '123456', role: 'Moderator', status: 'Inactive' },
    { _id: 5, username: 'Lumena', password: '123456', role: 'Admin', status: 'Active' }
    ];
    await db.collection('admins').insertMany(admins);

    // Penalties
    const penalties = [
      { _id: 1, type: 'IllegalParking', amount: 100 },
      { _id: 2, type: 'Expired Registration', amount: 100 }
    ];
    await db.collection('penalties').insertMany(penalties);

    // Offenses
    const offenses = [
      { _id: 1, vehicleId: 3, status: 'Resolved', penaltyId: 1, date: new Date('2025-12-06 13:43:10') },
      { _id: 2, vehicleId: 3, status: 'Resolved', penaltyId: 1, date: new Date('2025-12-06 13:45:03') },
      { _id: 3, vehicleId: 3, status: 'Resolved', penaltyId: 2, date: new Date('2025-12-06 13:51:48') },
      { _id: 4, vehicleId: 3, status: 'Resolved', penaltyId: 1, date: new Date('2025-12-06 13:57:56') },
      { _id: 5, vehicleId: 5, status: 'Resolved', penaltyId: 1, date: new Date('2025-12-07 10:23:26') }
    ];
    await db.collection('offenses').insertMany(offenses);

    console.log('✅ Sample data inserted for MongoDB!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

seed();

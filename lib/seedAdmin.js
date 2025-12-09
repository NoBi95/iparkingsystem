import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';

// Load environment variables from project .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });


const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI not defined!');

const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    const db = client.db('park');

    // Example: Admins (plain passwords will be hashed before insert)
    const admins = [
      { 
        _id: new ObjectId(),
        username: 'admin', 
        password: '123456', 
        role: 'SuperAdmin', 
        status: 'Active' 
      },
      { 
        _id: new ObjectId(), 
        username: 'Jess', 
        password: '123456', 
        role: 'Moderator', 
        status: 'Active', 
        userId: new ObjectId()
      },
      { 
        _id: new ObjectId(), 
        username: 'sdsdsad', 
        password: '123456', 
        role: 'Moderator', 
        status: 'Inactive' 
      },
      { 
        _id: new ObjectId(), 
        username: 'bcbd', 
        password: '123456', 
        role: 'Moderator', 
        status: 'Inactive' 
      },
      { 
        _id: new ObjectId(), 
        username: 'Lumena', 
        password: '123456', 
        role: 'Admin', 
        status: 'Active' 
      }
    ];

    // Hash passwords before inserting
    const saltRounds = 10;
    const hashed = await Promise.all(admins.map(async (a) => ({
      ...a,
      password: await bcrypt.hash(a.password, saltRounds)
    })));

    await db.collection('admins').insertMany(hashed);

    console.log('✅ Admins inserted with ObjectIds!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

seed();

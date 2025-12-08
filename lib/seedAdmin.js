import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/appl/github/iparkingsystem/.env.local' });


const uri = process.env.MONGO_URI;
if (!uri) throw new Error('MONGO_URI not defined!');

const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    const db = client.db('park');

    // Example: Admins
    const admins = [
      { 
        _id: new ObjectId(),  // <-- Auto-generate ObjectId for SuperAdmin
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
        userId: new ObjectId() // if this references another collection
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
    
    await db.collection('admins').insertMany(admins);

    console.log('✅ Admins inserted with ObjectIds!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

seed();

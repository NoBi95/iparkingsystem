// import { Db } from "mongodb";

// export interface VehicleActionEntryParams {
//   entryLogId: number;
//   accountType: string;
//   username?: string | null;
//   driverName?: string | null;
//   vehicleId?: number | null;
//   visitorVehicleId?: number | null;
//   slotId?: number | null;
//   timeIn: Date;
// }

// export async function getNextSequence(db: Db, name: string): Promise<number> {
//   const counters = db.collection<any>("counters");
//   const doc = await counters.findOne({ _id: name });

//   if (!doc) {
//     const first = { _id: name, seq: 1 };
//     await counters.insertOne(first);
//     return 1;
//   }

//   const newSeq = (doc.seq ?? 0) + 1;
//   await counters.updateOne({ _id: name }, { $set: { seq: newSeq } });
//   return newSeq;
// }

// export async function createVehicleActionEntry(
//   db: Db,
//   params: VehicleActionEntryParams
// ) {
//   const id = await getNextSequence(db, "vehicleactions");

//   const doc = {
//     _id: id,
//     entryLogId: params.entryLogId,
//     accountType: params.accountType,
//     username: params.username ?? null,
//     driverName: params.driverName ?? null,
//     vehicleId: params.vehicleId ?? null,
//     visitorVehicleId: params.visitorVehicleId ?? null,
//     slotId: params.slotId ?? null,
//     timeIn: params.timeIn,
//     timeOut: null,
//   };

//   await db.collection("vehicleactions").insertOne(doc);
// }

// export async function setVehicleActionExit(
//   db: Db,
//   entryLogId: number,
//   exitTime: Date
// ) {
//   await db.collection("vehicleactions").updateOne(
//     { entryLogId },
//     { $set: { timeOut: exitTime } }
//   );
// }

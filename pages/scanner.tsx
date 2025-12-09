"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";

interface Vehicle {
_id: string;
vehicleType: string;
color: string;
plateNumber: string;
status: string;
userID: string;
feePaid: number;
createdAt: string;
qrCodePath: string | null;
}

interface User {
_id: string;
name: string;
address: string;
gender: string;
phoneNumber: string;
userType: string;
createdAt: string;
isActive: number;
}

export default function VehiclePage() {
const router = useRouter();
const { id } = router.query;

const [vehicle, setVehicle] = useState<Vehicle | null>(null);
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
if (!id) return;

// TODO: replace with real API call
const fetchData = async () => {
  setLoading(true);

  // Mocked vehicle data
  const vehicleData: Vehicle = {
    _id: "693683980c589a777f479c43",
    vehicleType: "Motorcycle",
    color: "Black",
    plateNumber: "TR50",
    status: "Active",
    userID: "693683880c589a777f479c42",
    feePaid: 200,
    createdAt: "2025-12-08T07:51:52.277Z",
    qrCodePath: "C:\\QRCodes\\Angel_Lao_QR.png",
  };

  const userData: User = {
    _id: "693683880c589a777f479c42",
    name: "Angel Lao",
    address: "Panabo",
    gender: "Female",
    phoneNumber: "09914200134",
    userType: "Staff",
    createdAt: "2025-12-08T07:51:36.246Z",
    isActive: 1,
  };

  setVehicle(vehicleData);
  setUser(userData);
  setLoading(false);
};

fetchData();

}, [id]);

if (loading) return <p>Loading...</p>;
if (!vehicle || !user) return <p>Vehicle or user not found.</p>;

const handleManualInput = () => alert("Manual Input Form clicked");
const handleEntryLog = () => alert("Entry Log clicked");
const handleOffence = () => alert("Offence clicked");

return (
<div style={{ padding: "20px", textAlign: "center" }}> <h1>Vehicle Detail</h1>
  <h2>User Info</h2>
  <p>Name: {user.name}</p>
  <p>Address: {user.address}</p>
  <p>Phone: {user.phoneNumber}</p>
  <p>User Type: {user.userType}</p>

  <h2>Vehicle Info</h2>
  <p>Type: {vehicle.vehicleType}</p>
  <p>Color: {vehicle.color}</p>
  <p>Plate: {vehicle.plateNumber}</p>
  <p>Status: {vehicle.status}</p>
  <p>Fee Paid: {vehicle.feePaid}</p>

  <div style={{ marginTop: "20px" }}>
    <button
      style={{ margin: "10px", padding: "10px 20px" }}
      onClick={handleManualInput}
    >
      Manual Input Form
    </button>
    <button
      style={{ margin: "10px", padding: "10px 20px" }}
      onClick={handleEntryLog}
    >
      Entry Log
    </button>
    <button
      style={{ margin: "10px", padding: "10px 20px" }}
      onClick={handleOffence}
    >
      Offence
    </button>
  </div>
</div>

);
}

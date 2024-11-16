// /app/api/wallets/route.ts
import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

// MongoDB connection
const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI as string;
const DB_NAME = "paysense";
const COLLECTION_NAME = "paysense-wallets";

// Store wallet in MongoDB
export async function POST(req: Request) {
  const { owners, numConfirmationsRequired, createdBy ,walletAddress, chain } = await req.json();

  if (!createdBy) {
    return new NextResponse(JSON.stringify({ message: "createdBy is required" }), { status: 400 });
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  try {
    const result = await collection.insertOne({
      owners,
      numConfirmationsRequired,
      createdBy,
      walletAddress,
      createdAt: new Date(),
      chain: chain
    });
    return new NextResponse(JSON.stringify({ message: "Wallet created", result }), { status: 201 });
  } catch (error) {
    return new NextResponse(JSON.stringify({ message: "Error creating wallet" }), { status: 500 });
  } finally {
    await client.close();
  }
}

// Fetch wallets by owner
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ownerAddress = searchParams.get("ownerAddress");

  if (!ownerAddress) {
    return new NextResponse(JSON.stringify({ message: "ownerAddress is required" }), { status: 400 });
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  try {
    // Find wallets where the ownerAddress is in the owners array
    const wallets = await collection.find({ owners: ownerAddress }).toArray();
    return new NextResponse(JSON.stringify({ message: "Wallets fetched successfully", wallets }), { status: 200 });
  } catch (error) {
    return new NextResponse(JSON.stringify({ message: "Error fetching wallets" }), { status: 500 });
  } finally {
    await client.close();
  }
}

import { MongoClient } from "mongodb";
import { NextResponse } from "next/server";

const MONGODB_URI = process.env.NEXT_PUBLIC_MONGODB_URI as string;
const DB_NAME = "paysense";
const COLLECTION_NAME = "signatures";

export async function POST(req: Request) {
  const {
    walletAddress,
    requestDetails,
    requester,
    requestType,
    deadline,
    status,
    nonce,
    signature,
    amount,
    recipient
  } = await req.json();

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  try {
    // Check if a request with this nonce exists
    const existingRequest = await collection.findOne({
      walletAddress,
      nonce,
    });

    if (existingRequest) {
      return new NextResponse(
        JSON.stringify({ message: "Request already exists for this nonce." }),
        { status: 400 }
      );
    }

    // Insert the new request with an array of signatures and signers
    const result = await collection.insertOne({
      walletAddress,
      requestDetails,
      requester,
      requestType,
      deadline,
      status: status || "pending",
      nonce,
      signatures: [{ signer: requester, signature }],
      timestamp: new Date(),
      amount,
      recipient
    });

    return new NextResponse(
      JSON.stringify({ message: "Request added successfully", id: result.insertedId }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error adding request" }),
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// PUT method to update signatures for existing requests
export async function PUT(req: Request) {
    const { walletAddress, nonce, signer, signature } = await req.json();
  
    const client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
  
    try {
      // Check if the request exists
      const existingRequest = await collection.findOne({
        walletAddress,
        nonce,
      });
  
      if (!existingRequest) {
        return new NextResponse(
          JSON.stringify({ message: "Request not found" }),
          { status: 404 }
        );
      }
  
      // Check if the signer has already signed
      const existingSignature = existingRequest.signatures?.find(
        (s: { signer: string }) => s.signer === signer
      );
  
      if (existingSignature) {
        return new NextResponse(
          JSON.stringify({ message: "This signer has already signed." }),
          { status: 400 }
        );
      }
  
      // Use type assertion to tell TypeScript that `signatures` is an array
      const result = await collection.updateOne(
        { walletAddress, nonce },
        {
          $push: {
            signatures: { signer, signature },
          } as any, // Type assertion here
        }
      );
  
      return new NextResponse(
        JSON.stringify({
          message: "Signature added successfully",
          modifiedCount: result.modifiedCount,
        }),
        { status: 200 }
      );
    } catch (error) {
      return new NextResponse(
        JSON.stringify({ message: "Error updating signature" }),
        { status: 500 }
      );
    } finally {
      await client.close();
    }
  }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const walletAddress = searchParams.get("walletAddress");
  const status = searchParams.get("status");

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  try {
    // Fetch requests based on walletAddress and optional status
    const query: any = { walletAddress };
    if (status) {
      query.status = status;
    }

    const requests = await collection.find(query).toArray();

    return new NextResponse(JSON.stringify({ requests }), { status: 200 });
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error fetching requests" }),
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

export async function PATCH(req: Request) {
  const { walletAddress, nonce, newStatus } = await req.json();

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION_NAME);

  try {
    // Check if the request exists
    const existingRequest = await collection.findOne({ walletAddress, nonce });

    if (!existingRequest) {
      return new NextResponse(
        JSON.stringify({ message: "Request not found" }),
        { status: 404 }
      );
    }

    // Update the request status
    const result = await collection.updateOne(
      { walletAddress, nonce },
      { $set: { status: newStatus || "completed" } }
    );

    return new NextResponse(
      JSON.stringify({
        message: "Status updated successfully",
        modifiedCount: result.modifiedCount,
      }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ message: "Error updating status" }),
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

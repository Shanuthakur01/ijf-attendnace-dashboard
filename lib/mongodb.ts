import { MongoClient, Db } from "mongodb";
import dns from "dns";

// The system/corporate DNS (10.198.93.88) cannot resolve MongoDB Atlas SRV
// records. Override it with Google's public DNS for all dns.resolve* calls
// (which is what the MongoDB driver uses for mongodb+srv:// lookup).
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

const MONGO_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://its_kalyug:Kalyug%40123@attendance.b8l1yxk.mongodb.net/?appName=attendance";

const DB_NAME = "attendance_db";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
// Deduplicates concurrent connection attempts — only one TCP handshake at a time
let inFlight: Promise<Db> | null = null;

export async function getDb(): Promise<Db> {
  if (cachedClient && cachedDb) return cachedDb;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    // Close any stale client before reconnecting
    if (cachedClient) {
      try { await cachedClient.close(); } catch { /* ignore */ }
      cachedClient = null;
      cachedDb = null;
    }

    const client = new MongoClient(MONGO_URI, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS:         10_000,
      socketTimeoutMS:          15_000,
      maxPoolSize: 10,
      retryWrites: true,
      retryReads:  true,
    });

    try {
      await client.connect();
    } catch (err) {
      // Never cache a broken client
      cachedClient = null;
      cachedDb = null;
      throw err;
    } finally {
      inFlight = null;
    }

    cachedClient = client;
    cachedDb = client.db(DB_NAME);

    // Reset cache automatically if the connection drops later
    const reset = () => { cachedClient = null; cachedDb = null; inFlight = null; };
    client.on("close",        reset);
    client.on("error",        reset);
    client.on("serverClosed", reset);

    return cachedDb;
  })();

  return inFlight;
}
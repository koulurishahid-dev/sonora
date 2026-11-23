import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Node.js SRV resolution on Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore in environments where setting servers is restricted
}

const PRIMARY_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://koulurishahid148_db_user:4tXa7UeHS8Y43csd@cluster0.zap6gx4.mongodb.net/naapaatalu?retryWrites=true&w=majority';

// Direct replica set connection string fallback for Windows DNS issues
const FALLBACK_URI =
  'mongodb://koulurishahid148_db_user:4tXa7UeHS8Y43csd@ac-dpgnwd0-shard-00-00.zap6gx4.mongodb.net:27017,ac-dpgnwd0-shard-00-01.zap6gx4.mongodb.net:27017,ac-dpgnwd0-shard-00-02.zap6gx4.mongodb.net:27017/naapaatalu?ssl=true&replicaSet=atlas-568ck4-shard-0&authSource=admin&retryWrites=true&w=majority';

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose
      .connect(PRIMARY_URI, opts)
      .catch(async (primaryErr: any) => {
        // If SRV lookup fails on Windows DNS, retry with direct replica set hosts
        if (
          primaryErr?.message?.includes('querySrv') ||
          primaryErr?.message?.includes('ECONNREFUSED')
        ) {
          try {
            return await mongoose.connect(FALLBACK_URI, opts);
          } catch (fallbackErr: any) {
            throw fallbackErr;
          }
        }
        throw primaryErr;
      })
      .then(m => {
        return m;
      })
      .catch(err => {
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

export async function getDatabaseStatus(): Promise<{
  isConnected: boolean;
  dbName?: string;
  error?: string;
  collections?: string[];
}> {
  try {
    const conn = await connectToDatabase();
    const db = conn.connection.db;
    if (!db) {
      return { isConnected: false, error: 'Database instance not available' };
    }
    const cols = await db.listCollections().toArray();
    return {
      isConnected: true,
      dbName: conn.connection.name,
      collections: cols.map(c => c.name),
    };
  } catch (err: any) {
    let cleanMsg = err?.message || 'Failed to connect to MongoDB';
    if (cleanMsg.includes('whitelist') || cleanMsg.includes('SSL alert number 80')) {
      cleanMsg =
        'IP access restriction: Please add 0.0.0.0/0 (or your IP 106.192.211.218) in MongoDB Atlas Network Access.';
    }
    return {
      isConnected: false,
      error: cleanMsg,
    };
  }
}

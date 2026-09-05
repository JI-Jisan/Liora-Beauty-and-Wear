import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import mongoose from "mongoose";

const DEFAULT_SERVICE_ACCOUNT = {
  projectId: "liora-beauty",
  clientEmail: "firebase-adminsdk-fbsvc@liora-beauty.iam.gserviceaccount.com",
  privateKey: `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCvB/alBl+xt2eJ\nAcAED09w0eqBlTrU8s8bDNIwPI9/YJsujTheWnCg4qR4N2rGQILfUcgf93d4lHQL\n+U5ua/APF+kG+GICMKrw6i4ljUZthOYeqiHHvWq7ViJnSP6tsXXOyv894ltSsY2Q\nA18sznyRFq1B0zPwIGePMe8yp/GdiWMhZ3rX7ywszfY3j/07s2vt2FVTBHWin5YV\nfg58YcRJUUivR51y6zy5Al+KNsuBl6945xP6qqLQet+WvrLM+lejgPjRWXlrpg1u\nSRK2kmMEMH6FfH5RUuaqvXdlFSNTFSX1HplUSpl2WCdr7aQ/7hBpYR9Ywx1K113E\ntFWhMlVhAgMBAAECggEAFzzNQTs3kN5tclJB/hKoSdgHXx0tr+BCoG/ofJCgaS6t\nZkCdJ2MGHp39wZtzOLnk23rollyM8dHHwbU0yqfYObDDdnJF1M5FoPF+SexX2X9y\nQRz2RNCVhHnwMa/jvAdaQXz65mo7FJ9PpjsvCMGrO7n71kg7gNmp1hLbk76Z7ypP\nk5M1TgdNqsXJKxAmLcBdmBLPltTJ3drd1KMZH+AADFu9Q8UpZRzlk+T9VBRlyeRv\nvxhRgyhJ/1YpqfwgtPpjg41f8Iq8NP54dj7jS9X+Z2GfkbzIiZgE3v1AZ8C7KAo0\npR1q+gNgQjrOuAFMhUve0ab+ln6FLw04kcb8oDkwnwKBgQDZE5rRf6hFXfcYJGB8\nNkfxgnoCT9kBEex2tGy3qXGgSwJvgK62QBKoInIt56dFHJ6lYwlSNdScHImr26m8\ncr8Lzfl2y/HCuD1lrLghJE1Tokk2NvtKpUZHRAu1DPL3XiR1bu/VEsrJsR6UcXbv\n4pkXoAiRIipwesxsqqeOax0jxwKBgQDOalvsTGqhIiF9UFSxGHMxAdo7chnYVmbq\n9oLufiEHPfM85j6j0qkIcz1Wq8NizegE8gNXSOeWO1g3C9kIbK++5bXGZD5KEPoS\nfpXgJYzUQvwKnKFuVFHUivQ2gQlYwl31i3PNwudTmX3JZ9iaJrjc1GABzf8PXHHV\nYYU1CgXtlwKBgQC5ljdAcSGN3J4KN999knLDmcdx/o4KiiZd/jcMdoM8haSZa6zz\nB6hrsrdnY6vwPF2uDBPGA1u38/YHxg9Bm+CV2Q00cXxJ+3YSXS42t3Cc1hw9i5gf\n41lISHax3VZEAmqtM6E7y4swEIuSYcdLo7E7L4jjfBBIhdQL+4KxEgahtQKBgHkb\nxltaaqWoFOYln8tYgR2b7KM8SxW3fCMYB7JOpqpNGs38eXw9OZgPpUmY9cae8ScV\nqAgqalam8xc5CFn9CxCCTqjcX/+s/kyjoOQmo/5WXvMK+1x0dJ6z+J2SEB3XzLEo\n5QUw+fD++eKV32xyk7xdjwcACkrE/rUnxrRb8SZ5AoGACkzOCuz8eQVA+1eAhHKj\nJXQ6VHgBVPisOvQhm/yqk2cUAV8Op9eddZuEqcmlznWY03s0zIdznFrrBGvMJ7LX\nOltVAtI3QUCqwnPfGsMSVdzJwqIrMAyq/Ps+5ZaGKqb9zLhaDeaF81o+I9nu89Eq\nyX4WZUuG2SFUhjLkbUps4aw=\n-----END PRIVATE KEY-----\n`,
};

const MONGODB_URI = "mongodb://jisan_trends:liora889@ac-2e905xv-shard-00-00.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-01.6nzddbx.mongodb.net:27017,ac-2e905xv-shard-00-02.6nzddbx.mongodb.net:27017/jisantrends?ssl=true&replicaSet=atlas-12gikm-shard-0&authSource=admin&retryWrites=true&w=majority";

async function makeAdmin(targetEmail) {
  if (!targetEmail) {
    console.error("অনুগ্রহ করে ইমেইল দিন: node scripts/make-admin.mjs user@example.com");
    process.exit(1);
  }

  const cleanEmail = targetEmail.trim().toLowerCase();
  console.log(`Setting admin role for: ${cleanEmail}...`);

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(DEFAULT_SERVICE_ACCOUNT) });

  const auth = getAuth(app);

  try {
    const user = await auth.getUserByEmail(cleanEmail);
    // 1. Firebase Custom Claims এ role admin সেট করা
    await auth.setCustomUserClaims(user.uid, { role: "admin", admin: true });
    console.log(`✅ Firebase Custom Claim: ${cleanEmail} (UID: ${user.uid}) কে সফলভাবে ADMIN রোল দেওয়া হয়েছে!`);
  } catch (err) {
    console.log(`⚠️ Firebase Auth Note: ${err.message}. Mongo-তে চেক করা হচ্ছে...`);
  }

  // 2. MongoDB Admin কালেকশনে নিশ্চিত করা
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    await db.collection("admins").updateOne(
      { email: cleanEmail },
      { $set: { email: cleanEmail, name: "Liora Admin", password: "firebase_oauth_managed", updatedAt: new Date() } },
      { upsert: true }
    );
    console.log(`✅ MongoDB Admin Collection: ${cleanEmail} যুক্ত হয়েছে!`);
    await mongoose.disconnect();
  } catch (dbErr) {
    console.error("DB error:", dbErr.message);
  }

  console.log(`\n🎉 সম্পূর্ণ হয়েছে! এখন ${cleanEmail} দিয়ে লগইন করলে সে স্বয়ংক্রিয়ভাবে সরাসরি Admin Dashboard (/admin) এ প্রবেশ করবে।\n`);
  process.exit(0);
}

makeAdmin(process.argv[2]);

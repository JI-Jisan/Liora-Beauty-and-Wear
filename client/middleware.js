import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  const method = req.method;

  // ১. শুধুমাত্র API রাউটগুলোর জন্য এই গার্ড কাজ করবে
  if (path.startsWith('/api/')) {
    
    // ২. Login এবং Order Track API গুলোকে সবার জন্য উন্মুক্ত রাখতে হবে
    if (path.includes('/api/admin/login') || path.includes('/api/orders/track')) {
      return NextResponse.next();
    }

    // ৩. সাধারণ কাস্টমারদের প্রোডাক্ট ও ক্যাটাগরি দেখার (GET) পারমিশন আছে
    if (method === 'GET') {
      return NextResponse.next();
    }

    // ৪. POST, PUT, DELETE রিকোয়েস্টের ক্ষেত্রে কড়া চেকিং
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'Unauthorized! No Admin Token Found.' }, 
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    // আপনার .env ফাইলে থাকা সিক্রেট কি, না থাকলে ডিফল্ট কি
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "liora_secure_default_secret_key_2026"
    );

    try {
      // ৫. টোকেনটি আসল কি না তা চেক করা হচ্ছে
      await jwtVerify(token, secret);
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid or Expired Token! Hacker Blocked 🛑' }, 
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

// কোন কোন লিংকের জন্য এই ফাইল কাজ করবে, তার কনফিগারেশন
export const config = {
  matcher: ['/api/:path*'],
};

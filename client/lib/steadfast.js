import { connectToDatabase } from "@/lib/db";
import { SiteSettings } from "@/lib/models";

export const STEADFAST_BASE_URL =
  process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1";

/**
 * Retrieve Steadfast API credentials (env first, fallback to SiteSettings in MongoDB)
 */
export async function getSteadfastCredentials() {
  const envApi = process.env.STEADFAST_API_KEY;
  const envSecret = process.env.STEADFAST_SECRET_KEY;
  if (envApi && envSecret) {
    return { apiKey: envApi.trim(), secretKey: envSecret.trim() };
  }

  try {
    await connectToDatabase();
    const settings = await SiteSettings.findOne().lean();
    return {
      apiKey: (settings?.steadfastApiKey || "0koyfbb8k8ajlzftqcyy6if7q7gtlf7v").trim(),
      secretKey: (settings?.steadfastSecretKey || "ynq1gmj0kewqtrhy7wyubeeb").trim(),
    };
  } catch (err) {
    console.error("Error fetching Steadfast credentials from DB:", err);
    return {
      apiKey: "0koyfbb8k8ajlzftqcyy6if7q7gtlf7v",
      secretKey: "ynq1gmj0kewqtrhy7wyubeeb",
    };
  }
}

/**
 * Normalize Bangladeshi phone number to 11 digits (e.g. 01712345678)
 */
export function normalizeBdPhone(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/[^0-9]/g, "");
  if (digits.startsWith("8801")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("880")) {
    digits = digits.slice(2);
  }
  if (digits.length > 11 && digits.startsWith("0")) {
    digits = digits.slice(0, 11);
  }
  return digits;
}

/**
 * Create a new consignment / parcel on Steadfast Courier
 */
export async function createSteadfastOrder({
  invoice,
  recipient_name,
  recipient_phone,
  recipient_address,
  cod_amount,
  note = "",
  item_description = "",
}) {
  const { apiKey, secretKey } = await getSteadfastCredentials();
  if (!apiKey || !secretKey) {
    throw new Error("Steadfast API Key বা Secret Key কনফিগার করা নেই।");
  }

  const cleanPhone = normalizeBdPhone(recipient_phone);
  if (!cleanPhone || cleanPhone.length !== 11) {
    throw new Error(`প্রাপকের ফোন নম্বর ১১ ডিজিট হতে হবে। বর্তমান: "${recipient_phone}"`);
  }

  const cleanAddress = String(recipient_address || "").trim();
  if (!cleanAddress || cleanAddress.length < 5) {
    throw new Error("ডেলিভারি ঠিকানা অন্তত ৫ অক্ষরের হতে হবে।");
  }

  const cleanName = String(recipient_name || "").trim() || "Customer";
  const numCod = Math.max(0, Math.round(Number(cod_amount) || 0));

  const payload = {
    invoice: String(invoice).trim(),
    recipient_name: cleanName.slice(0, 95),
    recipient_phone: cleanPhone,
    recipient_address: cleanAddress.slice(0, 245),
    cod_amount: numCod,
    note: String(note || "LIORA Authentic Beauty & Wear").slice(0, 200),
  };

  if (item_description) {
    payload.item_description = String(item_description).slice(0, 150);
  }

  const response = await fetch(`${STEADFAST_BASE_URL}/create_order`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 200 && data.status === 200 && data.consignment) {
    return {
      success: true,
      message: data.message || "পার্সেল সফলভাবে তৈরি হয়েছে!",
      consignmentId: String(data.consignment.consignment_id),
      trackingCode: data.consignment.tracking_code,
      status: data.consignment.status || "in_review",
      raw: data,
    };
  }

  // Handle duplicate invoice or validation errors
  const errDetail =
    data.message ||
    (data.errors ? Object.values(data.errors).flat().join(", ") : "") ||
    `HTTP ${response.status} ত্রুটি`;
  throw new Error(`Steadfast বুকিং ব্যর্থ: ${errDetail}`);
}

/**
 * Check Steadfast Merchant Account Current Balance
 */
export async function getSteadfastBalance() {
  const { apiKey, secretKey } = await getSteadfastCredentials();
  const response = await fetch(`${STEADFAST_BASE_URL}/get_balance`, {
    headers: {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 200 && (data.status === 200 || typeof data.current_balance !== "undefined")) {
    return {
      success: true,
      currentBalance: Number(data.current_balance ?? 0),
    };
  }

  return {
    success: false,
    currentBalance: 0,
    message: data.message || "ব্যালেন্স জানতে সমস্যা হয়েছে",
  };
}

/**
 * Get live delivery status by Steadfast Tracking Code
 */
export async function getSteadfastStatusByTracking(trackingCode) {
  if (!trackingCode) return null;
  const { apiKey, secretKey } = await getSteadfastCredentials();
  const response = await fetch(
    `${STEADFAST_BASE_URL}/status_by_trackingcode/${encodeURIComponent(trackingCode.trim())}`,
    {
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  if (response.status === 200 && (data.status === 200 || data.delivery_status)) {
    return {
      success: true,
      deliveryStatus: data.delivery_status || "unknown",
      raw: data,
    };
  }

  return {
    success: false,
    message: data.message || "স্ট্যাটাস পাওয়া যায়নি",
  };
}


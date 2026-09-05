export const ZONES = {
  inside_dhaka: { label: "ঢাকা সিটির ভিতরে (Inside Dhaka)", charge: 70 },
  outside_dhaka: { label: "ঢাকার বাইরে - সারা বাংলাদেশ (Outside Dhaka)", charge: 130 },
};

// All 64 Districts of Bangladesh
export const BANGLADESH_DISTRICTS = [
  // Dhaka Division
  { id: "Dhaka", nameBn: "ঢাকা", nameEn: "Dhaka", isInsideDhaka: true },
  { id: "Gazipur", nameBn: "গাজীপুর", nameEn: "Gazipur", isInsideDhaka: false },
  { id: "Narayanganj", nameBn: "নারায়ণগঞ্জ", nameEn: "Narayanganj", isInsideDhaka: false },
  { id: "Tangail", nameBn: "টাঙ্গাইল", nameEn: "Tangail", isInsideDhaka: false },
  { id: "Kishoreganj", nameBn: "কিশোরগঞ্জ", nameEn: "Kishoreganj", isInsideDhaka: false },
  { id: "Manikganj", nameBn: "মানিকগঞ্জ", nameEn: "Manikganj", isInsideDhaka: false },
  { id: "Munshiganj", nameBn: "মুন্সীগঞ্জ", nameEn: "Munshiganj", isInsideDhaka: false },
  { id: "Narsingdi", nameBn: "নরসিংদী", nameEn: "Narsingdi", isInsideDhaka: false },
  { id: "Faridpur", nameBn: "ফরিদপুর", nameEn: "Faridpur", isInsideDhaka: false },
  { id: "Gopalganj", nameBn: "গোপালগঞ্জ", nameEn: "Gopalganj", isInsideDhaka: false },
  { id: "Madaripur", nameBn: "মাদারীপুর", nameEn: "Madaripur", isInsideDhaka: false },
  { id: "Rajbari", nameBn: "রাজবাড়ী", nameEn: "Rajbari", isInsideDhaka: false },
  { id: "Shariatpur", nameBn: "শরীয়তপুর", nameEn: "Shariatpur", isInsideDhaka: false },

  // Chattogram Division
  { id: "Chattogram", nameBn: "চট্টগ্রাম", nameEn: "Chattogram", isInsideDhaka: false },
  { id: "CoxsBazar", nameBn: "কক্সবাজার", nameEn: "Cox's Bazar", isInsideDhaka: false },
  { id: "Cumilla", nameBn: "কুমিল্লা", nameEn: "Cumilla", isInsideDhaka: false },
  { id: "Feni", nameBn: "ফেনী", nameEn: "Feni", isInsideDhaka: false },
  { id: "Brahmanbaria", nameBn: "ব্রাহ্মণবাড়িয়া", nameEn: "Brahmanbaria", isInsideDhaka: false },
  { id: "Noakhali", nameBn: "নোয়াখালী", nameEn: "Noakhali", isInsideDhaka: false },
  { id: "Chandpur", nameBn: "চাঁদপুর", nameEn: "Chandpur", isInsideDhaka: false },
  { id: "Lakshmipur", nameBn: "লক্ষ্মীপুর", nameEn: "Lakshmipur", isInsideDhaka: false },
  { id: "Rangamati", nameBn: "রাঙ্গামাটি", nameEn: "Rangamati", isInsideDhaka: false },
  { id: "Khagrachhari", nameBn: "খাগড়াছড়ি", nameEn: "Khagrachhari", isInsideDhaka: false },
  { id: "Bandarban", nameBn: "বান্দরবান", nameEn: "Bandarban", isInsideDhaka: false },

  // Rajshahi Division
  { id: "Rajshahi", nameBn: "রাজশাহী", nameEn: "Rajshahi", isInsideDhaka: false },
  { id: "Bogura", nameBn: "বগুড়া", nameEn: "Bogura", isInsideDhaka: false },
  { id: "Pabna", nameBn: "পাবনা", nameEn: "Pabna", isInsideDhaka: false },
  { id: "Sirajganj", nameBn: "সিরাজগঞ্জ", nameEn: "Sirajganj", isInsideDhaka: false },
  { id: "Naogaon", nameBn: "নওগাঁ", nameEn: "Naogaon", isInsideDhaka: false },
  { id: "Natore", nameBn: "নাটোর", nameEn: "Natore", isInsideDhaka: false },
  { id: "Chapainawabganj", nameBn: "চাঁপাইনবাবগঞ্জ", nameEn: "Chapainawabganj", isInsideDhaka: false },
  { id: "Joypurhat", nameBn: "জয়পুরহাট", nameEn: "Joypurhat", isInsideDhaka: false },

  // Khulna Division
  { id: "Khulna", nameBn: "খুলনা", nameEn: "Khulna", isInsideDhaka: false },
  { id: "Jashore", nameBn: "যশোর", nameEn: "Jashore", isInsideDhaka: false },
  { id: "Kushtia", nameBn: "কুষ্টিয়া", nameEn: "Kushtia", isInsideDhaka: false },
  { id: "Jhenaidah", nameBn: "ঝিনাইদহ", nameEn: "Jhenaidah", isInsideDhaka: false },
  { id: "Satkhira", nameBn: "সাতক্ষীরা", nameEn: "Satkhira", isInsideDhaka: false },
  { id: "Bagerhat", nameBn: "বাগেরহাট", nameEn: "Bagerhat", isInsideDhaka: false },
  { id: "Chuadanga", nameBn: "চুয়াডাঙ্গা", nameEn: "Chuadanga", isInsideDhaka: false },
  { id: "Meherpur", nameBn: "মেহেরপুর", nameEn: "Meherpur", isInsideDhaka: false },
  { id: "Magura", nameBn: "মাগুরা", nameEn: "Magura", isInsideDhaka: false },
  { id: "Narail", nameBn: "নড়াইল", nameEn: "Narail", isInsideDhaka: false },

  // Barishal Division
  { id: "Barishal", nameBn: "বরিশাল", nameEn: "Barishal", isInsideDhaka: false },
  { id: "Patuakhali", nameBn: "পটুয়াখালী", nameEn: "Patuakhali", isInsideDhaka: false },
  { id: "Bhola", nameBn: "ভোলা", nameEn: "Bhola", isInsideDhaka: false },
  { id: "Pirojpur", nameBn: "পিরোজপুর", nameEn: "Pirojpur", isInsideDhaka: false },
  { id: "Barguna", nameBn: "বরগুনা", nameEn: "Barguna", isInsideDhaka: false },
  { id: "Jhalokathi", nameBn: "ঝালকাঠি", nameEn: "Jhalokathi", isInsideDhaka: false },

  // Sylhet Division
  { id: "Sylhet", nameBn: "সিলেট", nameEn: "Sylhet", isInsideDhaka: false },
  { id: "Moulvibazar", nameBn: "মৌলভীবাজার", nameEn: "Moulvibazar", isInsideDhaka: false },
  { id: "Habiganj", nameBn: "হবিগঞ্জ", nameEn: "Habiganj", isInsideDhaka: false },
  { id: "Sunamganj", nameBn: "সুনামগঞ্জ", nameEn: "Sunamganj", isInsideDhaka: false },

  // Rangpur Division
  { id: "Rangpur", nameBn: "রংপুর", nameEn: "Rangpur", isInsideDhaka: false },
  { id: "Dinajpur", nameBn: "দিনাজপুর", nameEn: "Dinajpur", isInsideDhaka: false },
  { id: "Gaibandha", nameBn: "গাইবান্ধা", nameEn: "Gaibandha", isInsideDhaka: false },
  { id: "Kurigram", nameBn: "কুড়িগ্রাম", nameEn: "Kurigram", isInsideDhaka: false },
  { id: "Lalmonirhat", nameBn: "লালমনিরহাট", nameEn: "Lalmonirhat", isInsideDhaka: false },
  { id: "Nilphamari", nameBn: "নীলফামারী", nameEn: "Nilphamari", isInsideDhaka: false },
  { id: "Panchagarh", nameBn: "পঞ্চগড়", nameEn: "Panchagarh", isInsideDhaka: false },
  { id: "Thakurgaon", nameBn: "ঠাকুরগাঁও", nameEn: "Thakurgaon", isInsideDhaka: false },

  // Mymensingh Division
  { id: "Mymensingh", nameBn: "ময়মনসিংহ", nameEn: "Mymensingh", isInsideDhaka: false },
  { id: "Jamalpur", nameBn: "জামালপুর", nameEn: "Jamalpur", isInsideDhaka: false },
  { id: "Netrokona", nameBn: "নেত্রকোণা", nameEn: "Netrokona", isInsideDhaka: false },
  { id: "Sherpur", nameBn: "শেরপুর", nameEn: "Sherpur", isInsideDhaka: false },
];

export const getChargeByDistrict = (districtName) => {
  if (!districtName) return 70;
  const clean = String(districtName).trim().toLowerCase();
  if (clean === "dhaka" || clean === "ঢাকা" || clean.includes("dhaka city") || clean.includes("inside_dhaka")) {
    return 70;
  }
  return 130;
};

export const getCharge = (zoneOrDistrict) => {
  if (!zoneOrDistrict) return 70;
  const str = String(zoneOrDistrict).trim().toLowerCase();
  if (
    str === "inside_dhaka" ||
    str === "dhaka" ||
    str === "ঢাকা" ||
    str === "70" ||
    str === "65" ||
    str.includes("inside")
  ) {
    return 70;
  }
  return 130;
};

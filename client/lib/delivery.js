export const ZONES = {
  inside_dhaka: { label: "ঢাকা সিটির ভিতরে", charge: 65 },
  dhaka_sub: { label: "সাভার / কেরানীগঞ্জ / নারায়ণগঞ্জ / গাজীপুর", charge: 100 },
  outside_dhaka: { label: "ঢাকার বাইরে (সারা দেশ)", charge: 130 },
};

export const getCharge = (zone) => {
  if (zone && ZONES[zone]) {
    return ZONES[zone].charge;
  }
  if (Number(zone) === 65 || zone === "inside_dhaka" || zone === "65") return 65;
  if (Number(zone) === 100 || zone === "dhaka_sub" || zone === "100") return 100;
  if (Number(zone) === 110 || Number(zone) === 130 || zone === "outside_dhaka" || zone === "130") return 130;
  return ZONES.outside_dhaka.charge;
};

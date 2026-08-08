"use client";

export default function WhatsAppButton() {
  const phoneNumber = "8801837223147";
  const message =
    "Assalamu Alaikum, ami apnar website theke product niye jante chai.";

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
    message
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="jt-whatsapp-float"
      aria-label="Chat on WhatsApp"
    >
      WhatsApp
    </a>
  );
}
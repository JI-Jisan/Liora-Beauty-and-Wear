import nodemailer from "nodemailer";

function getTransporter() {
  const user =
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    process.env.EMAIL_USER;
  const pass =
    process.env.GMAIL_APP_PASS ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.SMTP_PASS ||
    process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendOrderConfirmationEmail(order) {
  try {
    const recipientEmail =
      order?.customerEmail ||
      order?.email ||
      order?.userEmail;

    if (!recipientEmail) {
      console.log("No recipient email found for order confirmation email, skipping.");
      return false;
    }

    const transporter = getTransporter();
    if (!transporter) {
      console.warn(
        "Email notification skipped: GMAIL_USER / GMAIL_APP_PASS not set in environment variables."
      );
      return false;
    }

    const orderNo = order.orderNumber || String(order._id);
    const customerName = order.customerName || "Valued Customer";
    const phone = order.phone || "";
    const address = order.address || "";
    const district = order.district || (order.deliveryZone?.includes("inside") ? "Dhaka" : "Outside Dhaka");
    const subtotal = Number(order.subtotal) || 0;
    const deliveryCharge = Number(order.deliveryCharge) || 0;
    const total = Number(order.total) || subtotal + deliveryCharge;
    const items = Array.isArray(order.items) ? order.items : [];

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://liorabeautyandwear.com";
    const trackingUrl = `${siteUrl}/order-tracking?orderId=${encodeURIComponent(orderNo)}`;

    const itemsRowsHtml = items
      .map(
        (it) => `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b;">
            <strong>${it.productName || it.name || "Product"}</strong>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #64748b; text-align: center;">
            ${it.quantity || 1}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #1e293b; text-align: right; font-weight: 600;">
            ৳${(Number(it.price) || 0) * (Number(it.quantity) || 1)}
          </td>
        </tr>
      `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ${orderNo}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); border: 1px solid #f1f5f9;">
                
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; border-bottom: 4px solid #e11d48;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px;">LIORA</h1>
                    <p style="margin: 4px 0 0 0; color: #f43f5e; font-size: 11px; font-weight: 700; letter-spacing: 2px;">BEAUTY & WEAR</p>
                    <div style="margin-top: 16px; display: inline-block; background-color: rgba(225, 29, 72, 0.15); border: 1px solid rgba(225, 29, 72, 0.4); border-radius: 20px; padding: 6px 16px;">
                      <span style="color: #ffffff; font-size: 13px; font-weight: 600;">🎉 আপনার অর্ডার নিশ্চিত হয়েছে!</span>
                    </div>
                  </td>
                </tr>

                <!-- Content Area -->
                <tr>
                  <td style="padding: 24px;">
                    <p style="margin: 0 0 8px; font-size: 15px; color: #0f172a; font-weight: 600;">প্রিয় ${customerName},</p>
                    <p style="margin: 0 0 20px; font-size: 13.5px; color: #475569; line-height: 1.6;">
                      Liora Beauty & Wear এ অর্ডার করার জন্য ধন্যবাদ! আমরা আপনার অর্ডারটি পেয়েছি এবং দ্রুততম সময়ে এটি ডেলিভারির ব্যবস্থা করছি।
                    </p>

                    <!-- Order ID Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td>
                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">অর্ডার নম্বর</span>
                            <div style="font-size: 16px; font-weight: 800; color: #e11d48; margin-top: 2px;">#${orderNo}</div>
                          </td>
                          <td align="right">
                            <span style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">পেমেন্ট মেথড</span>
                            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">ক্যাশ অন ডেলিভারি (COD)</div>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <!-- Items Summary -->
                    <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">অর্ডারের বিবরণ:</h3>
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px; border-collapse: collapse;">
                      <thead>
                        <tr style="background-color: #f1f5f9;">
                          <th align="left" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">প্রোডাক্ট</th>
                          <th align="center" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">পরিমাণ</th>
                          <th align="right" style="padding: 8px 12px; font-size: 11px; color: #475569; font-weight: 700;">মূল্য</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${itemsRowsHtml}
                      </tbody>
                    </table>

                    <!-- Pricing Calculation -->
                    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 14px 18px; margin-bottom: 24px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                        <tr>
                          <td style="padding-bottom: 6px; color: #475569;">সাবটোটাল:</td>
                          <td align="right" style="padding-bottom: 6px; color: #0f172a; font-weight: 600;">৳${subtotal}</td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 8px; color: #475569;">ডেলিভারি চার্জ (${district}):</td>
                          <td align="right" style="padding-bottom: 8px; color: #0f172a; font-weight: 600;">৳${deliveryCharge}</td>
                        </tr>
                        <tr style="border-top: 1px solid #fecdd3;">
                          <td style="padding-top: 8px; font-size: 15px; font-weight: 800; color: #e11d48;">সর্বমোট প্রদেয়:</td>
                          <td align="right" style="padding-top: 8px; font-size: 17px; font-weight: 800; color: #e11d48;">৳${total}</td>
                        </tr>
                      </table>
                    </div>

                    <!-- Delivery Information -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                      <h4 style="margin: 0 0 8px; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">ডেলিভারি ঠিকানা:</h4>
                      <div style="font-size: 13.5px; color: #1e293b; line-height: 1.5;">
                        <div><strong>নাম:</strong> ${customerName}</div>
                        <div><strong>মোবাইল:</strong> ${phone}</div>
                        <div><strong>জেলা:</strong> ${district}</div>
                        <div><strong>ঠিকানা:</strong> ${address}</div>
                      </div>
                    </div>

                    <!-- Track Order CTA Button -->
                    <div style="text-align: center; margin-bottom: 20px;">
                      <a href="${trackingUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 30px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);">
                        📦 লাইভ অর্ডার ট্র্যাক করুন (Track Order)
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f1f5f9; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; font-size: 12px; color: #64748b;">
                      কোনো প্রশ্ন থাকলে যোগাযোগ করুন: <a href="mailto:liorabeautyandwear@gmail.com" style="color: #e11d48; text-decoration: none;">liorabeautyandwear@gmail.com</a>
                    </p>
                    <p style="margin: 6px 0 0; font-size: 11px; color: #94a3b8;">
                      © ${new Date().getFullYear()} LIORA Beauty & Wear. All rights reserved.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: `"LIORA Beauty & Wear" <${process.env.GMAIL_USER || process.env.SMTP_USER}>`,
      to: recipientEmail,
      subject: `🎉 অর্ডার নিশ্চিত হয়েছে: #${orderNo} - LIORA Beauty & Wear`,
      html: emailHtml,
    });

    console.log(`Confirmation email sent to ${recipientEmail}: MessageId ${info.messageId}`);
    return true;
  } catch (err) {
    console.error("sendOrderConfirmationEmail error:", err?.message || err);
    return false;
  }
}

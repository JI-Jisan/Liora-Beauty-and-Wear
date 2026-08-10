/**
 * Notification Service Helper for LIORA Beauty & Wear
 * Handles SMS & Email notification triggers for orders.
 */

const sendOrderPlacedNotification = async (order) => {
  try {
    const smsMessage = `[LIORA Beauty & Wear] Order Placed! Dear ${order.customerName}, your order #${order.orderNumber} (Total: ${order.total} Tk) has been received. We will contact you soon for confirmation. Support: +8801837223147`;
    
    console.log("\n📲 [SMS NOTIFICATION DISPATCHED]");
    console.log(`TO: ${order.phone}`);
    console.log(`MESSAGE: ${smsMessage}\n`);

    return true;
  } catch (error) {
    console.error("SMS dispatch error:", error.message);
    return false;
  }
};

const sendStatusUpdateNotification = async (order) => {
  try {
    const smsMessage = `[LIORA Beauty & Wear] Update: Your order #${order.orderNumber} status is now: ${order.status.toUpperCase()}. Track order at: ${process.env.CLIENT_URL || 'https://liorabeautyandwear.com'}/order-tracking`;

    console.log("\n📲 [SMS STATUS UPDATE DISPATCHED]");
    console.log(`TO: ${order.phone}`);
    console.log(`STATUS: ${order.status}`);
    console.log(`MESSAGE: ${smsMessage}\n`);

    return true;
  } catch (error) {
    console.error("SMS status update error:", error.message);
    return false;
  }
};

module.exports = {
  sendOrderPlacedNotification,
  sendStatusUpdateNotification,
};

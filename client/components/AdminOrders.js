"use client";

import { useEffect, useState } from "react";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/orders");
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setOrders([]);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await fetch(`http://localhost:5001/api/orders/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      fetchOrders();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  return (
    <div className="jt-orders-list">
      {safeOrders.length === 0 ? (
        <p>No orders found</p>
      ) : (
        safeOrders.map((order) => (
          <div key={order._id} className="jt-order-card">
            <div className="jt-order-top">
              <div>
                <h4>{order.customerName}</h4>
                <p>Phone: {order.phone}</p>
                <p>Address: {order.address}</p>
                <p>Subtotal: {order.subtotal} Tk</p>
                <p>Delivery: {order.deliveryCharge} Tk</p>
                <p>
                  <strong>Total: {order.total} Tk</strong>
                </p>
              </div>

              <div>
                <span className="jt-order-status">{order.status}</span>
              </div>
            </div>

            <div className="jt-order-items">
              <h4>Products</h4>

              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <p key={index}>
                    {item.productName} — {item.quantity} × {item.price} Tk
                  </p>
                ))
              ) : (
                <p>No product items found</p>
              )}
            </div>

            <div style={{ marginTop: "14px" }}>
              <label style={{ fontWeight: "700", marginRight: "10px" }}>
                Update Status:
              </label>

              <select
                value={order.status}
                onChange={(e) => updateStatus(order._id, e.target.value)}
              >
                <option>Pending</option>
                <option>Confirmed</option>
                <option>Shipped</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
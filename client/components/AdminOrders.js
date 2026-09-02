"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";

const STATUS_OPTIONS = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      setMessage("");

      const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update order status");
      }

      setOrders((prev) =>
        prev.map((ord) => (ord._id === id ? { ...ord, status } : ord))
      );
      setMessage("Order status updated successfully!");
    } catch (error) {
      console.error("Failed to update status:", error);
      setMessage("Error updating status");
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMessage(""), 3500);
    }
  };

  const updateShippedBy = async (id, shippedBy) => {
    try {
      setUpdatingId(id);
      setMessage("");

      const res = await fetch(`${API_BASE_URL}/api/admin/orders/${id}/dispatch`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ shippedBy }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to reassign owner");
      }

      setOrders((prev) =>
        prev.map((ord) => (ord._id === id ? { ...ord, shippedBy } : ord))
      );
      setMessage(`✅ প্রেরণকারী '${shippedBy}' হিসেবে স্টক রিঅ্যাসাইন হয়েছে!`);
    } catch (error) {
      console.error("Failed to update shippedBy:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMessage(""), 3500);
    }
  };

  const deleteOrder = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this order?"
    );
    if (!confirmDelete) return;

    try {
      setUpdatingId(id);
      const res = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error("Failed to delete order");
      }

      setOrders((prev) => prev.filter((ord) => ord._id !== id));
      setMessage("Order deleted successfully!");
    } catch (error) {
      console.error("Failed to delete order:", error);
      setMessage("Error deleting order");
    } finally {
      setUpdatingId(null);
      setTimeout(() => setMessage(""), 3500);
    }
  };

  const handlePrintInvoice = (order) => {
    // একটি নতুন উইন্ডো বা পপ-আপ ওপেন হবে
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // কুরিয়ারের জন্য সুন্দর ইনভয়েস ডিজাইন
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order.orderNumber || order._id}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: #000; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { margin: 0 0 5px; font-size: 28px; }
            .details-box { border: 1px solid #000; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items th, .items td { border: 1px solid #000; padding: 10px; text-align: left; }
            .total-box { text-align: right; font-size: 18px; margin-top: 20px; }
            .cod-amount { font-size: 24px; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 10px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LIORA Beauty & Wear</h1>
            <p><strong>Order ID / Tracking:</strong> ${order.orderNumber || order._id}</p>
            <p>Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div class="details-box" style="flex: 1; margin-right: 20px;">
              <h3 style="margin-top: 0;">🚚 Delivery Details:</h3>
              <strong>Name:</strong> ${order.customerName}<br/><br/>
              <strong>Phone:</strong> ${order.phone}<br/><br/>
              <strong>Address:</strong> ${order.address}<br/><br/>
              ${order.note ? `<strong>Note:</strong> ${order.note}` : ''}
            </div>

            ${order.accessToken ? `
            <div style="text-align: center; border: 1px dashed #ccc; padding: 10px; border-radius: 8px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`https://liora-beauty-and-wear-seven.vercel.app/order/verify?no=${order.orderNumber}&k=${order.accessToken}`)}" alt="QR Code" width="110" height="110" />
              <p style="font-size: 11px; margin: 5px 0 0; color: #555;">স্ক্যান করে<br/>পণ্য মিলিয়ে নিন</p>
            </div>
            ` : ''}
          </div>

          <table class="items">
            <thead>
              <tr>
                <th>Product Name</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td>${item.productName || item.name}</td>
                  <td style="text-align: center;">${item.quantity || 1}</td>
                  <td style="text-align: right;">${(item.offerPrice || item.price) * (item.quantity || 1)} Tk</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-box">
            Subtotal: ${order.subtotal || order.total - (order.deliveryCharge || order.deliveryFee || 0)} Tk<br/>
            Delivery Charge: ${order.deliveryCharge || order.deliveryFee || 0} Tk<br/>
            <div class="cod-amount">
              Cash on Delivery (COD): ${order.total} Tk
            </div>
          </div>

          <script>
            // অটোমেটিক প্রিন্ট ডায়ালগ ওপেন হবে
            window.onload = function() { 
              window.print(); 
              // প্রিন্ট শেষে উইন্ডো ক্লোজ হয়ে যাবে (ঐচ্ছিক)
              // window.close(); 
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        filterStatus === "All" || order.status === filterStatus;

      const keyword = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        order.customerName?.toLowerCase().includes(keyword) ||
        order.phone?.toLowerCase().includes(keyword) ||
        order.orderNumber?.toLowerCase().includes(keyword) ||
        order._id?.toLowerCase().includes(keyword);

      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, searchTerm]);

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return { bg: "#FFF7ED", color: "#C2410C", border: "#FFEDD5" };
      case "Confirmed":
        return { bg: "#EFF6FF", color: "#1D4ED8", border: "#DBEAFE" };
      case "Shipped":
        return { bg: "#F5F3FF", color: "#6D28D9", border: "#DDD6FE" };
      case "Delivered":
        return { bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" };
      case "Cancelled":
        return { bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA" };
      default:
        return { bg: "#F8FAFC", color: "#475569", border: "#E2E8F0" };
    }
  };

  return (
    <div className="jt-admin-orders-container">
      {/* Header Bar with Search & Filter Tabs */}
      <div className="jt-orders-header-bar">
        <div className="jt-orders-search" style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Search by name, phone, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px" }}
          />
        </div>

        <div
          className="jt-orders-filter-tabs"
          style={{
            display: "flex",
            gap: "6px",
            overflowX: "auto",
            paddingBottom: "4px",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          <button
            type="button"
            className={`jt-tab ${filterStatus === "All" ? "active" : ""}`}
            onClick={() => setFilterStatus("All")}
            style={{
              flexShrink: 0,
              whiteSpace: "nowrap",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            All ({orders.length})
          </button>
          {STATUS_OPTIONS.map((st) => {
            const count = orders.filter((o) => o.status === st).length;
            return (
              <button
                key={st}
                type="button"
                className={`jt-tab ${filterStatus === st ? "active" : ""}`}
                onClick={() => setFilterStatus(st)}
                style={{
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {st} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {message && <div className="jt-orders-toast">{message}</div>}

      {/* Orders List */}
      {loading ? (
        <div className="jt-orders-loading">Loading recent orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="jt-orders-empty">
          <p>No orders found matching your filter.</p>
        </div>
      ) : (
        <div className="jt-orders-grid">
          {filteredOrders.map((order) => {
            const stColor = getStatusColor(order.status);

            return (
              <div key={order._id} className="jt-admin-order-card admin-card" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
                {/* Card Top: Order ID & Status Badge */}
                <div className="jt-admin-order-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <div className="jt-admin-order-meta" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}>
                    <span className="jt-order-num-tag" style={{ background: "#0f172a", color: "#fff", fontSize: "12px", padding: "4px 8px", borderRadius: "6px", fontWeight: "800" }}>
                      #{order.serial ? `${order.serial} | ` : ""}{order.orderNumber || order._id}
                    </span>
                    <span className="jt-order-date" style={{ fontSize: "11px", color: "#64748b" }}>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString("bn-BD")
                        : "Recent"}
                    </span>
                  </div>

                  <span
                    className="jt-admin-status-badge"
                    style={{
                      background: stColor.bg,
                      color: stColor.color,
                      borderColor: stColor.border,
                      fontSize: "11px",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontWeight: "800",
                    }}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Customer Details Grid */}
                <div className="jt-admin-order-body">
                  <div className="jt-customer-info-box">
                    <h5>Customer Details</h5>
                    <p>
                      <strong>Name:</strong> {order.customerName}
                    </p>
                    <p>
                      <strong>Phone:</strong> {order.phone}
                    </p>
                    <p style={{ wordBreak: "break-word" }}>
                      <strong>Address:</strong> {order.address}
                    </p>
                    {order.note && (
                      <p className="jt-order-note" style={{ wordBreak: "break-word" }}>
                        <strong>Note:</strong> {order.note}
                      </p>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="jt-order-items-box">
                    <h5>Ordered Items</h5>
                    <div className="jt-order-items-table">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => (
                          <div key={idx} className="jt-order-item-row">
                            <span className="jt-item-title">
                              {item.productName}
                            </span>
                            <span className="jt-item-qty">
                              {item.quantity} × {item.price} Tk
                            </span>
                            <strong className="jt-item-total">
                              {item.quantity * item.price} Tk
                            </strong>
                          </div>
                        ))
                      ) : (
                        <p className="jt-no-items">No item details</p>
                      )}
                    </div>

                    <div className="jt-order-price-breakdown">
                      <div>
                        Subtotal: <span>{order.subtotal} Tk</span> | Delivery:{" "}
                        <span>{order.deliveryCharge} Tk</span>
                      </div>
                      <div className="jt-grand-total">
                        Total Amount: <strong>{order.total} Tk (COD)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="jt-admin-order-footer" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <div className="jt-status-select-wrap">
                    <label>Status:</label>
                    <select
                      value={order.status}
                      disabled={updatingId === order._id}
                      onChange={(e) => updateStatus(order._id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="jt-status-select-wrap">
                    <label>কে পাঠাচ্ছে:</label>
                    <select
                      value={order.shippedBy || "Owner"}
                      disabled={updatingId === order._id}
                      onChange={(e) => updateShippedBy(order._id, e.target.value)}
                      style={{ borderColor: order.shippedBy === "Partner" ? "#8b5cf6" : "#cbd5e1" }}
                    >
                      <option value="Owner">আমি (Owner)</option>
                      <option value="Partner">পার্টনার (Partner)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handlePrintInvoice(order)}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginRight: "10px"
                    }}
                  >
                    🖨️ Print Invoice
                  </button>
                  <button
                    type="button"
                    className="jt-delete-order-btn"
                    disabled={updatingId === order._id}
                    onClick={() => deleteOrder(order._id)}
                  >
                    Delete Order
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
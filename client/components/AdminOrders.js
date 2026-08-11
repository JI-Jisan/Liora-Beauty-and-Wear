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
        <div className="jt-orders-search">
          <input
            type="text"
            placeholder="Search by customer name, phone, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="jt-orders-filter-tabs">
          <button
            type="button"
            className={`jt-tab ${filterStatus === "All" ? "active" : ""}`}
            onClick={() => setFilterStatus("All")}
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
              <div key={order._id} className="jt-admin-order-card">
                {/* Card Top: Order ID & Status Badge */}
                <div className="jt-admin-order-head">
                  <div className="jt-admin-order-meta">
                    <span className="jt-order-num-tag">
                      #{order.orderNumber || order._id}
                    </span>
                    <span className="jt-order-date">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Recent"}
                    </span>
                  </div>

                  <span
                    className="jt-admin-status-badge"
                    style={{
                      background: stColor.bg,
                      color: stColor.color,
                      borderColor: stColor.border,
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
                    <p>
                      <strong>Address:</strong> {order.address}
                    </p>
                    {order.note && (
                      <p className="jt-order-note">
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
                <div className="jt-admin-order-footer">
                  <div className="jt-status-select-wrap">
                    <label>Change Status:</label>
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
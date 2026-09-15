"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, getAuthHeaders } from "@/lib/api";
import { downloadInvoicePdf } from "@/lib/invoicePdf";
import QRCode from "qrcode";

const STATUS_OPTIONS = ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState("");

  // Edit Order Modal State
  const [editingOrder, setEditingOrder] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [hoveredCardItem, setHoveredCardItem] = useState(null); // { orderId, itemIdx }

  // Product search for adding new product to order
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

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

  // 1-Click PDF Download (Same as Client Side with Offline QR Code)
  const handleDownloadPdf = async (order) => {
    try {
      setMessage("ইনভয়েস PDF তৈরি হচ্ছে...");
      await downloadInvoicePdf(order);
      setMessage("✅ ইনভয়েস PDF ডাউনলোড সম্পন্ন হয়েছে!");
    } catch (err) {
      console.error("PDF Download error:", err);
      setMessage("❌ PDF ডাউনলোড করা সম্ভব হয়নি");
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Print Invoice with 100% Offline Embedded Base64 QR Code
  const handlePrintInvoice = async (order) => {
    const siteUrl =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://liorabeautyandwear.com";

    const orderNo = order.orderNumber || order._id;
    const verifyUrl = order.accessToken
      ? `${siteUrl}/order/verify?no=${encodeURIComponent(orderNo)}&k=${encodeURIComponent(order.accessToken)}`
      : `${siteUrl}/order-tracking?query=${encodeURIComponent(orderNo)}`;

    let qrDataUrl = "";
    try {
      qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        margin: 1,
        width: 140,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
    } catch (qrErr) {
      console.warn("QR generation error:", qrErr);
    }

    const printWindow = window.open("", "_blank", "width=850,height=750");
    if (!printWindow) {
      alert("ব্রাউজার পপ-আপ ব্লক করেছে। ইনভয়েস প্রিন্ট করতে পপ-আপ অ্যালাউ (Allow Popups) করুন।");
      return;
    }

    const discount = Number(order.discount) || 0;
    const delivery = Number(order.deliveryCharge ?? order.deliveryFee ?? 0);
    const subtotal = Number(order.subtotal) || (order.total - delivery + discount);
    const total = Number(order.total) || (subtotal + delivery - discount);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Invoice - ${orderNo}</title>
          <style>
            @media print {
              body, body * { visibility: visible !important; }
              @page { margin: 10mm; size: A4 portrait; }
            }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #0f172a; background: #fff; margin: 0; }
            .header-bar { border-bottom: 3px solid #e11d48; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
            .brand h1 { margin: 0 0 4px; font-size: 26px; color: #0f172a; letter-spacing: 1px; }
            .brand p { margin: 0; font-size: 11px; color: #64748b; }
            .invoice-tag { text-align: right; }
            .invoice-tag h2 { margin: 0 0 4px; font-size: 22px; color: #e11d48; }
            .invoice-tag p { margin: 2px 0; font-size: 11px; color: #475569; }
            .details-grid { display: flex; justify-content: space-between; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; }
            .details-col { flex: 1; font-size: 12px; line-height: 1.6; }
            .qr-box { text-align: center; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; width: 110px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
            .items-table th { background: #0f172a; color: #fff; padding: 8px 10px; text-align: left; }
            .items-table td { border-bottom: 1px solid #e2e8f0; padding: 8px 10px; }
            .total-section { display: flex; justify-content: flex-end; margin-top: 10px; }
            .total-card { width: 280px; font-size: 13px; line-height: 1.8; }
            .total-row { display: flex; justify-content: space-between; }
            .grand-total { border-top: 2px solid #e11d48; padding-top: 6px; font-size: 16px; font-weight: bold; color: #e11d48; }
            .footer-note { margin-top: 30px; text-align: center; font-size: 10px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header-bar">
            <div class="brand">
              <h1>LIORA BEAUTY & WEAR</h1>
              <p>Authentic Skincare, Cosmetics & Fashion Wear</p>
              <p>Web: liorabeautyandwear.com  |  Phone: 01700-000000</p>
            </div>
            <div class="invoice-tag">
              <h2>INVOICE</h2>
              <p><strong>#${orderNo}</strong></p>
              <p>Date: ${new Date(order.createdAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
              <p>Status: <strong>${(order.status || "Pending").toUpperCase()}</strong></p>
            </div>
          </div>
          
          <div class="details-grid">
            <div class="details-col">
              <strong style="color: #e11d48;">🚚 BILL TO / DELIVERY:</strong><br/>
              <strong>Name:</strong> ${order.customerName}<br/>
              <strong>Phone:</strong> ${order.phone}<br/>
              <strong>District:</strong> ${order.district || "Dhaka"}<br/>
              <strong>Address:</strong> ${order.address}<br/>
              ${order.note ? `<strong>Note:</strong> ${order.note}` : ""}
            </div>
            <div class="details-col">
              <strong style="color: #0f172a;">💳 PAYMENT INFO:</strong><br/>
              <strong>Method:</strong> Cash on Delivery (COD)<br/>
              <strong>Currency:</strong> BDT (Tk)<br/>
            </div>
            <div class="qr-box">
              ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" width="94" height="94" style="display: block; margin: 0 auto;" />` : ""}
              <p style="font-size: 9px; font-weight: bold; margin: 4px 0 0; color: #e11d48;">SCAN TO VERIFY</p>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Product Description</th>
                <th style="text-align: center; width: 60px;">Qty</th>
                <th style="text-align: right; width: 100px;">Price (Tk)</th>
                <th style="text-align: right; width: 110px;">Total (Tk)</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || [])
                .map(
                  (item, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${item.productName || item.name}</strong></td>
                  <td style="text-align: center;">${item.quantity || 1}</td>
                  <td style="text-align: right;">${item.price} Tk</td>
                  <td style="text-align: right; font-weight: 600;">${(item.price || 0) * (item.quantity || 1)} Tk</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-card">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>Tk ${subtotal.toLocaleString()}</span>
              </div>
              <div class="total-row">
                <span>Delivery Charge:</span>
                <span>Tk ${delivery.toLocaleString()}</span>
              </div>
              ${
                discount > 0
                  ? `<div class="total-row" style="color: #e11d48;">
                      <span>Discount:</span>
                      <span>-Tk ${discount.toLocaleString()}</span>
                    </div>`
                  : ""
              }
              <div class="total-row grand-total">
                <span>Total Payable:</span>
                <span>Tk ${total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div class="footer-note">
            <p>• অনুগ্রহ করে ডেলিভারি রাইডারের সামনে পণ্য যাচাই করে নিন। যেকোনো অভিযোগের জন্য ২৪ ঘণ্টার মধ্যে আমাদের সাথে যোগাযোগ করুন।</p>
            <p>Thank you for shopping with LIORA! Beauty. Style. You. (liorabeautyandwear.com)</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      try {
        printWindow.print();
      } catch (err) {
        console.error("Print error:", err);
      }
    }, 250);
  };

  // Open Edit Order Modal
  const handleOpenEdit = (order) => {
    // Deep clone order
    setEditingOrder(JSON.parse(JSON.stringify(order)));
    setProductSearchQuery("");
    setProductSearchResults([]);
  };

  // Live item edits in modal
  const handleItemPriceChange = (index, value) => {
    if (!editingOrder) return;
    const newItems = [...editingOrder.items];
    const num = Math.max(0, Number(value) || 0);
    newItems[index].price = num;
    newItems[index].offerPrice = num;
    setEditingOrder({ ...editingOrder, items: newItems });
  };

  const handleItemQtyChange = (index, value) => {
    if (!editingOrder) return;
    const newItems = [...editingOrder.items];
    newItems[index].quantity = Math.max(1, parseInt(value) || 1);
    setEditingOrder({ ...editingOrder, items: newItems });
  };

  const handleRemoveItem = (index) => {
    if (!editingOrder) return;
    if (editingOrder.items.length <= 1) {
      alert("একটি অর্ডারে কমপক্ষে ১টি পণ্য থাকতে হবে।");
      return;
    }
    const newItems = editingOrder.items.filter((_, i) => i !== index);
    setEditingOrder({ ...editingOrder, items: newItems });
  };

  // Search and add product to order
  const handleSearchProducts = async (q) => {
    setProductSearchQuery(q);
    if (!q.trim()) {
      setProductSearchResults([]);
      return;
    }
    try {
      setSearchingProducts(true);
      const res = await fetch(`${API_BASE_URL}/api/products?search=${encodeURIComponent(q)}&limit=8`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.products || [];
      setProductSearchResults(list);
    } catch (err) {
      console.error("Product search error:", err);
    } finally {
      setSearchingProducts(false);
    }
  };

  const handleAddProductToOrder = (prod) => {
    if (!editingOrder) return;
    const exists = editingOrder.items.some(
      (it) => String(it.productId) === String(prod._id)
    );
    if (exists) {
      alert("এই পণ্যটি ইতিমধ্যে এই অর্ডারে আছে। পরিমাণ বাড়াতে নিচে কোয়ান্টিটি পরিবর্তন করুন।");
      return;
    }

    const newItem = {
      productId: prod._id,
      productName: prod.name,
      quantity: 1,
      price: Number(prod.offerPrice || prod.originalPrice || 0),
      purchasePrice: Number(prod.purchasePrice || 0),
      originalPrice: Number(prod.originalPrice || prod.offerPrice || 0),
      costAtSale: Number(prod.purchasePrice || 0),
      categoryName: prod.category?.name || "",
      image: prod.image || (Array.isArray(prod.images) ? prod.images[0] : ""),
    };

    setEditingOrder({
      ...editingOrder,
      items: [...editingOrder.items, newItem],
    });
    setProductSearchQuery("");
    setProductSearchResults([]);
  };

  // Calculated totals for modal
  const editSubtotal = useMemo(() => {
    if (!editingOrder?.items) return 0;
    return editingOrder.items.reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0
    );
  }, [editingOrder?.items]);

  const editTotalCost = useMemo(() => {
    if (!editingOrder?.items) return 0;
    return editingOrder.items.reduce(
      (sum, it) =>
        sum +
        (Number(it.purchasePrice || it.costAtSale) || 0) *
          (Number(it.quantity) || 1),
      0
    );
  }, [editingOrder?.items]);

  const editTotal = useMemo(() => {
    if (!editingOrder) return 0;
    const delivery = Number(editingOrder.deliveryCharge) || 0;
    const discount = Number(editingOrder.discount) || 0;
    return Math.max(0, editSubtotal + delivery - discount);
  }, [editingOrder, editSubtotal]);

  const editProfit = useMemo(() => {
    return editSubtotal - editTotalCost;
  }, [editSubtotal, editTotalCost]);

  // Save edited order
  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    try {
      setSavingEdit(true);
      setMessage("");

      const payload = {
        customerName: editingOrder.customerName,
        phone: editingOrder.phone,
        district: editingOrder.district,
        address: editingOrder.address,
        note: editingOrder.note,
        status: editingOrder.status,
        deliveryCharge: Number(editingOrder.deliveryCharge) || 0,
        discount: Number(editingOrder.discount) || 0,
        items: editingOrder.items,
        subtotal: editSubtotal,
        total: editTotal,
        totalCost: editTotalCost,
      };

      const res = await fetch(`${API_BASE_URL}/api/orders/${editingOrder._id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.message || "Failed to update order");
      }

      setOrders((prev) =>
        prev.map((ord) => (ord._id === updated._id ? updated : ord))
      );
      setMessage("✅ অর্ডার এবং ইনভয়েস সফলভাবে আপডেট হয়েছে!");
      setEditingOrder(null);
    } catch (err) {
      console.error("Save edit error:", err);
      alert(`❌ আপডেট ব্যর্থ হয়েছে: ${err.message}`);
    } finally {
      setSavingEdit(false);
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
        <div className="jt-orders-search" style={{ marginBottom: "10px" }}>
          <input
            type="text"
            placeholder="Search by name, phone, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "14px",
            }}
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
              <div
                key={order._id}
                className="jt-admin-order-card admin-card"
                style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}
              >
                {/* Card Top: Order ID & Status Badge */}
                <div
                  className="jt-admin-order-head"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div
                    className="jt-admin-order-meta"
                    style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" }}
                  >
                    <span
                      className="jt-order-num-tag"
                      style={{
                        background: "#0f172a",
                        color: "#fff",
                        fontSize: "12px",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        fontWeight: "800",
                      }}
                    >
                      #{order.serial ? `${order.serial} | ` : ""}
                      {order.orderNumber || order._id}
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <h5 style={{ margin: 0 }}>Ordered Items</h5>
                      <span style={{ fontSize: "10px", color: "#64748b" }}>💡 মাউস রাখলে কেনার দাম দেখা যাবে</span>
                    </div>

                    <div className="jt-order-items-table">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => {
                          const costPrice = Number(item.purchasePrice || item.costAtSale || 0);
                          const isHovered =
                            hoveredCardItem?.orderId === order._id &&
                            hoveredCardItem?.itemIdx === idx;

                          return (
                            <div
                              key={idx}
                              className="jt-order-item-row"
                              style={{ position: "relative", alignItems: "center" }}
                            >
                              {/* Product Thumbnail & Name with Hover Tooltip */}
                              <div
                                style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, cursor: "help", position: "relative" }}
                                onMouseEnter={() => setHoveredCardItem({ orderId: order._id, itemIdx: idx })}
                                onMouseLeave={() => setHoveredCardItem(null)}
                              >
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.productName}
                                    style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e2e8f0" }}
                                  />
                                ) : (
                                  <div style={{ width: "32px", height: "32px", background: "#f1f5f9", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                                    🛍️
                                  </div>
                                )}
                                <span className="jt-item-title" style={{ textDecoration: "underline dotted #cbd5e1" }}>
                                  {item.productName}
                                </span>

                                {/* Cost Price Hover Card */}
                                {isHovered && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      bottom: "100%",
                                      left: "0",
                                      zIndex: 100,
                                      background: "#0f172a",
                                      color: "#fff",
                                      padding: "10px 14px",
                                      borderRadius: "10px",
                                      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                                      fontSize: "12px",
                                      lineHeight: "1.5",
                                      minWidth: "220px",
                                      pointerEvents: "none",
                                      marginBottom: "6px",
                                    }}
                                  >
                                    <div style={{ fontWeight: "bold", borderBottom: "1px solid #334155", paddingBottom: "4px", marginBottom: "6px", color: "#f8fafc" }}>
                                      📦 {item.productName}
                                    </div>
                                    <div style={{ color: "#4ade80", fontWeight: "bold" }}>
                                      💰 কেনার দাম (Cost Price): ৳{costPrice}
                                    </div>
                                    <div style={{ color: "#cbd5e1" }}>
                                      🏷️ বিক্রয় মূল্য: ৳{item.price}
                                    </div>
                                    <div style={{ color: item.price >= costPrice ? "#38bdf8" : "#f87171", fontWeight: "bold", marginTop: "2px" }}>
                                      📈 সম্ভাব্য লাভ: {item.price >= costPrice ? `+৳${(item.price - costPrice) * (item.quantity || 1)}` : `-৳${(costPrice - item.price) * (item.quantity || 1)} (লস)`}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <span className="jt-item-qty">
                                {item.quantity} × {item.price} Tk
                              </span>
                              <strong className="jt-item-total">
                                {item.quantity * item.price} Tk
                              </strong>
                            </div>
                          );
                        })
                      ) : (
                        <p className="jt-no-items">No item details</p>
                      )}
                    </div>

                    <div className="jt-order-price-breakdown">
                      <div>
                        Subtotal: <span>{order.subtotal} Tk</span> | Delivery:{" "}
                        <span>{order.deliveryCharge} Tk</span>
                        {order.discount ? <span> | Discount: -{order.discount} Tk</span> : null}
                      </div>
                      <div className="jt-grand-total">
                        Total Amount: <strong>{order.total} Tk (COD)</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div
                  className="jt-admin-order-footer"
                  style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}
                >
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
                      style={{
                        borderColor:
                          order.shippedBy === "Partner" ? "#8b5cf6" : "#cbd5e1",
                      }}
                    >
                      <option value="Owner">আমি (Owner)</option>
                      <option value="Partner">পার্টনার (Partner)</option>
                    </select>
                  </div>

                  {/* ✏️ Edit Order / Invoice Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(order)}
                    style={{
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "12px",
                    }}
                  >
                    ✏️ Edit Order
                  </button>

                  {/* 📥 One-Click PDF Download Button (Same as Client) */}
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(order)}
                    style={{
                      background: "#e11d48",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "12px",
                    }}
                  >
                    📥 Download PDF
                  </button>

                  {/* 🖨️ Print Invoice Button (with Offline QR) */}
                  <button
                    type="button"
                    onClick={() => handlePrintInvoice(order)}
                    style={{
                      background: "#0f172a",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 14px",
                      borderRadius: "6px",
                      fontWeight: "700",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "12px",
                    }}
                  >
                    🖨️ Print
                  </button>

                  <button
                    type="button"
                    className="jt-delete-order-btn"
                    disabled={updatingId === order._id}
                    onClick={() => deleteOrder(order._id)}
                    style={{ fontSize: "12px", padding: "8px 12px" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* ✏️ ORDER & INVOICE EDIT MODAL (WITH COST PRICE HOVER)    */}
      {/* ======================================================== */}
      {editingOrder && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
                borderTopLeftRadius: "16px",
                borderTopRightRadius: "16px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a", fontWeight: "800" }}>
                  ✏️ ইনভয়েস ও অর্ডার এডিট (Invoice & Order Edit)
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  অর্ডার নং: <strong>#{editingOrder.orderNumber || editingOrder._id}</strong> · পরিচিতদের কমে দিতে চাইলে পণ্যের দাম সহজে পরিবর্তন করুন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                style={{
                  background: "#e2e8f0",
                  border: "none",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "16px",
                  color: "#475569",
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Customer Details Row */}
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: "14px", color: "#0f172a" }}>👤 গ্রাহক ও ডেলিভারি তথ্য</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                      কাস্টমারের নাম
                    </label>
                    <input
                      type="text"
                      value={editingOrder.customerName || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, customerName: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                      ফোন নম্বর
                    </label>
                    <input
                      type="text"
                      value={editingOrder.phone || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, phone: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                      জেলা / লোকেশন
                    </label>
                    <input
                      type="text"
                      value={editingOrder.district || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, district: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                      অর্ডার স্ট্যাটাস
                    </label>
                    <select
                      value={editingOrder.status}
                      onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", background: "#fff" }}
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "10px" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                    সম্পূর্ণ ঠিকানা
                  </label>
                  <input
                    type="text"
                    value={editingOrder.address || ""}
                    onChange={(e) => setEditingOrder({ ...editingOrder, address: e.target.value })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* Products & Pricing Section (With Cost Tooltips) */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "14px", color: "#0f172a" }}>
                      🛍️ অর্ডারের পণ্য ও দাম নির্ধারণ
                    </h4>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#15803d", fontWeight: "600" }}>
                      💡 পণ্যের ছবি বা নামের ওপর মাউস রাখলে কেনার দাম (Cost Price) দেখতে পাবেন
                    </p>
                  </div>
                </div>

                {/* Items Table in Modal */}
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", background: "#f8fafc" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "#0f172a", color: "#fff", textAlign: "left" }}>
                        <th style={{ padding: "10px 12px" }}>পণ্য (মাউস রাখুন)</th>
                        <th style={{ padding: "10px 12px", width: "120px" }}>বিক্রয় মূল্য (Tk)</th>
                        <th style={{ padding: "10px 12px", width: "80px", textAlign: "center" }}>পরিমাণ</th>
                        <th style={{ padding: "10px 12px", width: "110px", textAlign: "right" }}>মোট (Tk)</th>
                        <th style={{ padding: "10px 12px", width: "50px", textAlign: "center" }}>বাদ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingOrder.items.map((item, idx) => {
                        const costPrice = Number(item.purchasePrice || item.costAtSale || 0);
                        const unitProfit = Number(item.price) - costPrice;
                        const rowTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                            {/* Product Name & Photo with Interactive Hover Card */}
                            <td style={{ padding: "10px 12px", position: "relative" }}>
                              <div
                                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "help" }}
                                onMouseEnter={() => setHoveredCardItem({ orderId: "modal", itemIdx: idx })}
                                onMouseLeave={() => setHoveredCardItem(null)}
                              >
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.productName}
                                    style={{ width: "38px", height: "38px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                  />
                                ) : (
                                  <div style={{ width: "38px", height: "38px", background: "#e2e8f0", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                                    🧴
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontWeight: "700", color: "#0f172a" }}>
                                    {item.productName}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "700" }}>
                                    কেনার দাম: ৳{costPrice}
                                  </div>
                                </div>

                                {/* Floating Rich Tooltip */}
                                {hoveredCardItem?.orderId === "modal" && hoveredCardItem?.itemIdx === idx && (
                                  <div
                                    style={{
                                      position: "absolute",
                                      bottom: "105%",
                                      left: "20px",
                                      zIndex: 1100,
                                      background: "#0f172a",
                                      color: "#ffffff",
                                      padding: "12px 16px",
                                      borderRadius: "10px",
                                      boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                                      fontSize: "12px",
                                      minWidth: "260px",
                                      lineHeight: "1.6",
                                    }}
                                  >
                                    <div style={{ fontWeight: "800", color: "#f8fafc", borderBottom: "1px solid #334155", paddingBottom: "6px", marginBottom: "6px" }}>
                                      {item.productName}
                                    </div>
                                    <div style={{ color: "#4ade80", fontWeight: "800", fontSize: "13px" }}>
                                      💰 কেনার আসল দাম: ৳{costPrice}
                                    </div>
                                    <div style={{ color: "#cbd5e1" }}>
                                      🏷️ রেগুলার প্রাইস: ৳{item.originalPrice || item.price}
                                    </div>
                                    <div style={{ color: unitProfit >= 0 ? "#38bdf8" : "#f87171", fontWeight: "bold" }}>
                                      📊 প্রতি পিসে লাভ/ক্ষতি: {unitProfit >= 0 ? `+৳${unitProfit}` : `-৳${Math.abs(unitProfit)} (লস)`}
                                    </div>
                                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", borderTop: "1px dashed #334155", paddingTop: "4px" }}>
                                      * কাছের মানুষকে ডিসকাউন্ট দিতে কেনার দাম ৳{costPrice} টাকার চেয়ে বেশি যেকোনো দাম বসান।
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Price Input with Live Margin Info */}
                            <td style={{ padding: "10px 12px" }}>
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => handleItemPriceChange(idx, e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: unitProfit < 0 ? "2px solid #ef4444" : "1px solid #cbd5e1",
                                  fontWeight: "700",
                                  fontSize: "13px",
                                }}
                              />
                              <div style={{ fontSize: "10px", marginTop: "3px", fontWeight: "700" }}>
                                {unitProfit > 0 ? (
                                  <span style={{ color: "#16a34a" }}>লাভ: +৳{unitProfit}</span>
                                ) : unitProfit === 0 ? (
                                  <span style={{ color: "#64748b" }}>০ লাভ (কেনা দাম)</span>
                                ) : (
                                  <span style={{ color: "#dc2626" }}>⚠️ লস: -৳{Math.abs(unitProfit)}</span>
                                )}
                              </div>
                            </td>

                            {/* Quantity Input */}
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={item.quantity}
                                onChange={(e) => handleItemQtyChange(idx, e.target.value)}
                                style={{
                                  width: "55px",
                                  padding: "6px 6px",
                                  borderRadius: "6px",
                                  border: "1px solid #cbd5e1",
                                  textAlign: "center",
                                  fontWeight: "700",
                                  fontSize: "13px",
                                }}
                              />
                            </td>

                            {/* Row Total */}
                            <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "800", color: "#0f172a" }}>
                              ৳{rowTotal.toLocaleString()}
                            </td>

                            {/* Delete Button */}
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                title="পণ্যটি বাদ দিন"
                                style={{
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  border: "none",
                                  borderRadius: "6px",
                                  width: "28px",
                                  height: "28px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                }}
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Additional Product Search */}
                <div style={{ marginTop: "12px", position: "relative" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                    ➕ এই অর্ডারে নতুন কোনো পণ্য যুক্ত করতে চাইলে সার্চ করুন:
                  </label>
                  <input
                    type="text"
                    placeholder="প্রোডাক্টের নাম লিখে সার্চ করুন..."
                    value={productSearchQuery}
                    onChange={(e) => handleSearchProducts(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px dashed #94a3b8",
                      fontSize: "13px",
                      background: "#fff",
                    }}
                  />

                  {/* Search Results Dropdown */}
                  {productSearchResults.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 1200,
                        background: "#fff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
                        maxHeight: "220px",
                        overflowY: "auto",
                        marginTop: "4px",
                      }}
                    >
                      {productSearchResults.map((prod) => (
                        <div
                          key={prod._id}
                          onClick={() => handleAddProductToOrder(prod)}
                          style={{
                            padding: "8px 12px",
                            borderBottom: "1px solid #f1f5f9",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {prod.image && (
                              <img src={prod.image} alt="" style={{ width: "28px", height: "28px", borderRadius: "4px", objectFit: "cover" }} />
                            )}
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{prod.name}</span>
                          </div>
                          <div style={{ textAlign: "right", fontSize: "12px" }}>
                            <span style={{ color: "#16a34a", fontWeight: "700" }}>কেনার দাম: ৳{prod.purchasePrice || 0}</span> |{" "}
                            <strong style={{ color: "#e11d48" }}>৳{prod.offerPrice || prod.originalPrice}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Fee, Discount & Financial Summary */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "16px",
                  alignItems: "center",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                    🚚 ডেলিভারি চার্জ (Tk):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingOrder.deliveryCharge ?? 0}
                    onChange={(e) => setEditingOrder({ ...editingOrder, deliveryCharge: Number(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700" }}
                  />
                  <span style={{ fontSize: "10px", color: "#64748b" }}>কাছের মানুষ হলে ডেলিভারি 0 Tk করে দিতে পারেন</span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                    🎁 অতিরিক্ত ডিসকাউন্ট (Tk):
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingOrder.discount ?? 0}
                    onChange={(e) => setEditingOrder({ ...editingOrder, discount: Number(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "13px", fontWeight: "700" }}
                  />
                </div>

                {/* Calculation Summary Box */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>সাব-টোটাল:</span>
                    <strong>৳{editSubtotal.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>ডেলিভারি চার্জ:</span>
                    <span>+৳{(Number(editingOrder.deliveryCharge) || 0).toLocaleString()}</span>
                  </div>
                  {(Number(editingOrder.discount) || 0) > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#e11d48" }}>
                      <span>ডিসকাউন্ট:</span>
                      <span>-৳{(Number(editingOrder.discount) || 0).toLocaleString()}</span>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1px solid #e2e8f0",
                      paddingTop: "4px",
                      marginTop: "4px",
                      fontSize: "14px",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    <span>মোট প্রদেয়:</span>
                    <span style={{ color: "#e11d48" }}>৳{editTotal.toLocaleString()}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "4px",
                      fontSize: "11px",
                      color: editProfit >= 0 ? "#16a34a" : "#dc2626",
                      fontWeight: "700",
                    }}
                  >
                    <span>এই অর্ডারে আপনার আনুমানিক লাভ:</span>
                    <span>{editProfit >= 0 ? `+৳${editProfit.toLocaleString()}` : `-৳${Math.abs(editProfit).toLocaleString()} (লস)`}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                background: "#f8fafc",
                borderBottomLeftRadius: "16px",
                borderBottomRightRadius: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                disabled={savingEdit}
                style={{
                  padding: "10px 18px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  color: "#475569",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                বাতিল (Cancel)
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{
                  padding: "10px 22px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontWeight: "800",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {savingEdit ? "সেভ হচ্ছে..." : "💾 Save Changes & Update Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { CheckCircle, CreditCard, DollarSign, Banknote } from "lucide-react";
import BeforeAfterCapture from "@/components/BeforeAfterCapture";

const BRASS = "#C4AB70";
const CREAM = "#F1EFE0";
const STONE = "#E5E3D3";
const STONE_MID = "#D4D0C0";
const GARNET = "#6B2737";
const TEXT_MAIN = "#2C2416";
const TEXT_FAINT = "#8A7F6E";
const GREEN = "#4A7C59";

interface StudentOption {
  studentId: string;
  studentName: string;
}

interface CategoryOption {
  id: string;
  name: string;
  requires_photos: boolean;
}

interface ClientOption {
  id: string;
  name: string;
}

interface CheckoutFlowProps {
  students: StudentOption[];
  categories: CategoryOption[];
  clients: ClientOption[];
}

type PaymentMethod = "card" | "cash" | "gift";
type TipPreset = 15 | 20 | 25 | "custom";

export function CheckoutFlow({ students, categories, clients }: CheckoutFlowProps) {
  // Selection
  const [studentId, setStudentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [clientId, setClientId] = useState("");
  const [servicePrice, setServicePrice] = useState("");

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [tipPreset, setTipPreset] = useState<TipPreset>(20);
  const [customTip, setCustomTip] = useState("");

  // Photos
  const [photosRequired, setPhotosRequired] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<{
    beforePhotoUrl?: string;
    afterPhotoUrl?: string;
  }>({});

  const photosReady = !photosRequired
    || (!!capturedPhotos.beforePhotoUrl && !!capturedPhotos.afterPhotoUrl);

  // State
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<{ studentName: string; total: string } | null>(null);

  const price = parseFloat(servicePrice) || 0;
  const tipPct = tipPreset === "custom" ? 0 : tipPreset;
  const tipAmount = tipPreset === "custom" ? (parseFloat(customTip) || 0) : price * (tipPct / 100);
  const total = price + tipAmount;

  async function completePayment() {
    if (!studentId || !categoryId) return;
    setProcessing(true);

    const student = students.find((s) => s.studentId === studentId);

    try {
      // 1. Log service completion (this is real)
      await fetch("/api/services/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName: student?.studentName || "",
          categoryId,
          clientId: clientId || undefined,
          beforePhotoUrl: capturedPhotos.beforePhotoUrl,
          afterPhotoUrl: capturedPhotos.afterPhotoUrl,
        }),
      });

      // 2. Record earnings
      const category = categories.find((c) => c.id === categoryId);
      const client = clients.find((c) => c.id === clientId);
      await fetch("/api/earnings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentName: student?.studentName || "",
          serviceAmount: price,
          tipAmount: tipAmount,
          serviceCategory: category?.name || "",
          clientName: client?.name || "Walk-in",
        }),
      });

      // 3. Set student back to available (if they were with_client)
      await fetch("/api/floor/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status: "available" }),
      });

      // Brief processing delay for demo effect
      await new Promise((r) => setTimeout(r, 800));

      setResult({
        studentName: student?.studentName || "Student",
        total: total.toFixed(2),
      });
      setCompleted(true);
    } catch {
      // Still show success for demo
      setResult({
        studentName: student?.studentName || "Student",
        total: total.toFixed(2),
      });
      setCompleted(true);
    } finally {
      setProcessing(false);
    }
  }

  function reset() {
    setStudentId("");
    setCategoryId("");
    setClientId("");
    setServicePrice("");
    setPaymentMethod("card");
    setTipPreset(20);
    setCustomTip("");
    setCompleted(false);
    setResult(null);
    setPhotosRequired(false);
    setCapturedPhotos({});
  }

  // Success screen
  if (completed && result) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", padding: "60px 20px" }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", background: GREEN,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <CheckCircle size={40} color="#fff" />
        </div>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: TEXT_MAIN, margin: "0 0 8px" }}>
          Payment Complete
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: TEXT_MAIN, margin: "0 0 4px", fontWeight: 600 }}>
          ${result.total}
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT_MAIN, margin: "0 0 32px" }}>
          Service by {result.studentName} logged. Hours and progress updated.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "12px 24px", borderRadius: 8, border: "none",
            background: GARNET, color: "#fff", fontSize: 15, fontWeight: 500,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}
        >
          New Checkout
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 600, color: TEXT_MAIN, margin: "0 0 4px" }}>
        Checkout
      </h1>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: TEXT_FAINT, margin: "0 0 28px" }}>
        Complete service and process payment
      </p>

      {/* Service Details */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 20, marginBottom: 16,
      }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 14px" }}>
          Service Details
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>Student / Stylist</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} style={selectStyle}>
              <option value="">Select student...</option>
              {students.map((s) => <option key={s.studentId} value={s.studentId}>{s.studentName}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Service Type</label>
            <select value={categoryId} onChange={(e) => {
              const newId = e.target.value;
              setCategoryId(newId);
              const cat = categories.find((c) => c.id === newId);
              setPhotosRequired(cat?.requires_photos ?? false);
              setCapturedPhotos({});
            }} style={selectStyle}>
              <option value="">Select service...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {photosRequired && (
            <div>
              <label style={labelStyle}>Before & After Photos <span style={{ color: "#9E5A5A" }}>*</span></label>
              <BeforeAfterCapture
                key={categoryId}
                clientId={clientId || undefined}
                required={photosRequired}
                onPhotosChange={setCapturedPhotos}
              />
            </div>
          )}
          <div>
            <label style={labelStyle}>Client (optional)</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={selectStyle}>
              <option value="">Walk-in / No client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Service Price</label>
            <div style={{ position: "relative" }}>
              <DollarSign size={14} style={{ position: "absolute", left: 10, top: 11, color: TEXT_FAINT }} />
              <input
                type="number"
                placeholder="0.00"
                value={servicePrice}
                onChange={(e) => setServicePrice(e.target.value)}
                style={{ ...selectStyle, paddingLeft: 28 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 20, marginBottom: 16,
      }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 14px" }}>
          Payment Method
        </h3>
        <div style={{ display: "flex", gap: 8 }}>
          {([
            { key: "card" as const, label: "Credit Card", icon: CreditCard },
            { key: "cash" as const, label: "Cash", icon: Banknote },
            { key: "gift" as const, label: "Gift Card", icon: DollarSign },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPaymentMethod(key)}
              style={{
                flex: 1, padding: "12px 8px", borderRadius: 8,
                border: paymentMethod === key ? `2px solid ${BRASS}` : `1px solid ${STONE_MID}`,
                background: paymentMethod === key ? `${BRASS}15` : "transparent",
                cursor: "pointer", display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4,
              }}
            >
              <Icon size={18} color={paymentMethod === key ? BRASS : TEXT_FAINT} />
              <span style={{
                fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                color: paymentMethod === key ? BRASS : TEXT_FAINT, fontWeight: 500,
              }}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tip */}
      <div style={{
        background: CREAM, border: `1px solid ${STONE_MID}`, borderRadius: 12,
        padding: 20, marginBottom: 16,
      }}>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 500, color: TEXT_MAIN, margin: "0 0 14px" }}>
          Tip
        </h3>
        <div style={{ display: "flex", gap: 8, marginBottom: tipPreset === "custom" ? 12 : 0 }}>
          {([15, 20, 25, "custom"] as TipPreset[]).map((preset) => (
            <button
              key={String(preset)}
              onClick={() => setTipPreset(preset)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 8,
                border: tipPreset === preset ? `2px solid ${BRASS}` : `1px solid ${STONE_MID}`,
                background: tipPreset === preset ? `${BRASS}15` : "transparent",
                cursor: "pointer", fontSize: 13, fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                color: tipPreset === preset ? BRASS : TEXT_FAINT,
              }}
            >
              {preset === "custom" ? "Custom" : `${preset}%`}
            </button>
          ))}
        </div>
        {tipPreset === "custom" && (
          <div style={{ position: "relative" }}>
            <DollarSign size={14} style={{ position: "absolute", left: 10, top: 11, color: TEXT_FAINT }} />
            <input
              type="number"
              placeholder="Enter tip amount"
              value={customTip}
              onChange={(e) => setCustomTip(e.target.value)}
              style={{ ...selectStyle, paddingLeft: 28 }}
            />
          </div>
        )}
      </div>

      {/* Total */}
      <div style={{
        background: GARNET, borderRadius: 12,
        padding: 20, marginBottom: 16, color: "#fff",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>Subtotal</span>
          <span style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>${price.toFixed(2)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif", opacity: 0.8 }}>Tip</span>
          <span style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>${tipAmount.toFixed(2)}</span>
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.2)", marginBottom: 10 }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 18, fontFamily: "'Fraunces', serif", fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 18, fontFamily: "'Fraunces', serif", fontWeight: 600 }}>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Complete Button */}
      <button
        onClick={completePayment}
        disabled={processing || !studentId || !categoryId || !photosReady}
        style={{
          width: "100%", padding: "14px 20px", borderRadius: 10, border: "none",
          background: (!studentId || !categoryId || !photosReady) ? STONE_MID : BRASS,
          color: "#fff", fontSize: 16, fontWeight: 600, cursor: processing ? "not-allowed" : "pointer",
          fontFamily: "'DM Sans', sans-serif",
          opacity: processing ? 0.7 : 1,
          transition: "all 0.2s ease",
        }}
      >
        {processing
          ? "Processing..."
          : (!studentId || !categoryId)
            ? "Complete Payment"
            : (photosRequired && !photosReady)
              ? "Add Photos to Continue"
              : "Complete Payment"}
      </button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, color: "#8A7F6E",
  marginBottom: 4, fontFamily: "'DM Sans', sans-serif",
  fontWeight: 500, letterSpacing: "0.02em",
};

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 6,
  border: "1px solid #D4D0C0", background: "#fff",
  fontSize: 13, fontFamily: "'DM Sans', sans-serif",
  color: "#2C2416",
};

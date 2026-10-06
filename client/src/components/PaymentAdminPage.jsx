import { useEffect, useState } from "react";
import { api } from "../api";

const initialSettings = {
  mode: "test",
  promptpay: { enabled: false, receiverId: "" },
  card: { enabled: false, provider: "stripe", publicKey: "", secretKey: "", webhookSecret: "", secretKeyMasked: "", webhookSecretMasked: "", hasSecret: false, hasWebhookSecret: false },
  bankTransfer: { enabled: false, bankName: "", accountNumber: "", accountName: "" },
};

const currency = (amount) => `฿${Number(amount || 0).toLocaleString("th-TH")}`;
const statusLabel = (status, english) => ({
  COMPLETED: english ? "Completed" : "สำเร็จ",
  PENDING: english ? "Pending" : "รอดำเนินการ",
  FAILED: english ? "Failed" : "ล้มเหลว",
  EXPIRED: english ? "Failed" : "หมดอายุ",
  REFUNDED: english ? "Refunded" : "คืนเงินแล้ว",
}[status] || status);
const statusClass = (status) => ({
  COMPLETED: "bg-emerald-100 text-emerald-800",
  PENDING: "bg-amber-100 text-amber-800",
  FAILED: "bg-red-100 text-red-800",
  EXPIRED: "bg-red-100 text-red-800",
  REFUNDED: "bg-stone-200 text-stone-700",
}[status] || "bg-stone-100 text-stone-700");

export default function PaymentAdminPage({ language, onBack, onUnauthorized }) {
  const english = language === "en";
  const [tab, setTab] = useState("transactions");
  const [settings, setSettings] = useState(initialSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);
  const [notice, setNotice] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalRevenue: 0, monthlyRevenue: 0, successfulOrders: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: "", status: "", method: "", from: "", to: "" });
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [refundTarget, setRefundTarget] = useState(null);
  const [acting, setActing] = useState(false);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  };

  useEffect(() => {
    api("/admin/payment-settings")
      .then(({ settings: value }) => setSettings({
        ...initialSettings,
        ...value,
        card: { ...initialSettings.card, ...value.card, secretKey: "", webhookSecret: "" },
      }))
      .catch((error) => {
        if (error.status === 401 || error.status === 403) onUnauthorized?.();
        showNotice(error.message);
      })
      .finally(() => setSettingsLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "transactions") return undefined;
    const timer = window.setTimeout(async () => {
      setLoadingTransactions(true);
      const params = new URLSearchParams({ page: String(pagination.page), limit: "20" });
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }
      try {
        const result = await api(`/admin/payments/transactions?${params.toString()}`);
        setTransactions(result.transactions);
        setSummary(result.summary);
        setPagination(result.pagination);
      } catch (error) {
        if (error.status === 401 || error.status === 403) onUnauthorized?.();
        showNotice(error.message);
      } finally {
        setLoadingTransactions(false);
      }
    }, filters.search ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [tab, filters, pagination.page]);

  const updateSection = (section, key, value) => {
    setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    setSavingSettings(true);
    try {
      const { secretKey, webhookSecret, ...cardFields } = settings.card;
      const result = await api("/admin/payment-settings", {
        method: "PUT",
        body: JSON.stringify({
          mode: settings.mode,
          promptpay: settings.promptpay,
          card: { ...cardFields, secretKey, webhookSecret },
          bankTransfer: settings.bankTransfer,
        }),
      });
      setSettings((current) => ({
        ...current,
        ...result.settings,
        card: { ...current.card, ...result.settings.card, secretKey: "", webhookSecret: "" },
      }));
      showNotice(english ? "Payment settings saved" : "บันทึกการตั้งค่าการชำระเงินแล้ว");
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      showNotice(error.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const runRefund = async () => {
    if (!refundTarget) return;
    setActing(true);
    try {
      await api(`/admin/payments/${refundTarget._id}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason: "Admin refund" }),
      });
      showNotice(english ? "Refund recorded" : "บันทึกการคืนเงินแล้ว");
      setRefundTarget(null);
      setPagination((current) => ({ ...current, page: 1 }));
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      showNotice(error.message);
    } finally {
      setActing(false);
    }
  };

  const reviewSlip = async (action) => {
    if (!selectedOrder) return;
    setActing(true);
    try {
      await api(`/admin/payments/${selectedOrder._id}/review-slip`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      showNotice(action === "approve"
        ? (english ? "Slip approved" : "อนุมัติสลิปแล้ว")
        : (english ? "Slip rejected" : "ปฏิเสธสลิปแล้ว"));
      setSelectedOrder(null);
      setPagination((current) => ({ ...current, page: 1 }));
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      showNotice(error.message);
    } finally {
      setActing(false);
    }
  };

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const sectionToggle = (checked, onChange, label) => (
    <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-semibold">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-orange" />
      {label}
    </label>
  );

  const fieldClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/20";

  return <main className="min-h-screen bg-[#fffaf4]">
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
        <button type="button" onClick={onBack} className="text-lg font-black">← ADMIN CONSOLE</button>
        <span className="text-sm font-bold text-stone-500">PAYMENTS & FINANCE</span>
      </div>
    </header>
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase text-orange-700">ADMINISTRATION</p>
          <h1 className="mt-2 text-3xl font-black">{english ? "Payments & finance" : "การชำระเงินและการเงิน"}</h1>
          <p className="mt-2 text-sm text-stone-500">{english ? "Manage payment channels and review order transactions." : "ตั้งค่าช่องทางชำระเงินและตรวจสอบรายการคำสั่งซื้อ"}</p>
        </div>
        <div role="tablist" aria-label={english ? "Payment admin sections" : "หมวดการเงิน"} className="flex border-b border-stone-300">
          <button type="button" role="tab" aria-selected={tab === "transactions"} onClick={() => setTab("transactions")} className={`border-b-2 px-4 py-2.5 text-sm font-bold ${tab === "transactions" ? "border-orange text-ink" : "border-transparent text-stone-500"}`}>{english ? "Transactions" : "รายการชำระเงิน"}</button>
          <button type="button" role="tab" aria-selected={tab === "settings"} onClick={() => setTab("settings")} className={`border-b-2 px-4 py-2.5 text-sm font-bold ${tab === "settings" ? "border-orange text-ink" : "border-transparent text-stone-500"}`}>{english ? "Payment settings" : "ตั้งค่าการชำระเงิน"}</button>
        </div>
      </div>

      {notice && <p role="status" className="mt-5 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-900">{notice}</p>}

      {tab === "settings" ? <form onSubmit={saveSettings} className="mt-7 space-y-5">
        <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-lg font-black">{english ? "Environment" : "โหมดการทำงาน"}</h2><p className="mt-1 text-sm text-stone-500">{english ? "Select test credentials or production credentials." : "เลือกใช้ข้อมูลทดสอบหรือข้อมูล Production"}</p></div>
            <div className="inline-flex rounded-lg bg-stone-100 p-1" role="group" aria-label="Payment mode">
              {["test", "live"].map((mode) => <button key={mode} type="button" aria-pressed={settings.mode === mode} onClick={() => setSettings((current) => ({ ...current, mode }))} className={`rounded-md px-4 py-2 text-sm font-bold capitalize ${settings.mode === mode ? "bg-white text-ink shadow-sm" : "text-stone-500"}`}>{mode === "test" ? "Test / Sandbox" : "Live / Production"}</button>)}
            </div>
          </div>
          {settings.mode === "live" && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{english ? "Live credentials are stored securely, but live charging and provider refunds are unavailable until a payment gateway adapter is configured." : "บันทึกค่า Live ได้ แต่ระบบยังไม่รับชำระหรือคืนเงินจริงจนกว่าจะเชื่อมต่อ payment gateway"}</p>}
        </section>

        <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">PromptPay QR</h2><p className="mt-1 text-sm text-stone-500">{english ? "Phone number or 13-digit juristic ID" : "เบอร์โทรศัพท์หรือเลขนิติบุคคล 13 หลัก"}</p></div>{sectionToggle(settings.promptpay.enabled, (value) => updateSection("promptpay", "enabled", value), english ? "Enabled" : "เปิดใช้งาน")}</div>
          <label className="mt-4 block max-w-md text-sm font-bold">{english ? "PromptPay ID" : "รหัสพร้อมเพย์"}<input inputMode="numeric" maxLength={13} value={settings.promptpay.receiverId} onChange={(event) => updateSection("promptpay", "receiverId", event.target.value.replace(/\D/g, ""))} className={fieldClass} placeholder="0812345678" /></label>
        </section>

        <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">{english ? "Credit / debit card" : "บัตรเครดิต / เดบิต"}</h2><p className="mt-1 text-sm text-stone-500">Stripe or Omise</p></div>{sectionToggle(settings.card.enabled, (value) => updateSection("card", "enabled", value), english ? "Enabled" : "เปิดใช้งาน")}</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">Provider<select value={settings.card.provider} onChange={(event) => updateSection("card", "provider", event.target.value)} className={fieldClass}><option value="stripe">Stripe</option><option value="omise">Omise</option></select></label>
            <label className="text-sm font-bold">Public Key<input value={settings.card.publicKey} onChange={(event) => updateSection("card", "publicKey", event.target.value)} className={fieldClass} autoComplete="off" /></label>
            <label className="text-sm font-bold">Secret Key<div className="relative"><input type={showSecret ? "text" : "password"} value={settings.card.secretKey} onChange={(event) => updateSection("card", "secretKey", event.target.value)} placeholder={settings.card.hasSecret ? settings.card.secretKeyMasked : "Enter secret key"} className={`${fieldClass} pr-20`} autoComplete="new-password" /><button type="button" onClick={() => setShowSecret((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-bold text-stone-600">{showSecret ? (english ? "Hide" : "ซ่อน") : (english ? "Show" : "แสดง")}</button></div><span className="mt-1 block text-xs font-normal text-stone-500">{settings.card.hasSecret ? (english ? "Leave blank to keep the saved key." : "เว้นว่างเพื่อใช้ key เดิม") : (english ? "Encrypted before storage." : "เข้ารหัสก่อนบันทึก")}</span></label>
            <label className="text-sm font-bold">Webhook Secret<div className="relative"><input type={showWebhook ? "text" : "password"} value={settings.card.webhookSecret} onChange={(event) => updateSection("card", "webhookSecret", event.target.value)} placeholder={settings.card.hasWebhookSecret ? settings.card.webhookSecretMasked : "Enter webhook secret"} className={`${fieldClass} pr-20`} autoComplete="new-password" /><button type="button" onClick={() => setShowWebhook((value) => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-bold text-stone-600">{showWebhook ? (english ? "Hide" : "ซ่อน") : (english ? "Show" : "แสดง")}</button></div><span className="mt-1 block text-xs font-normal text-stone-500">{settings.card.hasWebhookSecret ? (english ? "Leave blank to keep the saved secret." : "เว้นว่างเพื่อใช้ secret เดิม") : (english ? "Encrypted before storage." : "เข้ารหัสก่อนบันทึก")}</span></label>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 ring-1 ring-stone-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">{english ? "Bank transfer / manual slip" : "โอนผ่านบัญชี / ตรวจสลิป"}</h2><p className="mt-1 text-sm text-stone-500">{english ? "Customers transfer manually; an admin reviews submitted slips." : "ลูกค้าโอนเงินและให้แอดมินตรวจสอบสลิป"}</p></div>{sectionToggle(settings.bankTransfer.enabled, (value) => updateSection("bankTransfer", "enabled", value), english ? "Enabled" : "เปิดใช้งาน")}</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-sm font-bold">{english ? "Bank" : "ธนาคาร"}<input value={settings.bankTransfer.bankName} onChange={(event) => updateSection("bankTransfer", "bankName", event.target.value)} className={fieldClass} /></label><label className="text-sm font-bold">{english ? "Account number" : "เลขบัญชี"}<input value={settings.bankTransfer.accountNumber} onChange={(event) => updateSection("bankTransfer", "accountNumber", event.target.value)} className={fieldClass} /></label><label className="text-sm font-bold">{english ? "Account name" : "ชื่อบัญชี"}<input value={settings.bankTransfer.accountName} onChange={(event) => updateSection("bankTransfer", "accountName", event.target.value)} className={fieldClass} /></label></div>
        </section>

        <div className="flex justify-end"><button type="submit" disabled={savingSettings || settingsLoading} className="rounded-lg bg-orange px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{savingSettings ? (english ? "Saving..." : "กำลังบันทึก...") : (english ? "Save payment settings" : "บันทึกการตั้งค่า")}</button></div>
      </form> : <>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <article className="rounded-xl bg-white p-5 ring-1 ring-stone-200"><p className="text-sm font-semibold text-stone-500">{english ? "Total revenue" : "รายได้รวมทั้งหมด"}</p><p className="mt-2 text-2xl font-black">{currency(summary.totalRevenue)}</p></article>
          <article className="rounded-xl bg-white p-5 ring-1 ring-stone-200"><p className="text-sm font-semibold text-stone-500">{english ? "Revenue this month" : "รายได้เดือนนี้"}</p><p className="mt-2 text-2xl font-black">{currency(summary.monthlyRevenue)}</p></article>
          <article className="rounded-xl bg-white p-5 ring-1 ring-stone-200"><p className="text-sm font-semibold text-stone-500">{english ? "Successful orders" : "รายการชำระเงินสำเร็จ"}</p><p className="mt-2 text-2xl font-black">{Number(summary.successfulOrders || 0).toLocaleString()}</p></article>
        </div>
        <section className="mt-6 rounded-xl bg-white p-4 ring-1 ring-stone-200 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-bold text-stone-500">{english ? "Order ID or customer" : "ค้นหา Order ID หรืออีเมล"}<input value={filters.search} onChange={(event) => setFilter("search", event.target.value)} className={fieldClass} placeholder="Order ID / email" /></label>
            <label className="text-xs font-bold text-stone-500">{english ? "Status" : "สถานะ"}<select value={filters.status} onChange={(event) => setFilter("status", event.target.value)} className={fieldClass}><option value="">{english ? "All statuses" : "ทุกสถานะ"}</option><option value="COMPLETED">{english ? "Completed" : "สำเร็จ"}</option><option value="PENDING">{english ? "Pending" : "รอดำเนินการ"}</option><option value="FAILED">{english ? "Failed" : "ล้มเหลว"}</option><option value="REFUNDED">{english ? "Refunded" : "คืนเงินแล้ว"}</option></select></label>
            <label className="text-xs font-bold text-stone-500">{english ? "From" : "ตั้งแต่วันที่"}<input type="date" value={filters.from} onChange={(event) => setFilter("from", event.target.value)} className={fieldClass} /></label>
            <label className="text-xs font-bold text-stone-500">{english ? "To" : "ถึงวันที่"}<input type="date" value={filters.to} onChange={(event) => setFilter("to", event.target.value)} className={fieldClass} /></label>
            <label className="text-xs font-bold text-stone-500">{english ? "Channel" : "ช่องทาง"}<select value={filters.method} onChange={(event) => setFilter("method", event.target.value)} className={fieldClass}><option value="">{english ? "All channels" : "ทุกช่องทาง"}</option><option value="promptpay">PromptPay</option><option value="card">{english ? "Credit card" : "บัตรเครดิต"}</option><option value="manual_slip">{english ? "Bank slip" : "สลิปโอนเงิน"}</option></select></label>
          </div>
        </section>
        <section className="mt-5 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3"><h2 className="font-bold">{english ? "Transactions" : "รายการธุรกรรม"}</h2><span className="text-xs text-stone-500">{pagination.total} {english ? "orders" : "รายการ"}</span></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase text-stone-500"><tr><th className="px-4 py-3">Order ID</th><th className="px-4 py-3">{english ? "Date / time" : "วันที่-เวลา"}</th><th className="px-4 py-3">{english ? "Customer" : "ลูกค้า"}</th><th className="px-4 py-3">{english ? "Channel" : "ช่องทาง"}</th><th className="px-4 py-3 text-right">{english ? "Amount" : "ยอดเงิน"}</th><th className="px-4 py-3">{english ? "Status" : "สถานะ"}</th><th className="px-4 py-3">{english ? "Actions" : "จัดการ"}</th></tr></thead>
            <tbody>{loadingTransactions ? <tr><td colSpan="7" className="px-4 py-12 text-center text-stone-500">{english ? "Loading transactions..." : "กำลังโหลดรายการ..."}</td></tr> : transactions.length ? transactions.map((order) => <tr key={order._id} className="border-t border-stone-100"><td className="px-4 py-3 font-mono text-xs">{order._id}</td><td className="px-4 py-3 whitespace-nowrap">{new Date(order.createdAt).toLocaleString(english ? "en" : "th-TH")}</td><td className="px-4 py-3"><span className="block font-semibold">{order.reader?.displayName || "—"}</span><span className="text-xs text-stone-500">{order.reader?.email || "—"}</span></td><td className="px-4 py-3"><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-bold">{{ promptpay: "PromptPay", card: "Card", manual_slip: "Slip" }[order.paymentMethod] || order.paymentMethod}</span></td><td className="px-4 py-3 text-right font-bold">{currency(order.total)}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(order.status)}`}>{statusLabel(order.status, english)}</span></td><td className="px-4 py-3"><div className="flex items-center gap-3 whitespace-nowrap"><button type="button" onClick={() => setSelectedOrder(order)} className="text-xs font-bold text-orange-700">{english ? "Details" : "ดูรายละเอียด"}</button>{order.paymentMethod === "manual_slip" && order.status === "PENDING" && <button type="button" onClick={() => setSelectedOrder(order)} className="text-xs font-bold text-amber-700">{english ? "Review slip" : "ตรวจสลิป"}</button>}{order.status === "COMPLETED" && <button type="button" onClick={() => setRefundTarget(order)} className="text-xs font-bold text-red-700">{english ? "Refund" : "คืนเงิน"}</button>}</div></td></tr>) : <tr><td colSpan="7" className="px-4 py-12 text-center text-stone-500">{english ? "No transactions found" : "ไม่พบรายการชำระเงิน"}</td></tr>}</tbody>
          </table></div>
          <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3 text-sm"><span className="text-stone-500">{english ? `Page ${pagination.page} of ${pagination.pages}` : `หน้า ${pagination.page} จาก ${pagination.pages}`}</span><div className="flex gap-2"><button type="button" disabled={pagination.page <= 1 || loadingTransactions} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="rounded-md border border-stone-300 px-3 py-1.5 font-bold disabled:opacity-40">←</button><button type="button" disabled={pagination.page >= pagination.pages || loadingTransactions} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="rounded-md border border-stone-300 px-3 py-1.5 font-bold disabled:opacity-40">→</button></div></div>
        </section>
      </>}
    </div>

    {selectedOrder && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="transaction-detail-title"><div className="my-6 w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-orange-700">{selectedOrder.paymentMethod === "manual_slip" ? (english ? "Slip review" : "ตรวจสอบสลิป") : (english ? "Receipt" : "รายละเอียดคำสั่งซื้อ")}</p><h2 id="transaction-detail-title" className="mt-1 break-all text-lg font-black">{selectedOrder._id}</h2></div><button type="button" onClick={() => setSelectedOrder(null)} aria-label="Close" className="text-2xl text-stone-400">×</button></div><div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-stone-50 p-4 text-sm"><div><p className="text-xs text-stone-500">{english ? "Customer" : "ลูกค้า"}</p><p className="mt-1 font-semibold">{selectedOrder.reader?.displayName || "—"}<br /><span className="font-normal text-stone-600">{selectedOrder.reader?.email || "—"}</span></p></div><div><p className="text-xs text-stone-500">{english ? "Paid amount" : "ยอดชำระ"}</p><p className="mt-1 font-bold">{currency(selectedOrder.total)}</p></div><div><p className="text-xs text-stone-500">{english ? "Status" : "สถานะ"}</p><p className="mt-1">{statusLabel(selectedOrder.status, english)}</p></div><div><p className="text-xs text-stone-500">{english ? "Payment method" : "ช่องทาง"}</p><p className="mt-1">{selectedOrder.paymentMethod}</p></div></div><h3 className="mt-5 font-bold">{english ? "Books in order" : "หนังสือในคำสั่งซื้อ"}</h3><div className="mt-2 divide-y divide-stone-100">{selectedOrder.items?.map((item) => <div key={item.book} className="flex justify-between gap-4 py-3 text-sm"><span>{item.title}</span><b>{currency(item.amount)}</b></div>)}</div><div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-sm"><span>{english ? "Subtotal" : "ยอดรวม"}</span><b>{currency(selectedOrder.subtotal)}</b></div><div className="mt-2 flex justify-between text-sm"><span>{english ? "Discount" : "ส่วนลด"}</span><b>-{currency(selectedOrder.discount)}</b></div>{selectedOrder.paymentMethod === "manual_slip" && selectedOrder.slipUrl && <div className="mt-5"><p className="mb-2 text-sm font-bold">{english ? "Submitted slip" : "สลิปที่ส่งมา"}</p><a href={selectedOrder.slipUrl} target="_blank" rel="noreferrer"><img src={selectedOrder.slipUrl} alt="Payment slip" className="max-h-80 w-full rounded-lg border border-stone-200 object-contain" /></a></div>}{selectedOrder.paymentMethod === "manual_slip" && selectedOrder.status === "PENDING" && <div className="mt-6 flex justify-end gap-3"><button type="button" disabled={acting} onClick={() => reviewSlip("reject")} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">{english ? "Reject" : "ปฏิเสธ"}</button><button type="button" disabled={acting} onClick={() => reviewSlip("approve")} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{english ? "Approve" : "อนุมัติ"}</button></div>}</div></div>}
    {refundTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="refund-title"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h2 id="refund-title" className="text-xl font-black">{english ? "Confirm refund" : "ยืนยันการคืนเงิน"}</h2><p className="mt-3 text-sm leading-6 text-stone-600">{english ? `Record a refund for order ${refundTarget._id} (${currency(refundTarget.total)})?` : `ยืนยันบันทึกการคืนเงินสำหรับ Order ${refundTarget._id} ยอด ${currency(refundTarget.total)} หรือไม่?`}</p><p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{english ? "Sandbox refunds do not transfer money. Live refunds require a provider integration." : "การคืนเงินใน sandbox ไม่ได้โอนเงินจริง การคืนเงินจริงต้องเชื่อม payment provider"}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setRefundTarget(null)} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-bold">{english ? "Cancel" : "ยกเลิก"}</button><button type="button" disabled={acting} onClick={runRefund} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{acting ? (english ? "Processing..." : "กำลังดำเนินการ...") : (english ? "Confirm refund" : "ยืนยันคืนเงิน")}</button></div></div></div>}
  </main>;
}
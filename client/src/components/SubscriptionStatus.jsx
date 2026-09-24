import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const formatDate = (value) => new Intl.DateTimeFormat("th-TH", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
}).format(new Date(value));

export default function SubscriptionStatus({ onRenew }) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api("/subscription/status")
      .then(({ subscription: currentSubscription }) => setSubscription(currentSubscription))
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  const progress = useMemo(() => {
    if (!subscription?.trialStartDate || !subscription?.trialEndDate || subscription.subscriptionStatus !== "trialing") return 0;
    const total = new Date(subscription.trialEndDate).getTime() - new Date(subscription.trialStartDate).getTime();
    const remaining = Math.max(0, new Date(subscription.trialEndDate).getTime() - Date.now());
    return Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  }, [subscription]);

  if (loading) return <section className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200"><p className="text-sm text-stone-500">กำลังตรวจสอบสถานะสมาชิก...</p></section>;
  if (message) return <section className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200"><p className="text-sm text-red-600">{message}</p></section>;

  const status = subscription?.subscriptionStatus || "none";
  const trialing = status === "trialing";
  const active = status === "active";
  const expired = status === "expired";

  return <section className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm font-bold text-orange-600">PLOT UNLIMITED</p><h2 className="mt-1 text-2xl font-black">สถานะสมาชิก</h2></div>
      <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${trialing ? "bg-orange-100 text-orange-700" : active ? "bg-emerald-100 text-emerald-700" : expired ? "bg-stone-200 text-stone-600" : "bg-stone-100 text-stone-500"}`}>{trialing ? "กำลังทดลองใช้ฟรี" : active ? "สมาชิกรายเดือน" : expired ? "หมดอายุแล้ว" : "ยังไม่มีแพ็กเกจ"}</span>
    </div>
    {trialing && <div className="mt-7"><div className="flex flex-wrap justify-between gap-2 text-sm font-bold"><span>แพ็กเกจทดลองใช้อยู่ได้อีก {subscription.daysRemaining} วัน</span><span className="text-stone-500">หมดอายุวันที่ {formatDate(subscription.trialEndDate)}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-orange transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-xs text-stone-500">ใช้เวลาไปแล้ว {Math.round(progress)}% จาก 7 วัน</p></div>}
    {active && <p className="mt-6 text-sm text-stone-600">คุณกำลังใช้งานแพ็กเกจ Unlimited แบบรายเดือน</p>}
    {expired && <><p className="mt-6 text-sm text-stone-600">สิทธิ์ทดลองใช้ฟรีของคุณหมดอายุแล้ว</p><button type="button" onClick={onRenew} className="mt-5 rounded-full bg-orange px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-600">ต่ออายุสมาชิก (฿199/เดือน)</button></>}
    {status === "none" && <p className="mt-6 text-sm text-stone-600">ยังไม่ได้เปิดใช้งานแพ็กเกจ Unlimited</p>}
  </section>;
}

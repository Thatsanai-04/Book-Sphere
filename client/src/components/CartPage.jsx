import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const money = (value) => `฿${Number(value || 0).toLocaleString("th-TH")}`;

export default function CartPage({ onBack, onLibrary }) {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [ownedSlugs, setOwnedSlugs] = useState([]);
  const [message, setMessage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [appliedCode, setAppliedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("promptpay");
  const [payment, setPayment] = useState(null);
  const [paid, setPaid] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    Promise.all([api("/cart"), api("/library/me")])
      .then(([cartData, libraryData]) => {
        setCart(cartData);
        setOwnedSlugs(libraryData.books.map((book) => book.slug));
      })
      .catch((error) => setMessage(error.message));
  }, []);

  useEffect(() => {
    if (!payment?.orderId || paid) return undefined;
    const timer = window.setInterval(() => {
      const expiry = new Date(payment.expiresAt).getTime();
      setSecondsLeft(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
      if (Date.now() >= expiry) {
        window.clearInterval(timer);
        setMessage("คำสั่งซื้อหมดอายุแล้ว กรุณาเริ่มชำระเงินอีกครั้ง");
        setPayment(null);
        return;
      }
      api("/orders/verify-payment", {
        method: "POST",
        body: JSON.stringify({ orderId: payment.orderId }),
      }).then(({ status }) => {
        if (status === "COMPLETED") setPaid(true);
        if (status === "EXPIRED" || status === "FAILED") {
          setMessage("คำสั่งซื้อหมดอายุหรือไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
          setPayment(null);
        }
      }).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [payment, paid]);

  const ownedCartItems = useMemo(
    () => cart.items.filter(({ book }) => ownedSlugs.includes(book.slug)),
    [cart.items, ownedSlugs],
  );
  const netTotal = Math.max(0, cart.total - discount);

  const remove = async (slug) => {
    setMessage("");
    try {
      setCart(await api(`/cart/items/${slug}`, { method: "DELETE" }));
      setDiscount(0);
      setAppliedCode("");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const applyCoupon = async (event) => {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const result = await api("/orders/coupons/validate", {
        method: "POST",
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      setDiscount(result.discount);
      setAppliedCode(result.code);
    } catch (error) {
      setDiscount(0);
      setAppliedCode("");
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const checkout = async () => {
    setMessage("");
    setBusy(true);
    try {
      const result = await api("/orders/create", {
        method: "POST",
        body: JSON.stringify({ paymentMethod, promoCode: appliedCode || undefined }),
      });
      setPayment(result.payment);
      if (result.payment?.expiresAt) {
        setSecondsLeft(Math.max(0, Math.ceil((new Date(result.payment.expiresAt).getTime() - Date.now()) / 1000)));
      }
      if (result.payment?.checkoutUrl) window.open(result.payment.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const simulatePayment = async () => {
    if (!payment?.orderId || !payment.sandbox) return;
    setBusy(true);
    try {
      const result = await api("/orders/verify-payment", {
        method: "POST",
        body: JSON.stringify({ orderId: payment.orderId, simulate: true }),
      });
      if (result.status === "COMPLETED") {
        setPaid(true);
        const [cartData, libraryData] = await Promise.all([api("/cart"), api("/library/me")]);
        setCart(cartData);
        setOwnedSlugs(libraryData.books.map((book) => book.slug));
      } else if (result.status === "EXPIRED" || result.status === "FAILED") {
        setMessage("คำสั่งซื้อหมดอายุหรือไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        setPayment(null);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const closePayment = () => {
    setPayment(null);
    setPaid(false);
  };

  return <main className="min-h-screen bg-[#fffaf4]">
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex h-[72px] max-w-5xl items-center justify-between px-5"><button onClick={onBack} className="text-lg font-black">← PLOT</button><span className="text-sm font-bold">SHOPPING CART</span></div></header>
    <div className="mx-auto max-w-5xl px-5 py-10"><h1 className="text-3xl font-black">ตะกร้าของฉัน</h1><p className="mt-2 text-stone-500">บันทึกหนังสือที่สนใจไว้ แล้วชำระเงินเมื่อพร้อม</p>
      {message && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-red-700">{message}</p>}
      {!cart.items.length ? <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-stone-200"><p className="text-lg font-bold">ตะกร้าของคุณยังว่างอยู่</p><button onClick={onBack} className="mt-5 rounded-full bg-orange px-5 py-3 font-bold text-white">เลือกซื้อหนังสือ</button></div> : <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-stone-200">{cart.items.map(({ book }) => {
          const alreadyOwned = ownedSlugs.includes(book.slug);
          return <div key={book.slug} className="flex gap-4 border-b border-stone-100 p-5 last:border-0"><div className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-orange-100">{book.coverUrl && <img src={book.coverUrl} alt={`ปก ${book.title}`} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><h2 className="truncate font-bold">{book.title}</h2><p className="mt-1 text-sm text-stone-500">{book.contentType}</p><p className="mt-2 font-bold text-orange-600">{book.isFree ? "ฟรี" : money(book.price?.amount)}</p>{alreadyOwned && <p className="mt-2 text-sm font-bold text-red-700">คุณมีหนังสือเล่มนี้แล้ว</p>}</div><button type="button" onClick={() => remove(book.slug)} aria-label={`ลบ ${book.title} ออกจากตะกร้า`} className="self-start text-sm font-bold text-red-600 hover:text-red-800">ลบ</button></div>;
        })}</section>
        <aside className="h-fit rounded-2xl bg-ink p-6 text-white"><h2 className="text-lg font-black">สรุปคำสั่งซื้อ</h2><div className="mt-5 space-y-3 border-b border-white/15 pb-4 text-sm"><div className="flex justify-between"><span>ยอดรวมสินค้า ({cart.items.length} รายการ)</span><b>{money(cart.total)}</b></div><div className="flex justify-between text-orange-200"><span>ส่วนลด{appliedCode ? ` (${appliedCode})` : ""}</span><b>-{money(discount)}</b></div></div><div className="flex justify-between py-4 text-base"><span>ยอดชำระสุทธิ</span><b>{money(netTotal)}</b></div>
          <form onSubmit={applyCoupon} className="flex gap-2"><label className="sr-only" htmlFor="promo-code">Promo Code</label><input id="promo-code" value={promoCode} onChange={(event) => setPromoCode(event.target.value)} placeholder="โค้ดส่วนลด" className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-stone-400" /><button disabled={busy || !promoCode.trim()} className="rounded-lg bg-white/15 px-3 py-2 text-sm font-bold disabled:opacity-50">ใช้งาน</button></form>
          {appliedCode && <p className="mt-2 text-xs text-emerald-200">ใช้โค้ด {appliedCode} แล้ว</p>}
          {ownedCartItems.length > 0 && <p className="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-100">นำหนังสือที่มีในคลังออกจากตะกร้าก่อนชำระเงิน</p>}
          <button type="button" onClick={() => setPayment({ selecting: true })} disabled={busy || ownedCartItems.length > 0} className="mt-6 w-full rounded-xl bg-orange px-4 py-3.5 font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">ดำเนินการชำระเงิน</button>
        </aside>
      </div>}
    </div>

    {payment && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="payment-title"><div className="my-6 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
      {paid ? <>
        <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-3xl text-emerald-700">✓</div>
        <h2 id="payment-title" className="mt-5 text-2xl font-black">ชำระเงินสำเร็จเรียบร้อย!</h2>
        <p className="mt-2 text-stone-600">หนังสือถูกเพิ่มลงในคลังของคุณแล้ว</p>
        <button type="button" onClick={onLibrary} className="mt-6 w-full rounded-xl bg-orange px-4 py-3 font-bold text-white">ไปที่คลังหนังสือของฉัน</button>
      </> : payment.selecting ? <>
        <div className="flex items-center justify-between">
          <h2 id="payment-title" className="text-xl font-black">เลือกวิธีชำระเงิน</h2>
          <button type="button" onClick={closePayment} aria-label="ปิด" className="text-2xl leading-none text-stone-400">×</button>
        </div>
        <p className="mt-2 text-sm text-stone-500">ยอดชำระ {money(netTotal)}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setPaymentMethod("promptpay")} className={`rounded-xl border p-4 text-left ${paymentMethod === "promptpay" ? "border-orange bg-orange-50" : "border-stone-200"}`}><span className="block font-bold">PromptPay</span><span className="mt-1 block text-xs text-stone-500">สแกน QR เพื่อชำระ</span></button>
          <button type="button" onClick={() => setPaymentMethod("card")} className={`rounded-xl border p-4 text-left ${paymentMethod === "card" ? "border-orange bg-orange-50" : "border-stone-200"}`}><span className="block font-bold">บัตรเครดิต/เดบิต</span><span className="mt-1 block text-xs text-stone-500">ชำระผ่านหน้าผู้ให้บริการ</span></button>
        </div>
        <button type="button" onClick={checkout} disabled={busy} className="mt-5 w-full rounded-xl bg-orange px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "กำลังสร้างคำสั่งซื้อ..." : "ไปชำระเงิน"}</button>
      </> : <>
        <div className="flex items-center justify-between">
          <h2 id="payment-title" className="text-xl font-black">รอการชำระเงิน</h2>
          <button type="button" onClick={closePayment} aria-label="ปิด" className="text-2xl leading-none text-stone-400">×</button>
        </div>
        {payment.qrCodeUrl && <img src={payment.qrCodeUrl} alt="PromptPay QR Code" className="mx-auto mt-5 aspect-square w-56 rounded-lg border border-stone-200 p-2" />}
        {payment.sandbox ? <>
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-900">โหมดทดสอบ: ไม่มีการเรียกเก็บเงินจริงและไม่มี QR สำหรับโอนเงินจริง</p>
          <button type="button" onClick={simulatePayment} disabled={busy} className="mt-4 w-full rounded-xl bg-orange px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "กำลังจำลองการชำระ..." : "จำลองการชำระเงินสำเร็จ"}</button>
        </> : <>
          <p className="mt-4 text-center text-sm text-stone-600">{payment.qrCodeUrl ? "สแกน QR ด้วยแอปธนาคารของคุณ" : "ชำระเงินผ่านหน้าผู้ให้บริการ แล้วกลับมาที่นี่"}</p>
          {payment.qrCodeUrl && <p className="mt-3 text-center font-mono text-lg font-bold">{`${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`}</p>}
          <p className="mt-3 text-center text-xs text-stone-400">ตรวจสอบสถานะการชำระเงินอัตโนมัติ</p>
        </>}
      </>}
    </div></div>}
  </main>;
}
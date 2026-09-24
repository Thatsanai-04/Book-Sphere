import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const tabs = [
  ["reading", "กำลังอ่าน"],
  ["finished", "อ่านจบแล้ว"],
  ["favorites", "รายการโปรด"],
];

const storageKey = (userId) => `plot_library_${userId || "guest"}`;

function BookCover({ book }) {
  return <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-orange-300 to-rose-200">
    {book.coverUrl ? <img src={book.coverUrl} alt={`ปก ${book.title}`} className="h-full w-full object-cover" /> : <div className="flex h-full flex-col justify-between p-5 text-white"><span className="text-3xl">▰</span><p className="font-serif text-lg leading-tight">{book.title}</p></div>}
  </div>;
}

export default function LibraryPage({ user, onBack }) {
  const [books, setBooks] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [tab, setTab] = useState("reading");
  const [reader, setReader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [subscriptionModal, setSubscriptionModal] = useState(false);

  useEffect(() => {
    try { setPreferences(JSON.parse(localStorage.getItem(storageKey(user?._id)) || "{}")); } catch { setPreferences({}); }
    api("/library/me").then(({ books: ownedBooks }) => setBooks(ownedBooks)).catch((error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [user]);

  const updatePreference = (slug, changes) => {
    setPreferences((current) => {
      const next = { ...current, [slug]: { ...(current[slug] || {}), ...changes } };
      localStorage.setItem(storageKey(user?._id), JSON.stringify(next));
      return next;
    });
  };

  const filteredBooks = useMemo(() => books.filter((book) => {
    const progress = preferences[book.slug]?.progress || 0;
    if (tab === "finished") return progress >= 100;
    if (tab === "favorites") return preferences[book.slug]?.favorite;
    return progress < 100;
  }), [books, preferences, tab]);

  const openReader = async (book) => {
    setMessage("");
    try {
      const result = await api(`/library/${book.slug}/download`);
      updatePreference(book.slug, { progress: Math.max(preferences[book.slug]?.progress || 0, 1) });
      if (result.contentHtml) setReader({ title: result.title, contentHtml: result.contentHtml, slug: book.slug });
      else if (result.downloadUrl?.startsWith("http")) window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
      else setMessage("หนังสือเล่มนี้ยังไม่มีเนื้อหาสำหรับอ่านบนเว็บ");
    } catch (error) {
      if (error.status === 403 && error.code === "UNLIMITED_SUBSCRIPTION_REQUIRED") setSubscriptionModal(true);
      else setMessage(error.message);
    }
  };

  return <main className="min-h-screen bg-[#fffaf4]">
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5"><button onClick={onBack} className="text-lg font-black">← PLOT</button><span className="text-sm font-bold text-stone-500">MY LIBRARY</span></div></header>
    <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold text-orange-600">ชั้นหนังสือของคุณ</p><h1 className="mt-2 text-4xl font-black tracking-tight">คลังหนังสือของฉัน</h1><p className="mt-3 text-stone-500">หนังสือที่คุณซื้อและบันทึกไว้อ่านต่อ</p></div><div className="rounded-2xl bg-white px-5 py-3 text-sm font-bold shadow-sm ring-1 ring-stone-200">{books.length} เล่มในคลัง</div></div>
      <div className="mt-9 flex gap-2 overflow-auto border-b border-stone-200 pb-3">{tabs.map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-bold transition ${tab === value ? "bg-ink text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-orange"}`}>{label}</button>)}</div>
      {message && <p className="mt-5 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-800">{message}</p>}
      {loading ? <p className="py-16 text-center text-stone-500">กำลังโหลดคลังหนังสือ...</p> : !filteredBooks.length ? <div className="mt-8 rounded-3xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-stone-200"><p className="text-lg font-bold">{tab === "favorites" ? "ยังไม่มีรายการโปรด" : tab === "finished" ? "ยังไม่มีหนังสือที่อ่านจบ" : "ยังไม่มีหนังสือที่กำลังอ่าน"}</p><p className="mt-2 text-sm text-stone-500">หนังสือที่ชำระเงินแล้วจะปรากฏที่นี่</p><button onClick={onBack} className="mt-6 rounded-full bg-orange px-5 py-3 font-bold text-white">เลือกหนังสือเพิ่ม</button></div> : <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{filteredBooks.map((book) => { const progress = preferences[book.slug]?.progress || 0; const favorite = preferences[book.slug]?.favorite; return <article key={book.slug} className="group rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-1 hover:shadow-lg"><BookCover book={book} /><div className="p-2 pt-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-bold uppercase text-orange-600">{book.contentType || "E-Book"}</p><h2 className="mt-1 truncate text-lg font-black">{book.title}</h2><p className="mt-1 truncate text-sm text-stone-500">{book.contributors?.find((item) => item.role === "author")?.name || "PLOT"}</p></div><button type="button" onClick={() => updatePreference(book.slug, { favorite: !favorite })} aria-label={favorite ? "นำออกจากรายการโปรด" : "เพิ่มในรายการโปรด"} className={`shrink-0 text-2xl ${favorite ? "text-orange" : "text-stone-300 hover:text-orange"}`}>♥</button></div><div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold text-stone-500"><span>ความคืบหน้า</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-orange transition-all" style={{ width: `${progress}%` }} /></div></div><button type="button" onClick={() => openReader(book)} className="mt-5 w-full rounded-full bg-ink py-3 text-sm font-bold text-white transition hover:bg-orange">{progress ? "อ่านต่อ" : "เปิด Web Reader"}</button></div></article>; })}</div>}
    </div>
    {reader && <div className="fixed inset-0 z-50 bg-[#fffaf4]" role="dialog" aria-modal="true"><header className="border-b border-stone-200 bg-white"><div className="mx-auto flex h-[72px] max-w-3xl items-center justify-between px-5"><button onClick={() => setReader(null)} className="text-sm font-bold">← กลับไปคลัง</button><span className="truncate px-4 font-black">{reader.title}</span><button onClick={() => { updatePreference(reader.slug, { progress: 100 }); setReader(null); }} className="rounded-full bg-orange px-4 py-2 text-xs font-bold text-white">อ่านจบแล้ว</button></div></header><article className="mx-auto max-w-3xl overflow-y-auto px-5 py-12 leading-8 text-stone-800 sm:py-16" dangerouslySetInnerHTML={{ __html: reader.contentHtml }} /></div>}
    {subscriptionModal && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5" role="dialog" aria-modal="true" aria-labelledby="subscription-modal-title"><div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-2xl text-orange">∞</div><h2 id="subscription-modal-title" className="mt-5 text-2xl font-black">สมัครสมาชิกเพื่ออ่านต่อ</h2><p className="mt-3 leading-7 text-stone-600">หนังสือหมวด Unlimited ต้องใช้แพ็กเกจทดลองใช้ฟรีหรือสมาชิก Unlimited ที่ยังใช้งานอยู่</p><div className="mt-6 flex gap-3"><button type="button" onClick={() => setSubscriptionModal(false)} className="flex-1 rounded-full border border-stone-200 px-4 py-3 text-sm font-bold">ปิด</button><button type="button" onClick={() => { setSubscriptionModal(false); onBack(); }} className="flex-1 rounded-full bg-orange px-4 py-3 text-sm font-bold text-white">ดูแพ็กเกจ</button></div></div></div>}
  </main>;
}

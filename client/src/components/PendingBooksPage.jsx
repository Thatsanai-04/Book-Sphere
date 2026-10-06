import { useEffect, useState } from "react";
import { api } from "../api";

const price = (book) => book.isFree ? "ฟรี" : `฿${Number(book.price?.amount || 0).toLocaleString("th-TH")}`;

export default function PendingBooksPage({ language, onBack, onUnauthorized }) {
  const english = language === "en";
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const result = await api("/admin/books/pending");
      setBooks(result.books);
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (book) => {
    setBusy(true);
    setMessage("");
    try {
      await api(`/admin/books/${book._id}/approve`, { method: "PATCH" });
      setBooks((current) => current.filter((item) => item._id !== book._id));
      setSelected(null);
      setMessage(english ? "Book approved and published" : "อนุมัติและเผยแพร่หนังสือแล้ว");
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async (event) => {
    event.preventDefault();
    if (!rejectTarget || !reason.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await api(`/admin/books/${rejectTarget._id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setBooks((current) => current.filter((book) => book._id !== rejectTarget._id));
      setSelected(null);
      setRejectTarget(null);
      setReason("");
      setMessage(english ? "Submission rejected" : "ปฏิเสธหนังสือพร้อมบันทึกเหตุผลแล้ว");
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  };

  const openPreview = (book) => {
    const fileUrl = book.ebook?.fileUrl;
    if (fileUrl?.startsWith("https://") || fileUrl?.startsWith("http://")) {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    } else {
      setMessage(english ? "This submission has no external preview file." : "รายการนี้ไม่มีไฟล์ตัวอย่างให้อ่านภายนอก");
    }
  };

  return <main className="min-h-screen bg-[#fffaf4]">
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5"><button type="button" onClick={onBack} className="text-lg font-black">← ADMIN CONSOLE</button><span className="text-sm font-bold text-stone-500">PENDING BOOKS</span></div></header>
    <div className="mx-auto max-w-6xl px-5 py-9">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase text-orange-700">EDITORIAL REVIEW</p><h1 className="mt-2 text-3xl font-black">{english ? "Pending book submissions" : "หนังสือรออนุมัติ"}</h1><p className="mt-2 text-sm text-stone-500">{english ? "Review author submissions before they appear in the store." : "ตรวจสอบหนังสือจากนักเขียนก่อนเผยแพร่ในหน้าร้าน"}</p></div><button type="button" onClick={load} disabled={loading} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold disabled:opacity-50">{english ? "Refresh" : "รีเฟรช"}</button></div>
      {message && <p role="status" className="mt-5 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-900">{message}</p>}
      {loading ? <p className="py-16 text-center text-stone-500">{english ? "Loading submissions..." : "กำลังโหลดรายการ..."}</p> : !books.length ? <div className="mt-7 rounded-xl bg-white p-12 text-center ring-1 ring-stone-200"><p className="font-bold">{english ? "No books are waiting for approval." : "ไม่มีหนังสือรออนุมัติ"}</p></div> : <div className="mt-7 overflow-x-auto rounded-xl bg-white ring-1 ring-stone-200"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase text-stone-500"><tr><th className="px-4 py-3">{english ? "Book" : "หนังสือ"}</th><th className="px-4 py-3">{english ? "Author" : "นักเขียน"}</th><th className="px-4 py-3">{english ? "Submitted" : "วันที่ส่ง"}</th><th className="px-4 py-3">{english ? "Type" : "ประเภท"}</th><th className="px-4 py-3 text-right">{english ? "Price" : "ราคา"}</th><th className="px-4 py-3">{english ? "Actions" : "จัดการ"}</th></tr></thead><tbody>{books.map((book) => <tr key={book._id} className="border-t border-stone-100"><td className="px-4 py-3"><div className="flex items-center gap-3"><div className="h-14 w-10 overflow-hidden rounded bg-stone-100">{book.coverUrl && <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />}</div><div><p className="font-bold">{book.title}</p><p className="text-xs text-stone-500">{book.slug}</p></div></div></td><td className="px-4 py-3"><p className="font-semibold">{book.contributors?.find((item) => item.role === "author")?.name || book.seller?.displayName || "—"}</p><p className="text-xs text-stone-500">{book.seller?.email || "—"}</p></td><td className="px-4 py-3 whitespace-nowrap">{new Date(book.createdAt).toLocaleString(english ? "en" : "th-TH")}</td><td className="px-4 py-3">{book.contentType}</td><td className="px-4 py-3 text-right font-bold">{price(book)}</td><td className="px-4 py-3"><button type="button" onClick={() => setSelected(book)} className="font-bold text-orange-700">{english ? "Review" : "ตรวจสอบเนื้อหา"}</button></td></tr>)}</tbody></table></div>}
    </div>

    {selected && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="review-book-title"><div className="my-5 w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-orange-700">{english ? "Submission review" : "ตรวจสอบคำขอวางขาย"}</p><h2 id="review-book-title" className="mt-1 text-2xl font-black">{selected.title}</h2><p className="mt-1 text-sm text-stone-500">{selected.contributors?.find((item) => item.role === "author")?.name} · {price(selected)}</p></div><button type="button" onClick={() => setSelected(null)} aria-label="Close" className="text-2xl text-stone-400">×</button></div><div className="mt-5 grid gap-5 md:grid-cols-[180px_1fr]">{selected.coverUrl ? <img src={selected.coverUrl} alt={`Cover: ${selected.title}`} className="aspect-[3/4] w-36 rounded-lg object-cover ring-1 ring-stone-200" /> : <div className="aspect-[3/4] w-36 rounded-lg bg-stone-100" />}<div><p className="whitespace-pre-wrap text-sm leading-6 text-stone-700">{selected.synopsis}</p><dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-stone-500">{english ? "Publisher" : "สำนักพิมพ์"}</dt><dd className="mt-1 font-semibold">{selected.publisher?.name || "—"}</dd></div><div><dt className="text-xs text-stone-500">{english ? "Format" : "รูปแบบ"}</dt><dd className="mt-1 font-semibold">{selected.format}</dd></div></dl>{selected.ebook?.fileUrl && <button type="button" onClick={() => openPreview(selected)} className="mt-4 rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold">{english ? "Open submitted file" : "เปิดไฟล์ E-Book"}</button>}</div></div>{selected.ebook?.contentHtml && <div className="mt-5"><p className="mb-2 text-sm font-bold">{english ? "Inline content preview" : "ตัวอย่างเนื้อหาในระบบ"}</p><iframe title={`${selected.title} preview`} sandbox="" srcDoc={selected.ebook.contentHtml} className="h-64 w-full rounded-lg border border-stone-200 bg-white" /></div>}<div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-stone-200 pt-5"><button type="button" disabled={busy} onClick={() => { setRejectTarget(selected); setReason(""); }} className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50">{english ? "Reject" : "ปฏิเสธ"}</button><button type="button" disabled={busy} onClick={() => approve(selected)} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? (english ? "Saving..." : "กำลังบันทึก...") : (english ? "Approve and publish" : "อนุมัติและเผยแพร่")}</button></div></div></div>}

    {rejectTarget && <div className="fixed inset-0 z-[60] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-book-title"><form onSubmit={reject} className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h2 id="reject-book-title" className="text-xl font-black">{english ? "Reject submission" : "ปฏิเสธคำขอวางขาย"}</h2><p className="mt-2 text-sm text-stone-600">{rejectTarget.title}</p><label className="mt-5 block text-sm font-bold">{english ? "Reason" : "เหตุผลที่ไม่อนุมัติ"}<textarea required minLength="3" maxLength="2000" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 min-h-28 w-full rounded-lg border border-stone-300 p-3 font-normal" placeholder={english ? "Explain what needs to be fixed" : "เช่น ปกหนังสือไม่ชัดเจน หรือไฟล์เนื้อหาไม่สมบูรณ์"} /></label><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setRejectTarget(null)} className="rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-bold">{english ? "Cancel" : "ยกเลิก"}</button><button type="submit" disabled={busy || !reason.trim()} className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? (english ? "Submitting..." : "กำลังบันทึก...") : (english ? "Confirm rejection" : "ยืนยันปฏิเสธ")}</button></div></form></div>}
  </main>;
}
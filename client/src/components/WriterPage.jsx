import { useEffect, useState } from "react";
import { transliterate } from "transliteration";
import { api } from "../api";

const blankForm = { title: "", slug: "", author: "", publisher: "", contentType: "novel", price: "", isFree: false, synopsis: "", source: "url", fileUrl: "", contentHtml: "", coverUrl: "" };
const statusFor = (status, english) => ({
  pending_approval: english ? "Pending approval" : "รออนุมัติ",
  published: english ? "Published" : "วางขายแล้ว",
  rejected: english ? "Rejected" : "ไม่อนุมัติ",
  draft: english ? "Draft" : "ฉบับร่าง",
}[status] || status);
const statusTone = (status) => ({
  pending_approval: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  draft: "bg-stone-100 text-stone-700",
}[status] || "bg-stone-100 text-stone-700");

export default function WriterPage({ user, onBack, onUserUpdated, onUnauthorized }) {
  const english = localStorage.getItem("plot_language") === "en";
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [slugAuto, setSlugAuto] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [reasonBook, setReasonBook] = useState(null);

  const loadBooks = async () => {
    const result = await api("/users/me/books");
    setBooks(result.books);
  };

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      setLoading(true);
      try {
        let currentUser = user;
        if (!currentUser.roles?.includes("author")) {
          const result = await api("/users/me/become-author", { method: "POST" });
          localStorage.setItem("plot_token", result.token);
          localStorage.setItem("plot_user", JSON.stringify(result.user));
          currentUser = result.user;
          onUserUpdated?.(result.user);
        }
        const result = await api("/users/me/books");
        if (active) setBooks(result.books);
      } catch (error) {
        if (error.status === 401 || error.status === 403) onUnauthorized?.();
        if (active) setMessage(error.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    initialize();
    return () => { active = false; };
  }, [user, onUnauthorized, onUserUpdated]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const upload = async (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const endpoint = kind === "cover" ? "/users/me/books/uploads/cover" : "/users/me/books/uploads/ebook";
      const result = await api(endpoint, { method: "POST", body: data });
      set(kind === "cover" ? "coverUrl" : "fileUrl", result[kind === "cover" ? "coverUrl" : "fileUrl"]);
      setMessage(english ? `${kind === "cover" ? "Cover" : "E-Book"} uploaded` : `อัปโหลด${kind === "cover" ? "ปกหนังสือ" : "ไฟล์ E-Book"}แล้ว`);
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const editRejected = (book) => {
    const source = book.sourceType === "writer" ? "writer" : book.sourceType === "upload" ? "upload" : "url";
    setForm({
      title: book.title || "",
      slug: book.slug || "",
      author: book.contributors?.find((item) => item.role === "author")?.name || user.authorProfile?.penName || user.displayName || "",
      publisher: book.publisher?.name || "",
      contentType: book.contentType || "novel",
      price: book.price?.amount ?? "",
      isFree: Boolean(book.isFree),
      synopsis: book.synopsis || "",
      source,
      fileUrl: book.ebook?.fileUrl?.startsWith("inline://") ? "" : book.ebook?.fileUrl || "",
      contentHtml: book.ebook?.contentHtml || "",
      coverUrl: book.coverUrl || "",
    });
    setEditingId(book._id);
    setSlugAuto(false);
    setMessage("");
    document.getElementById("writer-submission")?.scrollIntoView({ behavior: "smooth" });
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      synopsis: form.synopsis.trim(),
      coverUrl: form.coverUrl,
      format: "ebook",
      contentType: form.contentType,
      origin: "original",
      contributors: [{ name: form.author.trim(), role: "author" }],
      publisher: { name: form.publisher.trim(), type: form.publisher.trim() ? "publisher" : "independent" },
      price: { amount: form.isFree ? 0 : Number(form.price), currency: "THB" },
      isFree: form.isFree,
      sourceType: form.source,
      ebook: {
        fileUrl: form.source === "writer" ? `inline://${form.slug}` : form.fileUrl,
        contentHtml: form.source === "writer" ? form.contentHtml : undefined,
      },
    };
    try {
      if (editingId) {
        await api(`/users/me/books/${editingId}/resubmit`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/books", { method: "POST", body: JSON.stringify(payload) });
      }
      setForm(blankForm);
      setEditingId(null);
      setSlugAuto(true);
      await loadBooks();
      setMessage(english ? "Book submitted for admin approval" : "ส่งหนังสือให้แอดมินตรวจสอบแล้ว");
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-orange focus:ring-2 focus:ring-orange/20";

  return <main className="min-h-screen bg-[#fffaf4]">
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5"><button type="button" onClick={onBack} className="text-lg font-black">← PLOT</button><span className="text-sm font-bold text-stone-500">WRITER SPACE</span></div></header>
    <div className="mx-auto max-w-6xl px-5 py-9">
      <div><p className="text-xs font-bold uppercase text-emerald-700">FOR WRITERS</p><h1 className="mt-2 text-3xl font-black">{english ? "Your books" : "หนังสือของฉันที่ส่งขาย"}</h1><p className="mt-2 text-sm text-stone-500">{english ? "Track submissions and send your next story for review." : "ติดตามผลการตรวจสอบและส่งหนังสือเล่มใหม่ให้ทีมงานพิจารณา"}</p></div>
      {message && <p role="status" className="mt-5 rounded-lg bg-orange-50 px-4 py-3 text-sm text-orange-900">{message}</p>}
      <section className="mt-6"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-black">{english ? "Submission status" : "สถานะหนังสือ"}</h2><button type="button" onClick={() => document.getElementById("writer-submission")?.scrollIntoView({ behavior: "smooth" })} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white">{english ? "Submit a book" : "ส่งหนังสือเล่มใหม่"}</button></div>
        {loading ? <p className="rounded-xl bg-white px-5 py-10 text-center text-stone-500">{english ? "Loading your books..." : "กำลังโหลดหนังสือของคุณ..."}</p> : books.length ? <div className="divide-y divide-stone-100 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200">{books.map((book) => <article key={book._id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5"><div className="h-20 w-14 shrink-0 overflow-hidden rounded bg-stone-100">{book.coverUrl && <img src={book.coverUrl} alt={`ปก ${book.title}`} className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{book.title}</h3><p className="mt-1 text-xs text-stone-500">{english ? "Submitted" : "ส่งเมื่อ"} {new Date(book.createdAt).toLocaleDateString(english ? "en" : "th-TH")}</p>{book.status === "rejected" && <button type="button" onClick={() => setReasonBook(book)} className="mt-2 text-xs font-bold text-red-700 underline">{english ? "View rejection reason" : "ดูเหตุผลที่ไม่อนุมัติ"}</button>}</div><span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusTone(book.status)}`}>{statusFor(book.status, english)}</span>{book.status === "rejected" && <button type="button" onClick={() => editRejected(book)} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold">{english ? "Edit and resubmit" : "แก้ไขและส่งใหม่"}</button>}</article>)}</div> : <div className="rounded-xl bg-white p-10 text-center ring-1 ring-stone-200"><p className="font-bold">{english ? "You have not submitted a book yet." : "ยังไม่มีหนังสือที่ส่งขาย"}</p><p className="mt-2 text-sm text-stone-500">{english ? "Your submissions will appear here." : "หนังสือที่ส่งจะปรากฏในรายการนี้"}</p></div>}
      </section>

      <section id="writer-submission" className="mt-8 scroll-mt-6 rounded-xl bg-white p-5 ring-1 ring-stone-200 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">{editingId ? (english ? "Update rejected book" : "แก้ไขหนังสือที่ถูกปฏิเสธ") : (english ? "Submit an E-Book" : "ส่ง E-Book เพื่อวางขาย")}</h2><p className="mt-1 text-sm text-stone-500">{english ? "Submissions are reviewed before publishing." : "หนังสือทุกเล่มจะผ่านการตรวจสอบก่อนเผยแพร่"}</p></div>{editingId && <button type="button" onClick={() => { setEditingId(null); setForm(blankForm); }} className="text-sm font-bold text-stone-500">{english ? "Cancel edit" : "ยกเลิกการแก้ไข"}</button>}</div>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">{english ? "Title" : "ชื่อเรื่อง"}<input required maxLength="300" value={form.title} onChange={(event) => { const title = event.target.value; set("title", title); if (slugAuto) set("slug", transliterate(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} className={fieldClass} /></label>
          <label className="text-sm font-bold">Slug<input required pattern="[a-z0-9-]+" maxLength="300" value={form.slug} onChange={(event) => { setSlugAuto(false); set("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} className={fieldClass} /></label>
          <label className="text-sm font-bold">{english ? "Author / pen name" : "ผู้เขียน / นามปากกา"}<input required maxLength="150" value={form.author} onChange={(event) => set("author", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">{english ? "Publisher (optional)" : "สำนักพิมพ์ (ไม่บังคับ)"}<input maxLength="150" value={form.publisher} onChange={(event) => set("publisher", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">{english ? "Content type" : "ประเภทเนื้อหา"}<select value={form.contentType} onChange={(event) => set("contentType", event.target.value)} className={fieldClass}><option value="novel">{english ? "Novel" : "นิยาย"}</option><option value="comic">{english ? "Comic" : "การ์ตูน"}</option><option value="magazine">{english ? "Magazine" : "นิตยสาร"}</option><option value="newspaper">{english ? "Newspaper" : "หนังสือพิมพ์"}</option></select></label>
          <label className="text-sm font-bold">{english ? "Price (THB)" : "ราคา (บาท)"}<input required={!form.isFree} disabled={form.isFree} type="number" min="0" step="1" value={form.isFree ? 0 : form.price} onChange={(event) => set("price", event.target.value)} className={`${fieldClass} disabled:bg-stone-100`} /></label>
          <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.isFree} onChange={(event) => set("isFree", event.target.checked)} className="accent-orange" />{english ? "Free book" : "หนังสืออ่านฟรี"}</label>
          <label className="text-sm font-bold sm:col-span-2">{english ? "Synopsis" : "เรื่องย่อ"}<textarea required maxLength="10000" value={form.synopsis} onChange={(event) => set("synopsis", event.target.value)} className={`${fieldClass} min-h-28`} /></label>
          <fieldset className="rounded-lg border border-stone-200 p-4 sm:col-span-2"><legend className="px-1 text-sm font-bold">{english ? "E-Book source" : "แหล่งที่มา / ไฟล์ E-Book"}</legend><div className="flex flex-wrap gap-5 text-sm"><label><input type="radio" checked={form.source === "url"} onChange={() => set("source", "url")} /> {english ? "File URL" : "URL ไฟล์"}</label><label><input type="radio" checked={form.source === "upload"} onChange={() => set("source", "upload")} /> {english ? "Upload EPUB/PDF" : "อัปโหลด EPUB/PDF"}</label><label><input type="radio" checked={form.source === "writer"} onChange={() => set("source", "writer")} /> {english ? "Write in browser" : "เขียนในเบราว์เซอร์"}</label></div>{form.source === "url" && <label className="mt-4 block text-sm font-bold">{english ? "E-Book URL" : "URL ไฟล์ E-Book"}<input required type="url" value={form.fileUrl} onChange={(event) => set("fileUrl", event.target.value)} className={fieldClass} placeholder="https://..." /></label>}{form.source === "upload" && <div className="mt-4"><input required={!form.fileUrl} type="file" accept=".epub,.pdf,application/epub+zip,application/pdf" onChange={(event) => upload(event, "ebook")} /><p className="mt-2 text-xs text-stone-500">{form.fileUrl ? (english ? "File ready to submit." : "ไฟล์พร้อมส่งตรวจแล้ว") : (english ? "EPUB or PDF, maximum 50 MB." : "ไฟล์ EPUB หรือ PDF ขนาดไม่เกิน 50 MB")}</p></div>}{form.source === "writer" && <textarea required value={form.contentHtml} onChange={(event) => set("contentHtml", event.target.value)} className={`${fieldClass} mt-4 min-h-48`} placeholder={english ? "E-Book content; basic HTML is supported." : "เนื้อหา E-Book รองรับ HTML พื้นฐาน"} />}</fieldset>
          <label className="text-sm font-bold sm:col-span-2">{english ? "Cover image" : "รูปหน้าปกหนังสือ"}<input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => upload(event, "cover")} className="mt-2 block w-full rounded-lg border border-stone-300 p-2.5 font-normal" />{form.coverUrl && <img src={form.coverUrl} alt="ตัวอย่างปกหนังสือ" className="mt-3 h-32 w-24 rounded-lg object-cover ring-1 ring-stone-200" />}</label>
          <button type="submit" disabled={saving || uploading || loading || (form.source === "upload" && !form.fileUrl)} className="rounded-lg bg-orange px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{saving ? (english ? "Submitting..." : "กำลังส่งตรวจ...") : (english ? "Submit for admin approval" : "ส่งขออนุมัติวางขาย")}</button>
        </form>
      </section>
    </div>
    {reasonBook && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reason-title"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><h2 id="reason-title" className="text-xl font-black">{english ? "Rejection reason" : "เหตุผลที่ไม่อนุมัติ"}</h2><p className="mt-3 text-sm font-semibold">{reasonBook.title}</p><p className="mt-2 whitespace-pre-wrap rounded-lg bg-red-50 p-4 text-sm leading-6 text-red-900">{reasonBook.rejectionReason || (english ? "No reason provided" : "ไม่มีรายละเอียดเหตุผล")}</p><button type="button" onClick={() => setReasonBook(null)} className="mt-5 w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white">{english ? "Close" : "ปิด"}</button></div></div>}
  </main>;
}
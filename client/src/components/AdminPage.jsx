import { useEffect, useState } from "react";
import { api } from "../api";
import { transliterate } from "transliteration";

const emptyBook = {
  title: "",
  slug: "",
  synopsis: "",
  coverUrl: "",
  contentType: "novel",
  author: "",
  publisher: "",
  price: "",
  source: "url",
  fileUrl: "",
  contentHtml: "",
  isFree: false,
  isRecommended: false,
  isHeroFeatured: false,
  status: "published",
};

export default function AdminPage({
  language,
  onLanguageChange,
  onBack,
  onCart,
  onUnauthorized,
}) {
  const english = language === "en";
  const [users, setUsers] = useState([]);
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState(emptyBook);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugAuto, setSlugAuto] = useState(true);
  const [editBook, setEditBook] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [recommendedLoading, setRecommendedLoading] = useState(null);
  const [heroLoading, setHeroLoading] = useState(null);
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const load = async () => {
    setLoading(true);
    try {
      const [u, b] = await Promise.all([
        api("/admin/users"),
        api("/admin/books/all"),
      ]);
      setUsers(u.users);
      setBooks(b.books);
    } catch (error) {
      if (error.status === 401 || error.status === 403) onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput)
      fileInput.accept =
        ".epub,.pdf,.jpg,.jpeg,.png,.webp,application/epub+zip,application/pdf,image/jpeg,image/png,image/webp";
  }, []);
  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const isCover = file.type.startsWith("image/");
      const result = await api(
        isCover ? "/admin/uploads/cover" : "/admin/uploads/ebook",
        { method: "POST", body: data },
      );
      set(
        isCover ? "coverUrl" : "fileUrl",
        result[isCover ? "coverUrl" : "fileUrl"],
      );
      setMessage(
        `${isCover ? "Cover uploaded" : "Uploaded"}: ${result.fileName}`,
      );
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  };
  const uploadCover = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await api("/admin/uploads/cover", {
        method: "POST",
        body: data,
      });
      set("coverUrl", result.coverUrl);
      setMessage(`Cover uploaded: ${result.fileName}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  };
  const uploadCoverForBook = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !editBook) return;
    setUploading(true);
    setMessage("");
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await api("/admin/uploads/cover", {
        method: "POST",
        body: data,
      });
      setEditBook((current) => ({ ...current, coverUrl: result.coverUrl }));
      setMessage(`Cover uploaded: ${result.fileName}. กดบันทึกเพื่อใช้ปกนี้`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  const createBook = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const fileUrl =
        form.source === "writer" ? `inline://${form.slug}` : form.fileUrl;
      const { book } = await api("/admin/books", {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          author: form.author,
          description: form.synopsis,
          sourceType: form.source,
          synopsis: form.synopsis,
          coverUrl: form.coverUrl,
          contentType: form.contentType,
          format: "ebook",
          origin: "original",
          ebook: {
            fileUrl,
            contentHtml:
              form.source === "writer" ? form.contentHtml : undefined,
          },
          contributors: [{ name: form.author, role: "author" }],
          publisher: {
            name: form.publisher,
            type: form.publisher ? "publisher" : "independent",
          },
          price: {
            amount: form.isFree ? 0 : Number(form.price),
            currency: "THB",
          },
          isFree: form.isFree,
          isRecommended: form.isRecommended,
          isHeroFeatured: form.isHeroFeatured,
          status: form.status,
        }),
      });
      setBooks((items) => [book, ...items]);
      setForm(emptyBook);
      setSlugAuto(true);
      setMessage(
        english ? "E-Book added successfully" : "เพิ่ม E-Book เรียบร้อยแล้ว",
      );
      await load();
    } catch (error) {
      setMessage(
        error.status === 403
          ? english
            ? "Admin permission is required"
            : "ต้องใช้สิทธิ์ Admin เท่านั้น"
          : error.message,
      );
    } finally {
      setSaving(false);
    }
  };
  const updateUser = async (id, changes) => {
    try {
      const { user } = await api(`/admin/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setUsers((items) =>
        items.map((item) => (item._id === id ? { ...item, ...user } : item)),
      );
      setMessage("User updated");
    } catch (error) {
      if (error.status === 401 || error.status === 403)
        return onUnauthorized?.();
      setMessage(error.message);
    }
  };
  const updateBook = async (id, changes) => {
    try {
      const { book } = await api(`/admin/books/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setBooks((items) =>
        items.map((item) => (item._id === id ? { ...item, ...book } : item)),
      );
      setMessage("Book updated");
    } catch (error) {
      if (error.status === 401 || error.status === 403)
        return onUnauthorized?.();
      setMessage(error.message);
    }
  };
  const toggleUserRole = (user) => {
    const roles = user.roles.map((role) => role.toLowerCase());
    updateUser(user._id, {
      roles: roles.includes("admin")
        ? roles.filter((role) => role !== "admin")
        : [...roles, "admin"],
    });
  };
  const toggleUserStatus = (user) =>
    updateUser(user._id, {
      status: user.status === "active" ? "suspended" : "active",
    });
  const toggleRecommended = async (book) => {
    if (recommendedLoading) return;
    setRecommendedLoading(book._id);
    try {
      const { book: updatedBook, message: responseMessage } = await api(
        `/admin/books/${book._id}/recommend`,
        { method: "PATCH" },
      );
      setBooks((items) =>
        items.map((item) =>
          item._id === book._id ? { ...item, ...updatedBook } : item,
        ),
      );
      setMessage(responseMessage || "อัปเดตสถานะหนังสือแนะนำเรียบร้อย");
    } catch (error) {
      if (error.status === 401 || error.status === 403)
        return onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setRecommendedLoading(null);
    }
  };
  const toggleHero = async (book) => {
    if (heroLoading) return;
    setHeroLoading(book._id);
    try {
      const { book: updatedBook, message: responseMessage } = await api(
        `/admin/books/${book._id}/hero`,
        { method: "PATCH" },
      );
      setBooks((items) =>
        items.map((item) =>
          item._id === book._id ? { ...item, ...updatedBook } : item,
        ),
      );
      setMessage(responseMessage || "อัปเดตหนังสือหน้าแรกเรียบร้อย");
    } catch (error) {
      if (error.status === 401 || error.status === 403)
        return onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setHeroLoading(null);
    }
  };
  const saveEditedBook = async (event) => {
    event.preventDefault();
    await updateBook(editBook._id, {
      title: editBook.title,
      synopsis: editBook.synopsis,
      price: {
        amount: Number(editBook.price?.amount ?? editBook.price ?? 0),
        currency: "THB",
      },
      status: editBook.status,
      isRecommended: editBook.isRecommended,
      isHeroFeatured: editBook.isHeroFeatured,
    });
    setEditBook(null);
  };
  const deleteBook = async () => {
    try {
      await api(`/admin/books/${deleteTarget._id}`, { method: "DELETE" });
      setBooks((items) =>
        items.filter((book) => book._id !== deleteTarget._id),
      );
      setMessage(english ? "Book deleted" : "ลบหนังสือเรียบร้อยแล้ว");
    } catch (error) {
      if (error.status === 401 || error.status === 403)
        return onUnauthorized?.();
      setMessage(error.message);
    } finally {
      setDeleteTarget(null);
    }
  };
  const addBookToCart = async (slug) => {
    try {
      const cart = await api("/cart/items", {
        method: "POST",
        body: JSON.stringify({ slug }),
      });
      setMessage(`Added to cart (${cart.items.length} items)`);
    } catch (error) {
      setMessage(error.message);
    }
  };
  const addSampleBooks = async () => {
    try {
      const { books: samples } = await api("/admin/books/seed", {
        method: "POST",
      });
      setMessage(
        english
          ? `Created ${samples.length} sample E-Books`
          : `สร้าง E-Book ตัวอย่าง ${samples.length} รายการ`,
      );
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-[#fffaf4]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5">
          <button onClick={onBack} className="text-lg font-black">
            ← PLOT
          </button>
          <div className="flex items-center gap-3">
            <div
              className="flex rounded-full border border-stone-200 bg-white p-1 text-xs font-bold"
              aria-label="เลือกภาษา"
            >
              <button
                type="button"
                onClick={() => onLanguageChange("th")}
                className={`rounded-full px-2.5 py-1 ${!english ? "bg-ink text-white" : "text-stone-500"}`}
              >
                ไทย
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange("en")}
                className={`rounded-full px-2.5 py-1 ${english ? "bg-ink text-white" : "text-stone-500"}`}
              >
                EN
              </button>
            </div>
            <button
              onClick={onCart}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold"
            >
              {english ? "Cart" : "ตะกร้าสินค้า"}
            </button>
            <span className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white">
              ADMIN CONSOLE
            </span>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">
              {english ? "Manage platform data" : "จัดการข้อมูลแพลตฟอร์ม"}
            </h1>
            <p className="mt-2 text-stone-500">
              {english
                ? "Add E-Books from a URL, upload a file, or write directly in the browser."
                : "เพิ่ม E-Book จาก URL อัปโหลดไฟล์ หรือเขียนเนื้อหาโดยตรงในเบราว์เซอร์"}
            </p>
          </div>
          <button
            onClick={addSampleBooks}
            className="rounded-full bg-ink px-5 py-3 text-sm font-bold text-white"
          >
            {english ? "Create sample E-Books" : "สร้าง E-Book ตัวอย่าง"}
          </button>
        </div>
        {message && (
          <p className="mt-5 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {message}
          </p>
        )}
        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-xl font-black">
            {english ? "Add E-Book" : "เพิ่ม E-Book"}
          </h2>
          <form
            onSubmit={createBook}
            className="mt-5 grid gap-4 sm:grid-cols-2"
          >
            <label className="text-sm font-bold">
              {english ? "Title" : "ชื่อเรื่อง"}
              <input
                required
                value={form.title}
                onChange={(e) => {
                  const title = e.target.value;
                  set("title", title);
                  if (slugAuto)
                    set(
                      "slug",
                      transliterate(title)
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/^-|-$/g, ""),
                    );
                }}
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
              />
            </label>
            <label className="text-sm font-bold">
              Slug
              <input
                required
                pattern="[a-z0-9-]+"
                value={form.slug}
                onChange={(e) => {
                  setSlugAuto(false);
                  set(
                    "slug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  );
                }}
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
                placeholder="my-book-title"
              />
            </label>
            <label className="text-sm font-bold">
              {english ? "Author" : "ผู้เขียน"}
              <input
                required
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
              />
            </label>
            <label className="text-sm font-bold">
              {english ? "Publisher" : "สำนักพิมพ์"}{" "}
              <span className="font-normal text-stone-400">
                ({english ? "optional" : "ไม่บังคับ"})
              </span>
              <input
                value={form.publisher}
                onChange={(e) => set("publisher", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
                placeholder={
                  english ? "Blank = independent" : "เว้นว่าง = นักเขียนอิสระ"
                }
              />
            </label>
            <label className="text-sm font-bold">
              {english ? "Content type" : "ประเภทเนื้อหา"}
              <select
                value={form.contentType}
                onChange={(e) => set("contentType", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
              >
                <option value="novel">{english ? "Novel" : "นิยาย"}</option>
                <option value="comic">{english ? "Comic" : "การ์ตูน"}</option>
                <option value="magazine">
                  {english ? "Magazine" : "นิตยสาร"}
                </option>
                <option value="newspaper">
                  {english ? "Newspaper" : "หนังสือพิมพ์"}
                </option>
              </select>
            </label>
            <label className="text-sm font-bold">
              {english ? "Price (THB)" : "ราคา (บาท)"}
              <input
                required={!form.isFree}
                disabled={form.isFree}
                min="0"
                type="number"
                value={form.isFree ? 0 : form.price}
                onChange={(e) => set("price", e.target.value)}
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal disabled:bg-stone-100"
              />
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              {english ? "Synopsis" : "เรื่องย่อ"}
              <textarea
                required
                value={form.synopsis}
                onChange={(e) => set("synopsis", e.target.value)}
                className="mt-1 min-h-24 w-full rounded-xl border border-stone-200 p-3 font-normal"
              />
            </label>
            <fieldset className="rounded-xl border border-stone-200 p-4 sm:col-span-2">
              <legend className="px-1 text-sm font-bold">
                {english ? "E-Book source" : "แหล่งที่มาของ E-Book"}
              </legend>
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                <label>
                  <input
                    type="radio"
                    checked={form.source === "url"}
                    onChange={() => set("source", "url")}
                  />{" "}
                  {english ? "File URL" : "URL ไฟล์"}
                </label>
                <label>
                  <input
                    type="radio"
                    checked={form.source === "upload"}
                    onChange={() => set("source", "upload")}
                  />{" "}
                  {english ? "Upload EPUB/PDF" : "อัปโหลด EPUB/PDF"}
                </label>
                <label>
                  <input
                    type="radio"
                    checked={form.source === "writer"}
                    onChange={() => set("source", "writer")}
                  />{" "}
                  {english ? "Write in browser" : "เขียนในเบราว์เซอร์"}
                </label>
              </div>
              {form.source === "url" && (
                <input
                  required
                  type="url"
                  value={form.fileUrl}
                  onChange={(e) => set("fileUrl", e.target.value)}
                  className="mt-4 w-full rounded-xl border border-stone-200 p-3"
                  placeholder="https://storage.example/book.epub"
                />
              )}
              {form.source === "upload" && (
                <div className="mt-4">
                  <input
                    required
                    type="file"
                    accept=".epub,.pdf,application/epub+zip,application/pdf"
                    onChange={uploadFile}
                  />
                  <p className="mt-2 text-xs text-stone-500">
                    {english
                      ? "EPUB or PDF, maximum 50 MB."
                      : "EPUB หรือ PDF ขนาดไม่เกิน 50 MB"}{" "}
                    {form.fileUrl &&
                      (english ? "File ready to save." : "ไฟล์พร้อมบันทึกแล้ว")}
                  </p>
                </div>
              )}
              {form.source === "writer" && (
                <textarea
                  required
                  value={form.contentHtml}
                  onChange={(e) => set("contentHtml", e.target.value)}
                  className="mt-4 min-h-56 w-full rounded-xl border border-stone-200 p-3"
                  placeholder={
                    english
                      ? "Write your E-Book content here. Basic HTML is supported."
                      : "เขียนเนื้อหา E-Book ที่นี่ รองรับ HTML พื้นฐาน"
                  }
                />
              )}
            </fieldset>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={form.isFree}
                onChange={(e) => set("isFree", e.target.checked)}
              />{" "}
              {english ? "Free download" : "ดาวน์โหลดฟรี"}
            </label>
            <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isRecommended}
                onChange={(event) => set("isRecommended", event.target.checked)}
              />{" "}
              {english
                ? "Set as recommended (show on homepage)"
                : "ตั้งเป็นหนังสือแนะนำ (แสดงในหน้าแรก)"}
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              {english ? "Book cover" : "รูปหน้าปกหนังสือ"}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={uploadCover}
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
              />
              {form.coverUrl && (
                <img
                  src={form.coverUrl}
                  alt="ตัวอย่างปกหนังสือ"
                  className="mt-3 h-28 w-20 rounded-lg object-cover ring-1 ring-stone-200"
                />
              )}
            </label>
            <label className="flex items-center gap-2 text-sm font-bold sm:col-span-2">
              <input
                type="checkbox"
                checked={form.isHeroFeatured}
                onChange={(event) =>
                  set("isHeroFeatured", event.target.checked)
                }
              />{" "}
              {english
                ? "Show in hero showcase (max 3 books)"
                : "แสดงในกรอบหน้าแรก (สูงสุด 3 เล่ม)"}
            </label>
            <label className="text-sm font-bold">
              {english ? "Status" : "สถานะ"}
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="ml-3 rounded-xl border border-stone-200 p-2 font-normal"
              >
                <option value="draft">{english ? "Draft" : "ฉบับร่าง"}</option>
                <option value="published">
                  {english ? "Published" : "เผยแพร่"}
                </option>
              </select>
            </label>
            <button
              disabled={
                saving ||
                uploading ||
                (form.source === "upload" && !form.fileUrl)
              }
              className="rounded-full bg-orange px-6 py-3 font-bold text-white disabled:opacity-60 sm:col-span-2"
            >
              {saving
                ? english
                  ? "Adding…"
                  : "กำลังเพิ่ม…"
                : uploading
                  ? english
                    ? "Uploading…"
                    : "กำลังอัปโหลด…"
                  : english
                    ? "Add E-Book"
                    : "เพิ่ม E-Book"}
            </button>
          </form>
        </section>
        {loading ? (
          <p className="mt-8 text-stone-500">Loading…</p>
        ) : (
          <div className="mt-10 space-y-10">
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xl font-black">Users</h2>
                <button
                  onClick={load}
                  disabled={loading}
                  className="text-sm font-bold text-orange-600"
                >
                  {loading ? "Loading..." : "Refresh"}
                </button>
              </div>
              <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-stone-200">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-stone-500">
                    <tr>
                      <th className="p-4">Name</th>
                      <th>Email</th>
                      <th>Roles</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!users.length && (
                      <tr>
                        <td
                          colSpan="5"
                          className="p-10 text-center text-stone-500"
                        >
                          ไม่พบข้อมูลผู้ใช้ในระบบ
                        </td>
                      </tr>
                    )}
                    {users.map((user) => (
                      <tr
                        key={user._id}
                        className="border-b border-stone-100 last:border-0"
                      >
                        <td className="p-4 font-semibold">
                          {user.displayName}
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role) => (
                              <span
                                key={role}
                                className={`rounded-full px-2 py-1 text-xs font-bold ${role.toLowerCase() === "admin" ? "bg-orange-100 text-orange-700" : "bg-stone-100 text-stone-600"}`}
                              >
                                {role.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${user.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                          >
                            {user.status === "active" ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => toggleUserRole(user)}
                              className="text-xs font-bold text-orange-600"
                            >
                              {user.roles.some(
                                (role) => role.toLowerCase() === "admin",
                              )
                                ? "Demote"
                                : "Promote"}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleUserStatus(user)}
                              className="text-xs font-bold text-stone-600"
                            >
                              {user.status === "active" ? "Ban" : "Unban"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-xl font-black">Books</h2>
              <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-stone-200">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-stone-200 text-stone-500">
                    <tr>
                      <th className="p-4">Title</th>
                      <th>Type</th>
                      <th>Seller</th>
                      <th>Price</th>
                      <th>Publishing status</th>
                      <th>แนะนำ</th>
                      <th>หน้าแรก</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!books.length && (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-10 text-center text-stone-500"
                        >
                          ยังไม่มีหนังสือในระบบ
                        </td>
                      </tr>
                    )}
                    {books.map((book) => (
                      <tr
                        key={book._id}
                        className="border-b border-stone-100 last:border-0"
                      >
                        <td className="p-4 font-semibold">{book.title}</td>
                        <td>
                          {book.sourceType === "writer"
                            ? "Web"
                            : book.sourceType === "upload"
                              ? "EPUB/PDF"
                              : book.format === "audiobook"
                                ? "Audio"
                                : "PDF/EPUB"}
                        </td>
                        <td>
                          {book.seller?.displayName ||
                            book.publisher?.name ||
                            "—"}
                        </td>
                        <td>
                          {book.isFree ? "Free" : `฿${book.price?.amount ?? 0}`}
                        </td>
                        <td>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-bold ${book.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                          >
                            {book.status === "published"
                              ? "เผยแพร่"
                              : "ฉบับร่าง"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            disabled={recommendedLoading === book._id}
                            onClick={() => toggleRecommended(book)}
                            aria-label={
                              book.isRecommended
                                ? "ยกเลิกหนังสือแนะนำ"
                                : "ตั้งเป็นหนังสือแนะนำ"
                            }
                            className={`text-2xl transition hover:scale-110 disabled:cursor-wait disabled:opacity-50 ${book.isRecommended ? "text-orange-500" : "text-stone-300"}`}
                          >
                            {recommendedLoading === book._id ? "…" : "★"}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            disabled={heroLoading === book._id}
                            onClick={() => toggleHero(book)}
                            aria-label={
                              book.isHeroFeatured
                                ? "นำออกจาก Hero หน้าแรก"
                                : "เพิ่มใน Hero หน้าแรก"
                            }
                            className={`text-2xl transition hover:scale-110 disabled:cursor-wait disabled:opacity-50 ${book.isHeroFeatured ? "text-orange-500" : "text-stone-300"}`}
                          >
                            {heroLoading === book._id ? "…" : "◆"}
                          </button>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateBook(book._id, {
                                  status:
                                    book.status === "published"
                                      ? "draft"
                                      : "published",
                                })
                              }
                              className="text-xs font-bold text-orange-600"
                            >
                              {book.status === "published"
                                ? "เป็นฉบับร่าง"
                                : "เผยแพร่"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditBook({
                                  ...book,
                                  price: book.price || { amount: 0 },
                                })
                              }
                              className="text-xs font-bold text-stone-700"
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(book)}
                              className="text-xs font-bold text-red-600"
                            >
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
      {editBook && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={saveEditedBook}
            className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">แก้ไขหนังสือ</h2>
              <button
                type="button"
                onClick={() => setEditBook(null)}
                className="text-2xl text-stone-400"
              >
                ×
              </button>
            </div>
            <label className="mt-5 block text-sm font-bold">
              ชื่อเรื่อง
              <input
                required
                value={editBook.title}
                onChange={(event) =>
                  setEditBook({ ...editBook, title: event.target.value })
                }
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
              />
            </label>
            <label className="mt-4 block text-sm font-bold">
              เรื่องย่อ
              <textarea
                required
                value={editBook.synopsis || ""}
                onChange={(event) =>
                  setEditBook({ ...editBook, synopsis: event.target.value })
                }
                className="mt-1 min-h-28 w-full rounded-xl border border-stone-200 p-3 font-normal"
              />
            </label>
            <label className="mt-4 block text-sm font-bold">
              รูปหน้าปกหนังสือ
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={uploadCoverForBook}
                className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
              />
              {editBook.coverUrl && (
                <img
                  src={editBook.coverUrl}
                  alt="ตัวอย่างปกหนังสือ"
                  className="mt-3 h-32 w-24 rounded-lg object-cover ring-1 ring-stone-200"
                />
              )}
            </label>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <label className="text-sm font-bold">
                ราคา
                <input
                  type="number"
                  min="0"
                  value={editBook.price?.amount ?? 0}
                  onChange={(event) =>
                    setEditBook({
                      ...editBook,
                      price: { ...editBook.price, amount: event.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
                />
              </label>
              <label className="text-sm font-bold">
                สถานะ
                <select
                  value={editBook.status}
                  onChange={(event) =>
                    setEditBook({ ...editBook, status: event.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 p-3 font-normal"
                >
                  <option value="draft">ฉบับร่าง</option>
                  <option value="published">เผยแพร่</option>
                  <option value="unpublished">ไม่เผยแพร่</option>
                </select>
              </label>
            </div>
            <label className="mt-5 flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={Boolean(editBook.isRecommended)}
                onChange={(event) =>
                  setEditBook({
                    ...editBook,
                    isRecommended: event.target.checked,
                  })
                }
              />{" "}
              ตั้งเป็นหนังสือแนะนำ (แสดงในหน้าแรก)
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={Boolean(editBook.isHeroFeatured)}
                onChange={(event) =>
                  setEditBook({
                    ...editBook,
                    isHeroFeatured: event.target.checked,
                  })
                }
              />{" "}
              แสดงในกรอบหน้าแรก (สูงสุด 3 เล่ม)
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditBook(null)}
                className="rounded-full border border-stone-200 px-5 py-2.5 text-sm font-bold"
              >
                ยกเลิก
              </button>
              <button
                disabled={saving}
                className="rounded-full bg-orange px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                บันทึก
              </button>
            </div>
          </form>
        </div>
      )}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-5"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
            <h2 className="text-xl font-black">ยืนยันการลบหนังสือ</h2>
            <p className="mt-3 text-stone-600">
              ต้องการลบ “{deleteTarget.title}” ใช่หรือไม่?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-full border border-stone-200 px-5 py-2.5 text-sm font-bold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={deleteBook}
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white"
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

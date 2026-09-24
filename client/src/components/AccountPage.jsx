import { useEffect, useState } from "react";
import { api } from "../api";
import SubscriptionStatus from "./SubscriptionStatus";

export default function AccountPage({ initialUser, onUserUpdated, onSignOut, onBack, onLibrary, onAdmin }) {
  const [user, setUser] = useState(initialUser);
  const [form, setForm] = useState({
    displayName: initialUser.displayName || "",
    avatarUrl: initialUser.avatarUrl || "",
    penName: initialUser.authorProfile?.penName || "",
    bio: initialUser.authorProfile?.bio || "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api("/users/me").then(({ user: freshUser }) => {
      setUser(freshUser);
      setForm({
        displayName: freshUser.displayName || "",
        avatarUrl: freshUser.avatarUrl || "",
        penName: freshUser.authorProfile?.penName || "",
        bio: freshUser.authorProfile?.bio || "",
      });
      onUserUpdated(freshUser);
    }).catch(() => setMessage("แสดงข้อมูลที่บันทึกไว้ล่าสุด"));
  }, [onUserUpdated]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const { user: updatedUser } = await api("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: form.displayName,
          avatarUrl: form.avatarUrl,
          authorProfile: { penName: form.penName, bio: form.bio },
        }),
      });
      setUser(updatedUser);
      onUserUpdated(updatedUser);
      setMessage("บันทึกข้อมูลบัญชีเรียบร้อยแล้ว");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const initials = user.displayName?.trim().slice(0, 1) || "U";

  return <main className="min-h-screen bg-[#fffaf4]">
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-18 max-w-5xl items-center justify-between px-5">
        <button onClick={onBack} className="flex items-center gap-2 text-xl font-black"><span className="grid h-9 w-9 place-items-center rounded-xl bg-orange text-white">▭</span>พล็อต</button>
        <button onClick={onSignOut} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold hover:border-red-400 hover:text-red-600">ออกจากระบบ</button>
      </div>
    </header>
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm font-bold text-orange-600">MY ACCOUNT</p>
      <h1 className="mt-2 text-4xl font-black">บัญชีของฉัน</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[290px_1fr]">
        <aside className="h-fit rounded-3xl bg-ink p-7 text-white">
          <div className="grid h-18 w-18 place-items-center overflow-hidden rounded-2xl bg-orange text-3xl font-black">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="รูปโปรไฟล์" className="h-full w-full object-cover" /> : initials}
          </div>
          <h2 className="mt-5 text-xl font-black">{user.displayName}</h2>
          <p className="mt-1 text-sm text-stone-300">{user.email}</p>
          <div className="mt-6 border-t border-white/15 pt-5 text-sm text-stone-300"><p>สมาชิกตั้งแต่</p><p className="mt-1 font-bold text-white">{new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(user.createdAt))}</p></div>
          <button onClick={onBack} className="mt-7 w-full rounded-full bg-white/10 py-3 text-sm font-bold hover:bg-white/20">เลือกหนังสือต่อ</button>
          <button onClick={onLibrary} className="mt-3 w-full rounded-full bg-white/10 py-3 text-sm font-bold hover:bg-white/20">คลังหนังสือของฉัน</button>
          {user.roles?.includes("admin") && <button onClick={onAdmin} className="mt-3 w-full rounded-full bg-orange py-3 text-sm font-bold text-white">Admin console</button>}
        </aside>
        <div className="space-y-6">
        <SubscriptionStatus onRenew={() => setMessage("ระบบชำระค่าสมาชิกกำลังเปิดให้ใช้งาน")} />
        <section className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-stone-200 sm:p-9">
          <h2 className="text-2xl font-black">ข้อมูลโปรไฟล์</h2>
          <p className="mt-1 text-sm text-stone-500">ข้อมูลนี้จะแสดงต่อผู้อ่านเมื่อคุณเปิดเป็นนักเขียน</p>
          <form onSubmit={saveProfile} className="mt-7 space-y-5">
            <label className="block text-sm font-bold">ชื่อที่แสดง<input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-orange" /></label>
            <label className="block text-sm font-bold">URL รูปโปรไฟล์<input type="url" value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-orange" placeholder="https://..." /></label>
            <div className="border-t border-stone-100 pt-5"><p className="font-bold">โปรไฟล์นักเขียน <span className="font-normal text-stone-400">(ไม่บังคับ)</span></p><div className="mt-4 space-y-4"><label className="block text-sm font-bold">นามปากกา<input value={form.penName} onChange={(event) => setForm({ ...form, penName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-orange" /></label><label className="block text-sm font-bold">แนะนำตัว<textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="mt-1.5 min-h-28 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-orange" maxLength="2000" /></label></div></div>
            {message && <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-700">{message}</p>}
            <button disabled={loading} className="rounded-full bg-orange px-6 py-3 font-bold text-white hover:bg-orange-600 disabled:opacity-60">{loading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}</button>
          </form>
        </section>
        </div>
      </div>
    </div>
  </main>;
}

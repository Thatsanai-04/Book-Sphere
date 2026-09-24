import { useState } from "react";
import { api } from "../api";

const emptyRegister = { displayName: "", email: "", password: "" };
const emptyLogin = { email: "", password: "" };

export default function AuthModal({ mode: initialMode, onClose, onAuthenticated }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState(initialMode === "register" ? emptyRegister : emptyLogin);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setForm(nextMode === "register" ? emptyRegister : emptyLogin);
    setError("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api(`/users/${isRegister ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("plot_token", data.token);
      localStorage.setItem("plot_user", JSON.stringify(data.user));
      onAuthenticated(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={onClose}>
    <form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
      <button type="button" onClick={onClose} className="float-right -mr-1 -mt-3 text-2xl text-stone-400 hover:text-stone-800" aria-label="ปิด">×</button>
      <p className="text-sm font-bold text-orange-600">PLOT ACCOUNT</p>
      <h2 className="mt-2 text-3xl font-black">{isRegister ? "เริ่มต้นเรื่องใหม่กับเรา" : "ยินดีต้อนรับกลับมา"}</h2>
      <p className="mt-2 text-sm text-stone-500">{isRegister ? "สร้างบัญชีเพื่อซื้อ เก็บ และอ่านหนังสือที่คุณรัก" : "เข้าสู่ระบบเพื่อกลับไปอ่านเรื่องโปรดของคุณ"}</p>
      <div className="mt-6 space-y-4">
        {isRegister && <label className="block text-sm font-bold">ชื่อที่แสดง<input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-orange" placeholder="เช่น นานา" /></label>}
        <label className="block text-sm font-bold">อีเมล<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-orange" placeholder="you@example.com" /></label>
        <label className="block text-sm font-bold">รหัสผ่าน<input required type="password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1.5 w-full rounded-xl border border-stone-200 px-4 py-3 outline-none focus:border-orange" placeholder="อย่างน้อย 8 ตัวอักษร" /></label>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <button disabled={loading} className="mt-6 w-full rounded-full bg-orange py-3.5 font-bold text-white disabled:cursor-wait disabled:opacity-60 hover:bg-orange-600">{loading ? "กำลังดำเนินการ..." : isRegister ? "สร้างบัญชี" : "เข้าสู่ระบบ"}</button>
      <p className="mt-5 text-center text-sm text-stone-500">{isRegister ? "มีบัญชีอยู่แล้ว? " : "ยังไม่มีบัญชี? "}<button type="button" onClick={() => switchMode(isRegister ? "login" : "register")} className="font-bold text-orange-600 hover:underline">{isRegister ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</button></p>
    </form>
  </div>;
}

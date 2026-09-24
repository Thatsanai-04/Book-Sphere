import { useEffect, useMemo, useState } from "react";
import { api } from "./api";

const demoBooks = [
  {
    slug: "season",
    title: "ฤดูที่เราไม่ลืม",
    author: "Lalin",
    format: "ebook",
    contentType: "novel",
    price: 189,
    cover: "from-rose-400 to-orange-200",
  },
  {
    slug: "kyoto",
    title: "Midnight in Kyoto",
    author: "Aki Tanaka",
    format: "ebook",
    contentType: "novel",
    price: 229,
    cover: "from-indigo-950 to-violet-500",
  },
  {
    slug: "rain",
    title: "คำตอบของสายฝน",
    author: "แวววาว",
    format: "ebook",
    contentType: "novel",
    price: 149,
    cover: "from-sky-400 to-cyan-100",
  },
  {
    slug: "sky-comic",
    title: "เสียงจากปลายฟ้า",
    author: "Narin",
    format: "ebook",
    contentType: "comic",
    price: 199,
    cover: "from-slate-900 to-teal-500",
  },
  {
    slug: "weekend",
    title: "Weekend Magazine",
    author: "PLOT Editorial",
    format: "ebook",
    contentType: "magazine",
    price: 0,
    isFree: true,
    cover: "from-amber-300 to-rose-300",
  },
  {
    slug: "daily",
    title: "The Daily Brief",
    author: "Independent Press",
    format: "ebook",
    contentType: "newspaper",
    price: 0,
    isFree: true,
    cover: "from-emerald-950 to-lime-400",
  },
];

const authorFor = (book) =>
  book.author ||
  book.contributors?.find((item) => item.role === "author")?.name ||
  "Unknown author";
const priceFor = (book) => book.price?.amount ?? book.price ?? 0;

function BookCard({ book, favorite, onSelect, onToggleFavorite, english }) {
  const audio = book.format === "audiobook";
  const discount = book.discountPercent || book.discount?.percent;
  const isUnlimited = book.buffetEligible || book.isFree;
  return (
    <article className="group min-w-0 text-left">
      <button
        type="button"
        onClick={() => onSelect(book)}
        className="relative block w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-1 hover:shadow-xl"
      >
        <div
          className={`relative aspect-[3/4] overflow-hidden bg-gradient-to-br ${book.cover || "from-orange-400 to-amber-100"} text-white`}
        >
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`Cover of ${book.title}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col justify-between p-5">
              <span className="text-3xl">{audio ? "◖" : "▰"}</span>
              <p className="font-serif text-lg leading-tight">{book.title}</p>
            </div>
          )}
          {book.coverUrl && <div className="absolute inset-0 bg-black/15" />}
          {(isUnlimited || discount) && (
            <span className="absolute left-3 top-3 rounded-full bg-orange px-3 py-1 text-xs font-bold text-white shadow-sm">
              {discount
                ? `${english ? "Save" : "ลดราคา"} ${discount}%`
                : english
                  ? "Unlimited · Free"
                  : "Unlimited อ่านฟรี"}
            </span>
          )}
          {audio && (
            <span className="absolute right-3 top-3 rounded-full bg-black/30 px-2 py-1 text-xs">
              {english ? "Audio" : "เสียง"}
            </span>
          )}
        </div>
      </button>
      <div className="relative px-1 pt-3">
        <button
          type="button"
          onClick={() => onToggleFavorite(book.slug)}
          aria-label={
            favorite
              ? english
                ? "Remove bookmark"
                : "นำออกจากรายการโปรด"
              : english
                ? "Bookmark book"
                : "เพิ่มในรายการโปรด"
          }
          className={`absolute right-0 top-2 grid h-9 w-9 place-items-center rounded-full bg-white text-lg shadow-sm ring-1 ring-stone-200 transition hover:text-orange ${favorite ? "text-orange" : "text-stone-300"}`}
        >
          ♥
        </button>
        <p className="line-clamp-2 min-h-[3rem] pr-10 font-semibold leading-6">
          {book.title}
        </p>
        <p className="mt-1 truncate text-sm text-stone-500">
          {authorFor(book)}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-amber-500">
            ★ {book.rating?.average ?? book.rating ?? "4.8"}
          </span>
          <span className="text-sm font-bold text-orange-600">
            {isUnlimited
              ? english
                ? "Free"
                : "ฟรี"
              : `฿${priceFor(book).toLocaleString()}`}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function App({
  user,
  language,
  onLanguageChange,
  onLogin,
  onAccountClick,
  onCartClick,
}) {
  const english = language === "en";
  const [books, setBooks] = useState([]);
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState("all");
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("plot_bookmarks") || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    api("/books")
      .then(({ books: records }) => setBooks(records))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (user)
      api("/cart")
        .then(({ items }) => setCartCount(items.length))
        .catch(() => undefined);
    else setCartCount(0);
  }, [user]);
  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setSubscriptionLoading(false);
      return;
    }
    setSubscriptionLoading(true);
    api("/subscription/status")
      .then(({ subscription: status }) => setSubscription(status))
      .catch((error) => toast(error.message))
      .finally(() => setSubscriptionLoading(false));
  }, [user]);
  const visible = useMemo(
    () =>
      books.filter(
        (book) =>
          (format === "all" || book.contentType === format) &&
          `${book.title} ${authorFor(book)}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [books, format, query],
  );
  const selectedCategory =
    {
      novel: english ? "Novel" : "นิยาย",
      comic: english ? "Comic" : "การ์ตูน",
      magazine: english ? "Magazine" : "นิตยสาร",
      newspaper: english ? "Newspaper" : "หนังสือพิมพ์",
    }[format] || (english ? "this category" : "หมวดหมู่นี้");
  const toast = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2500);
  };
  const startTrial = async () => {
    if (!user) return onLogin();
    setSubscriptionLoading(true);
    try {
      const { subscription: startedSubscription } = await api(
        "/subscription/start-trial",
        { method: "POST" },
      );
      setSubscription(startedSubscription);
      toast(
        english
          ? "Your 7-day free trial has started"
          : "เริ่มทดลองใช้ฟรี 7 วันแล้ว",
      );
    } catch (error) {
      toast(error.message);
    } finally {
      setSubscriptionLoading(false);
    }
  };
  const subscribe = () =>
    toast(
      english
        ? "Monthly subscription checkout is coming soon"
        : "ระบบชำระค่าสมาชิกรายเดือนกำลังเปิดให้ใช้งาน",
    );
  const subscriptionButton = subscriptionLoading
    ? {
        label: english ? "Checking subscription..." : "กำลังตรวจสอบแพ็กเกจ...",
        action: undefined,
        disabled: true,
      }
    : subscription?.subscriptionStatus === "trialing" ||
        subscription?.subscriptionStatus === "active"
      ? {
          label: english
            ? "Unlimited is active"
            : "กำลังใช้งานแพ็กเกจ Unlimited",
          action: undefined,
          disabled: true,
        }
      : subscription?.subscriptionStatus === "expired" ||
          subscription?.hasUsedTrial
        ? {
            label: english
              ? "Subscribe ฿199 / month"
              : "สมัครสมาชิก ฿199 / เดือน",
            action: subscribe,
            disabled: false,
          }
        : {
            label: english
              ? "Start 7-day free trial"
              : "เริ่มทดลองใช้ฟรี 7 วัน",
            action: startTrial,
            disabled: false,
          };
  const openHeroBook = (slug, title) => {
    const book = books.find((item) => item.slug === slug);
    if (book) setSelected(book);
    else setQuery(title);
    document
      .getElementById("books")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const addToCart = async (book) => {
    if (!user) return onLogin();
    try {
      const data = await api("/cart/items", {
        method: "POST",
        body: JSON.stringify({ slug: book.slug }),
      });
      setCartCount(data.items.length);
      toast("เพิ่มหนังสือลงตะกร้าแล้ว");
      setSelected(null);
    } catch (error) {
      toast(error.message);
    }
  };
  const toggleFavorite = (slug) =>
    setFavorites((current) => {
      const next = { ...current, [slug]: !current[slug] };
      localStorage.setItem("plot_bookmarks", JSON.stringify(next));
      return next;
    });
  const previewBook = (book) => {
    if (book.ebook?.previewUrl || book.previewUrl)
      window.open(
        book.ebook?.previewUrl || book.previewUrl,
        "_blank",
        "noopener,noreferrer",
      );
    else
      toast(
        english
          ? "Preview is not available for this book yet"
          : "หนังสือเล่มนี้ยังไม่มีตัวอย่างให้อ่าน",
      );
  };
  const viewAllBooks = () => {
    setFormat("all");
    setQuery("");
    document
      .getElementById("books")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <main className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <a
            href="#home"
            className="flex items-center gap-2 text-xl font-black"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange text-white">
              ▰
            </span>
            PLOT
          </a>
          <nav className="hidden gap-7 text-sm font-medium text-stone-600 md:flex">
            <a href="#books">{english ? "Browse" : "เลือกอ่าน"}</a>
            <a href="#unlimited">{english ? "Unlimited" : "บุฟเฟต์"}</a>
            <a href="#writer">{english ? "For writers" : "สำหรับนักเขียน"}</a>
          </nav>
          <div className="flex items-center gap-2">
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
              onClick={user ? onAccountClick : onLogin}
              className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white"
            >
              {user?.displayName || (english ? "Sign in" : "เข้าสู่ระบบ")}
            </button>
          </div>
        </div>
      </header>
      <section id="home" className="bg-[#fff1e4]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <span className="mb-5 w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-orange-600 shadow-sm">
              ✦{" "}
              {english
                ? "Good stories are waiting"
                : "เรื่องดี ๆ รอให้คุณค้นพบ"}
            </span>
            <h1 className="max-w-xl text-5xl font-black leading-[1.15] tracking-tight sm:text-6xl">
              {english ? (
                <>
                  Read every story
                  <br />
                  <span className="text-orange">your way</span>
                </>
              ) : (
                <>
                  อ่านทุกเรื่องที่รัก
                  <br />
                  <span className="text-orange">ในแบบของคุณ</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-stone-600">
              {english
                ? "Curated e-books and audiobooks from Thai and translated writers"
                : "E-Book และหนังสือเสียงคัดสรร พร้อมเรื่องเล่าจากนักเขียนไทยและนิยายแปล"}
            </p>
            <div className="mt-8 flex gap-3">
              <a
                href="#books"
                className="rounded-full bg-orange px-6 py-3.5 font-bold text-white"
              >
                {english ? "Browse books →" : "เริ่มเลือกหนังสือ →"}
              </a>
              <a
                href="#unlimited"
                className="rounded-full border border-stone-300 bg-white px-6 py-3.5 font-bold"
              >
                {english ? "View Unlimited" : "ดูแพ็กเกจบุฟเฟต์"}
              </a>
            </div>
          </div>
          <div className="grid aspect-square grid-cols-2 gap-3 overflow-hidden rounded-[2rem] bg-ink p-4 text-white shadow-2xl lg:aspect-[4/3]">
            <button
              type="button"
              onClick={() => openHeroBook("season", "ฤดูที่เราไม่ลืม")}
              className="flex min-h-0 flex-col justify-between rounded-2xl bg-gradient-to-br from-rose-400 to-orange-200 p-4 text-left text-4xl transition hover:-translate-y-1"
            >
              <span>✿</span>
              <p className="font-serif text-lg">
                {english ? (
                  <>
                    The Season
                    <br />
                    We Remember
                  </>
                ) : (
                  <>
                    ฤดูที่เรา
                    <br />
                    ไม่ลืม
                  </>
                )}
              </p>
            </button>
            <div className="flex min-h-0 flex-col">
              <button
                type="button"
                onClick={() => openHeroBook("kyoto", "Midnight in Kyoto")}
                className="min-h-0 flex-1 rounded-2xl bg-gradient-to-br from-violet-700 to-indigo-950 p-4 text-left text-3xl transition hover:-translate-y-1"
              >
                ◖
                <p className="mt-8 font-serif text-base">
                  Midnight
                  <br />
                  in Kyoto
                </p>
              </button>
              <button
                type="button"
                onClick={() => openHeroBook("kyoto", "Midnight in Kyoto")}
                className="mt-3 shrink-0 rounded-2xl bg-white/10 p-3 text-left text-sm transition hover:bg-white/20"
              >
                <b>{english ? "Continue listening" : "ฟังต่อจากเมื่อคืน"}</b>
                <p className="mt-1 text-white/60">
                  {english ? "Chapter 7 · 18 min" : "บทที่ 7 · 18 นาที"}
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>
      <section id="books" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-bold text-orange">
              {english ? "Find your next story" : "เลือกเรื่องต่อไปของคุณ"}
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {english ? "Recommended books" : "หนังสือแนะนำ"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={viewAllBooks} className="text-sm font-bold text-orange-600 hover:text-orange-700">
              {english ? "View all recommended →" : "ดูหนังสือแนะนำทั้งหมด →"}
            </button>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="rounded-full border border-stone-200 bg-white px-4 py-2.5 outline-none shadow-sm focus:border-orange"
              placeholder={english ? "Search books" : "ค้นหาหนังสือ"}
            />
          </div>
        </div>
        <div className="mt-7 flex gap-2 overflow-auto pb-2">
          {[
            ["all", english ? "All" : "ทั้งหมด"],
            ["novel", english ? "Novel" : "นิยาย"],
            ["comic", english ? "Comic" : "การ์ตูน"],
            ["magazine", english ? "Magazine" : "นิตยสาร"],
            ["newspaper", english ? "Newspaper" : "หนังสือพิมพ์"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFormat(value)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold ${format === value ? "bg-ink text-white" : "bg-white ring-1 ring-stone-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {visible.map((book) => (
            <BookCard
              key={book.slug}
              book={book}
              english={english}
              favorite={favorites[book.slug]}
              onSelect={setSelected}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
        {!visible.length && (
          <div className="mt-8 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-orange-100 text-2xl text-orange">
              ▱
            </div>
            <h3 className="mt-5 text-xl font-black">
              {english
                ? `No recommended books in ${selectedCategory}`
                : "ยังไม่มีหนังสือแนะนำในหมวดหมู่นี้"}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              {english
                ? "Try another category to discover your next story."
                : "ลองเลือกหมวดหมู่อื่นเพื่อค้นหาหนังสือที่น่าสนใจ"}
            </p>
            <button
              type="button"
              onClick={() => setFormat("all")}
              className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-orange"
            >
              {english ? "Choose another category" : "เลือกหมวดหมู่อื่น"}
            </button>
          </div>
        )}
      </section>
      <section id="unlimited" className="bg-ink py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="rounded-full bg-orange/20 px-4 py-2 text-sm font-bold text-orange-300">
              PLOT UNLIMITED
            </span>
            <h2 className="mt-6 text-4xl font-black">
              {english ? (
                <>
                  Read as much as you like
                  <br />
                  <span className="text-orange-400">without limits</span>
                </>
              ) : (
                <>
                  อยากอ่านแค่ไหน
                  <br />
                  <span className="text-orange-400">ก็อ่านได้ไม่อั้น</span>
                </>
              )}
            </h2>
            <p className="mt-5 max-w-md leading-7 text-stone-300">
              {english
                ? "Read and listen to Unlimited titles anytime. Cancel anytime."
                : "อ่านและฟังรายการ Unlimited ได้ทุกเวลา ยกเลิกได้ทุกเมื่อ"}
            </p>
          </div>
          <div className="rounded-3xl bg-[#fff7ed] p-8 text-ink">
            <p className="font-bold text-orange">
              {english ? "Monthly plan" : "แพ็กเกจรายเดือน"}
            </p>
            <p className="mt-2 text-5xl font-black">
              ฿199{" "}
              <span className="text-base font-normal text-stone-500">
                / {english ? "month" : "เดือน"}
              </span>
            </p>
            {subscription?.subscriptionStatus === "trialing" && (
              <p className="mt-3 text-sm font-bold text-emerald-700">
                {english
                  ? `${subscription.daysRemaining} days left in your trial`
                  : `เหลือเวลาทดลองอีก ${subscription.daysRemaining} วัน`}
              </p>
            )}
            <button
              disabled={subscriptionButton.disabled}
              onClick={subscriptionButton.action}
              className="mt-6 w-full rounded-full bg-orange py-3.5 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              {subscriptionButton.label}
            </button>
          </div>
        </div>
      </section>
      <section id="writer" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="rounded-[2rem] bg-[#e6f5ed] p-8 sm:p-12">
          <p className="font-bold text-emerald-700">
            {english ? "For writers" : "สำหรับนักเขียน"}
          </p>
          <h2 className="mt-2 text-3xl font-black">
            {english
              ? "Your story could be someone's favorite"
              : "เรื่องของคุณ อาจเป็นเรื่องโปรดของใครสักคน"}
          </h2>
          <p className="mt-4 max-w-2xl leading-7 text-stone-600">
            {english
              ? "Sell your e-books, manage pricing, and reach new readers"
              : "เปิดพื้นที่ให้คุณขาย E-Book จัดการราคา และเข้าถึงนักอ่านกลุ่มใหม่"}
          </p>
          <button
            onClick={() =>
              toast(
                english
                  ? "The writer space is coming soon"
                  : "พื้นที่สำหรับนักเขียนกำลังเปิดให้ใช้งาน",
              )
            }
            className="mt-7 rounded-full bg-ink px-6 py-3.5 font-bold text-white"
          >
            {english ? "Start selling your book" : "เริ่มขายหนังสือของคุณ"}
          </button>
        </div>
      </section>
      <footer className="border-t border-stone-200 px-5 py-8 text-center text-sm text-stone-500">
        © 2026 PLOT —{" "}
        {english
          ? "A home for every story"
          : "พื้นที่สำหรับทุกเรื่องที่อยากเล่า"}
      </footer>
      {user && (
        <button
          onClick={onCartClick}
          className="fixed bottom-5 right-5 z-30 rounded-full bg-ink px-5 py-3 text-sm font-bold text-white shadow-xl"
        >
          {english ? "Cart" : "ตะกร้า"} {cartCount ? `(${cartCount})` : ""}
        </button>
      )}
      {selected && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/45 p-5"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="float-right text-2xl text-stone-400"
            >
              ×
            </button>
            <p className="text-sm font-bold text-orange">
              {selected.contentType || "E-Book"}
            </p>
            <h3 className="mt-2 text-2xl font-black">{selected.title}</h3>
            <p className="mt-1 text-stone-500">{authorFor(selected)}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-stone-100 px-3 py-1.5 text-stone-600">
                {english ? "File" : "ประเภทไฟล์"}: {selected.format === "audiobook" ? "Audio" : "PDF / EPUB"}
              </span>
              {(selected.buffetEligible || selected.isFree) && <span className="rounded-full bg-orange-100 px-3 py-1.5 text-orange-700">Unlimited</span>}
            </div>
            <p className="mt-5 text-stone-600">
              {selected.synopsis ||
                (english
                  ? "Book details will appear here after adding a book from the Admin Console."
                  : "รายละเอียดหนังสือจะเชื่อมต่อจากฐานข้อมูล MongoDB เมื่อเพิ่มรายการหนังสือแล้ว")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={() => previewBook(selected)} className="rounded-full border border-stone-300 px-5 py-2.5 font-bold text-stone-700 transition hover:border-orange hover:text-orange">
                {english ? "Try preview" : "ทดลองอ่านตัวอย่าง"}
              </button>
              <button type="button" onClick={() => (selected.buffetEligible || selected.isFree ? previewBook(selected) : addToCart(selected))} className="rounded-full bg-ink px-5 py-2.5 font-bold text-white transition hover:bg-orange">
                {selected.buffetEligible || selected.isFree ? (english ? "Read now" : "อ่านเลย") : `${english ? "Add to cart" : "เพิ่มลงตะกร้า"} · ฿${priceFor(selected).toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {notice && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-3 text-sm text-white shadow-xl">
          {notice}
        </div>
      )}
    </main>
  );
}

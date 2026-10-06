import { useCallback, useEffect, useState } from "react";
import App from "../App";
import AuthModal from "./AuthModal";
import AccountPage from "./AccountPage";
import AdminPage from "./AdminPage";
import CartPage from "./CartPage";
import LibraryPage from "./LibraryPage";
import PaymentAdminPage from "./PaymentAdminPage";
import PendingBooksPage from "./PendingBooksPage";
import WriterPage from "./WriterPage";

export default function AuthShell() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("plot_user")); } catch { return null; }
  });
  const [mode, setMode] = useState(null);
  const [screen, setScreen] = useState("store");
  const [afterLoginScreen, setAfterLoginScreen] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem("plot_language") || "th");

  useEffect(() => {
    localStorage.setItem("plot_language", language);
    document.documentElement.lang = language;
  }, [language]);

  const updateUser = useCallback((updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("plot_user", JSON.stringify(updatedUser));
  }, []);

  const signOut = () => {
    localStorage.removeItem("plot_token");
    localStorage.removeItem("plot_user");
    setUser(null);
    setScreen("store");
  };
  const handleAdminUnauthorized = () => {
    signOut();
    setMode("login");
  };
  const openWriter = () => {
    if (!user) {
      setAfterLoginScreen("writer");
      setMode("login");
      return;
    }
    setScreen("writer");
  };

  if (user && screen === "admin") return <AdminPage language={language} onLanguageChange={setLanguage} onBack={() => setScreen("account")} onCart={() => setScreen("cart")} onPayments={() => setScreen("payments")} onPendingBooks={() => setScreen("pending-books")} onUnauthorized={handleAdminUnauthorized} />;
  if (user && screen === "pending-books") return <PendingBooksPage language={language} onBack={() => setScreen("admin")} onUnauthorized={handleAdminUnauthorized} />;
  if (user && screen === "writer") return <WriterPage user={user} onBack={() => setScreen("store")} onUserUpdated={updateUser} onUnauthorized={handleAdminUnauthorized} />;
  if (user && screen === "payments") return <PaymentAdminPage language={language} onBack={() => setScreen("admin")} onUnauthorized={handleAdminUnauthorized} />;
  if (user && screen === "cart") return <CartPage onBack={() => setScreen("store")} onLibrary={() => setScreen("library")} />;
  if (user && screen === "library") return <LibraryPage user={user} onBack={() => setScreen("account")} />;
  if (user && screen === "account") return <AccountPage initialUser={user} onUserUpdated={updateUser} onSignOut={signOut} onBack={() => setScreen("store")} onLibrary={() => setScreen("library")} onAdmin={() => setScreen("admin")} onWriter={() => setScreen("writer")} />;

  return <>
    <App user={user} language={language} onLanguageChange={setLanguage} onLogin={() => setMode("login")} onAccountClick={() => setScreen("account")} onCartClick={() => setScreen("cart")} onWriterClick={openWriter} />
    {mode && <AuthModal mode={mode} onClose={() => { setMode(null); setAfterLoginScreen(null); }} onAuthenticated={(loggedInUser) => { updateUser(loggedInUser); setScreen(afterLoginScreen || "store"); setAfterLoginScreen(null); setMode(null); }} />}
  </>;
}

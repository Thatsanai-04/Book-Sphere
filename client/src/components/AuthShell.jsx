import { useCallback, useEffect, useState } from "react";
import App from "../App";
import AuthModal from "./AuthModal";
import AccountPage from "./AccountPage";
import AdminPage from "./AdminPage";
import CartPage from "./CartPage";
import LibraryPage from "./LibraryPage";

export default function AuthShell() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("plot_user")); } catch { return null; }
  });
  const [mode, setMode] = useState(null);
  const [screen, setScreen] = useState("store");
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

  if (user && screen === "admin") return <AdminPage language={language} onLanguageChange={setLanguage} onBack={() => setScreen("account")} onCart={() => setScreen("cart")} onUnauthorized={handleAdminUnauthorized} />;
  if (user && screen === "cart") return <CartPage onBack={() => setScreen("store")} />;
  if (user && screen === "library") return <LibraryPage user={user} onBack={() => setScreen("account")} />;
  if (user && screen === "account") return <AccountPage initialUser={user} onUserUpdated={updateUser} onSignOut={signOut} onBack={() => setScreen("store")} onLibrary={() => setScreen("library")} onAdmin={() => setScreen("admin")} />;

  return <>
    <App user={user} language={language} onLanguageChange={setLanguage} onLogin={() => setMode("login")} onAccountClick={() => setScreen("account")} onCartClick={() => setScreen("cart")} />
    {mode && <AuthModal mode={mode} onClose={() => setMode(null)} onAuthenticated={(loggedInUser) => { updateUser(loggedInUser); setScreen("store"); setMode(null); }} />}
  </>;
}

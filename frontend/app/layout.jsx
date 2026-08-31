import "./globals.css";
import { Inter } from "next/font/google";

export const metadata = {
  title: {
    default: "NirnexAI Assistant",
    template: "%s · NirnexAI"
  },
  description: "Official NirnexAI AI assistant — answers about products, pricing, features and use cases."
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const THEME_BOOTSTRAP = `(function(){try{
  var t=localStorage.getItem("nirnex_theme");
  if(t==="light")document.documentElement.setAttribute("data-theme","light");
  var s={};try{s=JSON.parse(localStorage.getItem("nirnex_settings")||"{}")}catch(e){}
  if(s&&typeof s.accent==="string"&&s.accent)document.documentElement.style.setProperty("--accent",s.accent);
}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable}`} data-theme="dark">
      <body className="min-h-screen bg-[var(--bg)] font-[var(--font-inter)] text-[var(--ink)] antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        {children}
      </body>
    </html>
  );
}
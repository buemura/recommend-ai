"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Início", emoji: "🏠" },
  { href: "/sala", label: "Grupo", emoji: "👥" },
  { href: "/busca", label: "Busca", emoji: "🔍" },
  { href: "/historico", label: "Histórico", emoji: "📜" },
  { href: "/watchlist", label: "Listas", emoji: "📋" },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  return (
    <>
      {/* Top bar */}
      <nav className="border-b-3 border-black bg-brutal-yellow px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🎲</span>
            <span className="font-display text-lg tracking-wide text-black sm:text-xl">
              RecommendAI
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-2 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`neo-btn text-sm ${
                  pathname === link.href
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-brutal-cream"
                }`}
              >
                <span className="mr-1">{link.emoji}</span>
                {link.label}
              </Link>
            ))}
          </div>

          {session?.user && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border-3 border-black bg-white px-2.5 py-1.5 text-sm font-semibold shadow-[4px_4px_0px_0px_#000]">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    className="h-6 w-6 rounded-full border-2 border-black"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-brutal-purple text-xs font-black text-white">
                    {session.user.name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
                <span className="hidden sm:inline">
                  {session.user.name?.split(" ")[0]}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="neo-btn bg-brutal-red text-sm text-white"
              >
                Sair
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t-3 border-black bg-brutal-yellow md:hidden">
        <div className="flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-bold transition-colors ${
                pathname === link.href ? "bg-black text-white" : "text-black"
              }`}
            >
              <span className="text-lg">{link.emoji}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

"use client";
import { useRef, type ReactNode } from "react";
import Link from "next/link";
import { Menu, X, LogOut } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { LanguageSwitcher } from "./language-switcher";
import { createBrowserSupabase } from "@/lib/supabase-browser";
export function WorkspaceShell({ title, current, navigation, children, kind }: { title: string; current: string; navigation: ReactNode; children: ReactNode; kind: "admin" | "seller" }) {
  const drawer = useRef<HTMLDialogElement>(null);
  return <div className={`workspace workspace-${kind}`}>
    <header className="workspace-header"><Link href={`/${kind}`}><BrandLogo /></Link><span className="workspace-name">{title}</span>
      <div className="workspace-tools"><LanguageSwitcher /><Link className="button secondary small" href="/marketplace">Marketplace</Link><button className="button secondary small" aria-label="Đăng xuất / Sign out" onClick={async () => { await createBrowserSupabase().auth.signOut(); window.location.assign("/auth"); }}><LogOut size={18}/></button><button className="workspace-menu button secondary" aria-label="Mở menu / Open menu" onClick={() => drawer.current?.showModal()}><Menu size={20}/></button></div></header>
    <div className="workspace-body"><aside className="workspace-desktop-nav">{navigation}</aside><main className="workspace-main"><p className="workspace-breadcrumb">CraftTrust / {title} / <strong>{current}</strong></p>{children}</main></div>
    <dialog ref={drawer} className="workspace-drawer"><div className="drawer-heading"><strong>{title}</strong><button className="button secondary" aria-label="Đóng menu / Close menu" onClick={() => drawer.current?.close()}><X/></button></div><div onClick={(event) => { if ((event.target as HTMLElement).closest("button,a")) drawer.current?.close(); }}>{navigation}</div></dialog>
  </div>;
}

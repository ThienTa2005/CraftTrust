"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { BuyerHeader } from "@/components/buyer/buyer-header";
import { BuyerFooter } from "@/components/buyer/buyer-footer";

export function PortalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // If on Seller Centre or Admin Portal, DO NOT render Buyer header or footer.
  // Seller and Admin have completely separate layouts, navigation, and branding.
  const isSellerCentre = pathname.startsWith("/seller");
  const isAdminPortal = pathname.startsWith("/admin");

  if (isSellerCentre || isAdminPortal) {
    return <>{children}</>;
  }

  // Buyer Marketplace Layout
  return (
    <div className="buyer-portal-root">
      <BuyerHeader />
      <main id="buyer-main-content" className="buyer-main-content">
        {children}
      </main>
      <BuyerFooter />
    </div>
  );
}

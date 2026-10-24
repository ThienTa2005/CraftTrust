import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout-view";

export const metadata: Metadata = {
  title: "Thanh toán thử nghiệm · Test Checkout"
};

export default function CheckoutPage() {
  return <CheckoutView />;
}

"use client";
import type { Personalization } from "./model-config";

export interface DemoCartItem {
  id: string;
  productId: string;
  name: string;
  nameEn?: string | undefined;
  image: string;
  priceVnd: number;
  quantity: number;
  village: string;
  artisan?: string | undefined;
  customNote?: string | undefined;
  personalization?: Personalization | undefined;
}

export interface DemoOrder {
  id: string;
  createdAt: string;
  recipient: string;
  phone: string;
  address: string;
  city: string;
  items: DemoCartItem[];
  subtotalVnd: number;
  status: "test_submitted";
}

const CART_KEY = "hct_demo_cart";
const ORDERS_KEY = "hct_demo_orders";

export function getDemoCart(): DemoCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDemoCart(items: DemoCartItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("hct_cart_updated"));
  } catch {
    // Storage quota or disabled
  }
}

export function addToDemoCart(item: Omit<DemoCartItem, "id">): void {
  const current = getDemoCart();
  const existing = current.find((i) => i.productId === item.productId && JSON.stringify(i.personalization) === JSON.stringify(item.personalization));
  if (existing) {
    existing.quantity = Math.min(20, existing.quantity + item.quantity);
  } else {
    current.push({ ...item, id: crypto.randomUUID() });
  }
  saveDemoCart(current);
}

export function removeFromDemoCart(itemId: string): void {
  const current = getDemoCart().filter((i) => i.id !== itemId);
  saveDemoCart(current);
}

export function clearDemoCart(): void {
  saveDemoCart([]);
}

export function getDemoOrders(): DemoOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDemoOrder(order: DemoOrder): void {
  if (typeof window === "undefined") return;
  try {
    const orders = getDemoOrders();
    orders.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
    clearDemoCart();
    window.dispatchEvent(new Event("hct_orders_updated"));
  } catch {
    // Storage quota or disabled
  }
}

export function useCartStore() {
  const addItem = (item: {
    productId: string;
    name: string;
    nameEn?: string | undefined;
    priceVnd: number;
    image: string;
    village: string;
    artisan?: string | undefined;
    customNote?: string | undefined;
  }) => {
    addToDemoCart({
      productId: item.productId,
      name: item.name,
      nameEn: item.nameEn,
      priceVnd: item.priceVnd,
      image: item.image,
      quantity: 1,
      village: item.village,
      artisan: item.artisan,
      customNote: item.customNote
    });
  };

  return { addItem };
}


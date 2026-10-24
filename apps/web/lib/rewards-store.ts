"use client";

import type { MemberTier, RedeemedVoucher } from "@craft-trust/contracts";
import { REWARD_ITEMS } from "./rewards-data";

const REWARDS_PROFILE_KEY = "hct_rewards_profile";
const REDEEMED_TICKETS_KEY = "hct_redeemed_tickets";

export interface RewardsProfile {
  memberName: string;
  memberId: string;
  points: number;
  totalEarned: number;
  tier: MemberTier;
}

export function getRewardsProfile(): RewardsProfile {
  if (typeof window === "undefined") {
    return {
      memberName: "Nguyễn Văn An",
      memberId: "HCT-MEM-2026-8899",
      points: 850,
      totalEarned: 1250,
      tier: "enthusiast"
    };
  }

  try {
    const raw = localStorage.getItem(REWARDS_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
    
    // Default initial profile for immediate interactive demonstration
    const initial: RewardsProfile = {
      memberName: "Nguyễn Văn An",
      memberId: "HCT-MEM-2026-8899",
      points: 850,
      totalEarned: 1250,
      tier: "enthusiast"
    };
    localStorage.setItem(REWARDS_PROFILE_KEY, JSON.stringify(initial));
    return initial;
  } catch {
    return {
      memberName: "Nguyễn Văn An",
      memberId: "HCT-MEM-2026-8899",
      points: 850,
      totalEarned: 1250,
      tier: "enthusiast"
    };
  }
}

export function saveRewardsProfile(profile: RewardsProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REWARDS_PROFILE_KEY, JSON.stringify(profile));
    window.dispatchEvent(new Event("hct_rewards_updated"));
  } catch {
    // Storage quota or disabled
  }
}

export function getRedeemedTickets(): RedeemedVoucher[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REDEEMED_TICKETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRedeemedTickets(tickets: RedeemedVoucher[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REDEEMED_TICKETS_KEY, JSON.stringify(tickets));
    window.dispatchEvent(new Event("hct_rewards_updated"));
  } catch {
    // Storage quota or disabled
  }
}

export function redeemRewardItem(rewardId: string): { success: boolean; error?: string; ticket?: RedeemedVoucher } {
  const profile = getRewardsProfile();
  const reward = REWARD_ITEMS.find((r) => r.id === rewardId);
  if (!reward) return { success: false, error: "Reward item not found" };

  if (profile.points < reward.pointsRequired) {
    return {
      success: false,
      error: `Bạn cần ${reward.pointsRequired} điểm nhưng hiện chỉ có ${profile.points} điểm.`
    };
  }

  // Deduct points
  profile.points -= reward.pointsRequired;
  saveRewardsProfile(profile);

  // Generate unique e-ticket / QR voucher
  const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const code = `CRAFT-${reward.id.slice(3, 7).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  const newTicket: RedeemedVoucher = {
    id: ticketId,
    rewardId: reward.id,
    titleVi: reward.titleVi,
    titleEn: reward.titleEn,
    code,
    qrCodeUrl: `https://crafttrust.vn/checkin/${ticketId}`,
    redeemedAt: new Date().toISOString(),
    status: "active",
    discountVnd: reward.discountVnd,
    village: reward.village
  };

  const existing = getRedeemedTickets();
  existing.unshift(newTicket);
  saveRedeemedTickets(existing);

  return { success: true, ticket: newTicket };
}

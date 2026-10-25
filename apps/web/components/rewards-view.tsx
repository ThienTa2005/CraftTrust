"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  Gift,
  MapPin,
  Sparkles,
  Ticket,
  Trophy,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import {
  getRewardsProfile,
  getRedeemedTickets,
  redeemRewardItem,
  type RewardsProfile,
} from "@/lib/rewards-store";
import { MEMBER_TIERS_INFO, REWARD_ITEMS } from "@/lib/rewards-data";
import type { RedeemedVoucher } from "@craft-trust/contracts";

export function RewardsView() {
  const { locale, t } = useLanguage();
  const [profile, setProfile] = useState<RewardsProfile>(getRewardsProfile());
  const [tickets, setTickets] = useState<RedeemedVoucher[]>([]);
  const [filterType, setFilterType] = useState<
    "all" | "vouchers" | "workshops"
  >("all");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setProfile(getRewardsProfile());
    setTickets(getRedeemedTickets());

    const handleUpdate = () => {
      setProfile(getRewardsProfile());
      setTickets(getRedeemedTickets());
    };

    window.addEventListener("hct_rewards_updated", handleUpdate);
    return () =>
      window.removeEventListener("hct_rewards_updated", handleUpdate);
  }, []);

  const handleRedeem = (rewardId: string) => {
    const res = redeemRewardItem(rewardId);
    if (res.success) {
      setFeedback({
        type: "success",
        message: t.rewards.redeemedNotice,
      });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({
        type: "error",
        message: res.error ?? t.rewards.notEnoughPoints,
      });
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const currentTierInfo =
    MEMBER_TIERS_INFO.find((t) => t.id === profile.tier) ??
    MEMBER_TIERS_INFO[1]!;

  const filteredRewards = REWARD_ITEMS.filter((item) => {
    if (filterType === "vouchers") return item.type === "discount_voucher";
    if (filterType === "workshops") return item.type !== "discount_voucher";
    return true;
  });

  return (
    <div className="shell rewards-shell" style={{ margin: "36px auto 90px" }}>
      {/* Page Header */}
      <div className="page-intro" style={{ maxWidth: 760, marginBottom: 36 }}>
        <span
          className="eyebrow"
          style={{
            color: "var(--terracotta)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Trophy size={16} />
          {locale === "vi"
            ? "Đặc quyền Hội viên Thủ công"
            : "Heritage Loyalty Program"}
        </span>
        <h1
          style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)", margin: "8px 0 12px" }}
        >
          {t.rewards.title}
        </h1>
        <p
          style={{
            fontSize: "1.05rem",
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {t.rewards.subtitle}
        </p>
      </div>

      {/* Top Banner Feedback */}
      {feedback && (
        <div
          style={{
            padding: "14px 20px",
            borderRadius: 14,
            marginBottom: 24,
            background: feedback.type === "success" ? "#e6f4ea" : "#fce8e6",
            border: `1px solid ${feedback.type === "success" ? "#a8dab5" : "#f5c2c7"}`,
            color: feedback.type === "success" ? "#137333" : "#c5221f",
            fontWeight: 600,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {feedback.type === "success" ? <CheckCircle2 size={18} /> : null}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid: Digital Membership Card + Earning Rules */}
      <div
        className="rewards-overview-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 24,
          marginBottom: 44,
        }}
      >
        {/* Digital Membership Pass Card */}
        <div
          className="rewards-catalog-grid"
          style={{
            background:
              "linear-gradient(135deg, #172820 0%, #235c43 60%, #133d2b 100%)",
            color: "#fff",
            borderRadius: 24,
            padding: "32px 30px",
            boxShadow: "0 20px 40px rgba(23, 40, 32, 0.25)",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 260,
          }}
        >
          {/* Card Top */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.74rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#9fe1c1",
                  fontWeight: 700,
                }}
              >
                HANOI CRAFT-TRUST HERITAGE PASS
              </span>
              <h2
                style={{
                  margin: "4px 0 0",
                  fontSize: "1.6rem",
                  fontFamily: "Fraunces",
                }}
              >
                {profile.memberName}
              </h2>
              <span style={{ fontSize: "0.82rem", color: "#d1e7dd" }}>
                ID: {profile.memberId}
              </span>
            </div>

            {/* QR on Card */}
            <div
              style={{
                background: "#fff",
                padding: 6,
                borderRadius: 10,
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
              }}
            >
              <QRCodeSVG value={`hct-member:${profile.memberId}`} size={64} />
            </div>
          </div>

          {/* Card Bottom: Points & Tier */}
          <div
            style={{
              marginTop: 28,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.78rem",
                  color: "#b8d9c9",
                  textTransform: "uppercase",
                }}
              >
                {t.rewards.pointsBalance}
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <strong
                  style={{
                    fontSize: "2.4rem",
                    fontFamily: "Fraunces",
                    lineHeight: 1,
                  }}
                >
                  {profile.points}
                </strong>
                <span
                  style={{
                    fontSize: "0.9rem",
                    color: "#efb083",
                    fontWeight: 700,
                  }}
                >
                  CraftPoints
                </span>
              </div>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(8px)",
                padding: "6px 14px",
                borderRadius: 999,
                fontSize: "0.84rem",
                fontWeight: 700,
                color: "#ffd700",
                border: "1px solid rgba(255, 215, 0, 0.3)",
              }}
            >
              <Sparkles size={14} />
              {locale === "vi"
                ? currentTierInfo.nameVi
                : currentTierInfo.nameEn}
            </span>
          </div>
        </div>

        {/* How to Earn Points Guide */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 24,
            padding: 26,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <strong
              style={{
                display: "block",
                fontSize: "1.05rem",
                fontFamily: "Fraunces",
                marginBottom: 12,
              }}
            >
              <Zap
                size={18}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginRight: 6,
                  color: "var(--terracotta)",
                }}
              />
              {t.rewards.howToEarnTitle}
            </strong>
            <div style={{ display: "grid", gap: 10, fontSize: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    background: "rgba(35, 92, 67, 0.1)",
                    color: "var(--leaf)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  +10 pts
                </span>
                <span>
                  {locale === "vi"
                    ? "Mỗi 100.000 ₫ mua sản phẩm thủ công"
                    : "Every 100,000 VND spent on crafts"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    background: "rgba(200, 157, 67, 0.15)",
                    color: "var(--gold)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  +50 pts
                </span>
                <span>
                  {locale === "vi"
                    ? "Quét chip Dynamic NFC / mã QR trên sản phẩm thật"
                    : "Scan dynamic NFC/QR on real products"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    background: "rgba(198, 94, 61, 0.1)",
                    color: "var(--terracotta)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  +30 pts
                </span>
                <span>
                  {locale === "vi"
                    ? "Đánh giá tác phẩm kèm hình ảnh thực tế"
                    : "Submit product review with photo"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    background: "rgba(35, 92, 67, 0.1)",
                    color: "var(--leaf)",
                    padding: "2px 8px",
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  +150 pts
                </span>
                <span>
                  {locale === "vi"
                    ? "Tham quan và check-in tại làng nghề Hà Nội"
                    : "Check-in during village tours"}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              padding: "10px 14px",
              background: "rgba(35, 92, 67, 0.05)",
              borderRadius: 12,
              fontSize: "0.8rem",
              color: "var(--muted)",
            }}
          >
            {locale === "vi"
              ? "Điểm thưởng không hết hạn. Bạn có thể quy đổi vé tham quan xưởng gốm Bát Tràng, lụa Vạn Phúc hoặc voucher giảm giá bất kỳ lúc nào."
              : "CraftPoints never expire. Redeem pottery workshops, silk tours, or vouchers at any time."}
          </div>
        </div>
      </div>

      {/* Rewards Catalog Section */}
      <div style={{ marginBottom: 50 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{ margin: 0, fontSize: "1.6rem", fontFamily: "Fraunces" }}
            >
              {locale === "vi"
                ? "Danh mục Quà tặng & Trải nghiệm Làng nghề"
                : "Rewards & Experience Catalog"}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "0.88rem",
                color: "var(--muted)",
              }}
            >
              {locale === "vi"
                ? "Dùng điểm tích lũy để đổi voucher giảm giá hoặc tham gia workshop cùng nghệ nhân"
                : "Use your points to redeem shopping vouchers or exclusive artisan workshops"}
            </p>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setFilterType("all")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border:
                  filterType === "all"
                    ? "1px solid var(--leaf)"
                    : "1px solid var(--line)",
                background: filterType === "all" ? "var(--leaf)" : "#fff",
                color: filterType === "all" ? "#fff" : "var(--ink)",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {locale === "vi" ? "Tất cả quà tặng" : "All rewards"}
            </button>
            <button
              type="button"
              onClick={() => setFilterType("workshops")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border:
                  filterType === "workshops"
                    ? "1px solid var(--leaf)"
                    : "1px solid var(--line)",
                background: filterType === "workshops" ? "var(--leaf)" : "#fff",
                color: filterType === "workshops" ? "#fff" : "var(--ink)",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {locale === "vi"
                ? "Trải nghiệm cùng Nghệ nhân"
                : "Artisan Workshops"}
            </button>
            <button
              type="button"
              onClick={() => setFilterType("vouchers")}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border:
                  filterType === "vouchers"
                    ? "1px solid var(--leaf)"
                    : "1px solid var(--line)",
                background: filterType === "vouchers" ? "var(--leaf)" : "#fff",
                color: filterType === "vouchers" ? "#fff" : "var(--ink)",
                fontSize: "0.84rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {locale === "vi" ? "Voucher giảm giá" : "Discount Vouchers"}
            </button>
          </div>
        </div>

        {/* Rewards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 20,
          }}
        >
          {filteredRewards.map((reward) => {
            const canAfford = profile.points >= reward.pointsRequired;
            return (
              <div
                key={reward.id}
                style={{
                  background: "#fff",
                  border: "1px solid var(--line)",
                  borderRadius: 18,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                }}
              >
                <div>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 180,
                      background: "radial-gradient(circle at 50% 50%, #ffffff 0%, #f6f2ea 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      src={reward.image}
                      alt={reward.titleVi}
                      fill
                      style={{ objectFit: "contain", padding: 10 }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: 12,
                        left: 12,
                        background: "rgba(23, 40, 32, 0.85)",
                        backdropFilter: "blur(6px)",
                        color: "#ffd700",
                        padding: "3px 10px",
                        borderRadius: 6,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {locale === "vi" ? reward.badgeVi : reward.badgeEn}
                    </span>
                  </div>

                  <div style={{ padding: 18 }}>
                    {reward.village && (
                      <span
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--leaf)",
                          fontWeight: 600,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        <MapPin
                          size={13}
                          style={{
                            display: "inline",
                            verticalAlign: "middle",
                            marginRight: 4,
                          }}
                        />
                        {reward.village}
                      </span>
                    )}
                    <h3
                      style={{
                        margin: "0 0 8px",
                        fontSize: "1.1rem",
                        fontFamily: "Fraunces",
                      }}
                    >
                      {locale === "vi" ? reward.titleVi : reward.titleEn}
                    </h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.82rem",
                        color: "var(--muted)",
                        lineHeight: 1.5,
                      }}
                    >
                      {locale === "vi"
                        ? reward.descriptionVi
                        : reward.descriptionEn}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 18px",
                    borderTop: "1px solid var(--line)",
                    background: "var(--surface)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span
                      style={{
                        display: "block",
                        fontSize: "0.72rem",
                        color: "var(--muted)",
                      }}
                    >
                      {locale === "vi" ? "Cần tích lũy:" : "Required:"}
                    </span>
                    <strong
                      style={{
                        fontSize: "1.15rem",
                        color: "var(--terracotta)",
                      }}
                    >
                      {reward.pointsRequired} pts
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="button small"
                    onClick={() => handleRedeem(reward.id)}
                    disabled={!canAfford}
                    style={{
                      opacity: canAfford ? 1 : 0.5,
                      cursor: canAfford ? "pointer" : "not-allowed",
                    }}
                  >
                    <Gift size={15} />
                    <span>{t.rewards.redeemBtn}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature 5: Active Redeemed Tickets & Vouchers Section */}
      <div>
        <div style={{ marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontFamily: "Fraunces" }}>
            <Ticket
              size={22}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 8,
                color: "var(--leaf)",
              }}
            />
            {t.rewards.myTicketsTitle}
          </h2>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.85rem",
              color: "var(--muted)",
            }}
          >
            {t.rewards.scanCheckinNotice}
          </p>
        </div>

        {tickets.length === 0 ? (
          <div
            style={{
              padding: 36,
              background: "var(--surface)",
              borderRadius: 18,
              border: "1px dashed var(--line)",
              textAlign: "center",
              color: "var(--muted)",
            }}
          >
            <Ticket size={34} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
            <p style={{ margin: 0 }}>{t.rewards.noTickets}</p>
          </div>
        ) : (
          <div
            className="reward-tickets-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 18,
            }}
          >
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                style={{
                  background: "#fff",
                  border: "2px solid #ecd8b5",
                  borderRadius: 18,
                  padding: 20,
                  boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                {/* QR Code for Check-in */}
                <div
                  style={{
                    background: "var(--surface)",
                    padding: 8,
                    borderRadius: 12,
                    border: "1px solid var(--line)",
                    textAlign: "center",
                  }}
                >
                  <QRCodeSVG value={ticket.qrCodeUrl} size={90} />
                  <span
                    style={{
                      display: "block",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      marginTop: 4,
                      color: "var(--leaf)",
                    }}
                  >
                    SCAN CHECK-IN
                  </span>
                </div>

                {/* Ticket Details */}
                <div style={{ flex: 1 }}>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#137333",
                      background: "#e6f4ea",
                      padding: "2px 8px",
                      borderRadius: 6,
                      marginBottom: 4,
                    }}
                  >
                    VÉ HỢP LỆ · ACTIVE
                  </span>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "0.95rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {locale === "vi" ? ticket.titleVi : ticket.titleEn}
                  </strong>
                  <div
                    style={{
                      fontSize: "0.76rem",
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    Mã số:{" "}
                    <code style={{ fontWeight: 700, color: "var(--ink)" }}>
                      {ticket.code}
                    </code>
                  </div>
                  {ticket.village && (
                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--leaf)",
                        marginTop: 2,
                      }}
                    >
                      <MapPin
                        size={12}
                        style={{
                          display: "inline",
                          verticalAlign: "middle",
                          marginRight: 3,
                        }}
                      />
                      {ticket.village}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--muted)",
                      marginTop: 4,
                    }}
                  >
                    Đổi ngày:{" "}
                    {new Date(ticket.redeemedAt).toLocaleDateString(
                      locale === "vi" ? "vi-VN" : "en-US",
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

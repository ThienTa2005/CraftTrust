import { useCallback, useState } from "react";
import { randomUUID } from "expo-crypto";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Page } from "../../src/components/Page";
import { LoadingState, MessageState, SetupState } from "../../src/components/States";
import { money } from "../../src/domain";
import { useResource } from "../../src/hooks/useResource";
import { loadCart } from "../../src/lib/adapters";
import { useApp } from "../../src/providers/AppProvider";

export default function CartScreen() {
  const { bundle, session, missingConfig, locale, t } = useApp();
  const [shipping, setShipping] = useState({ recipientName: "", phone: "", addressLine: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loader = useCallback(() => (bundle && session ? loadCart(bundle.api) : Promise.resolve([])), [bundle, session]);
  const resource = useResource(bundle && session ? loader : null);
  const total = (resource.data ?? []).reduce((sum, item) => sum + item.priceVnd * item.quantity, 0);

  const checkout = async () => {
    if (!bundle || !shipping.recipientName.trim() || !shipping.phone.trim() || !shipping.addressLine.trim()) {
      setNotice(
        locale === "vi"
          ? "Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ giao hàng để thanh toán thử."
          : "Complete the recipient, phone, and address fields for test checkout."
      );
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await bundle.api.checkoutTest({ shippingAddress: shipping, idempotencyKey: randomUUID() });
      setShipping({ recipientName: "", phone: "", addressLine: "", notes: "" });
      setNotice(
        locale === "vi"
          ? "Đã tạo đơn hàng thử nghiệm thành công. Không trừ tiền thực tế."
          : "Test order created. No real payment was processed."
      );
      await resource.refresh();
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : (locale === "vi" ? "Thanh toán thử thất bại." : "Test checkout failed."));
    } finally {
      setBusy(false);
    }
  };

  if (!bundle) return <Page title={t.cart.title}><SetupState missing={missingConfig} /></Page>;
  if (!session) {
    return (
      <Page title={t.cart.title}>
        <MessageState
          title={locale === "vi" ? "Yêu cầu đăng nhập" : "Sign in required"}
          message={
            locale === "vi"
              ? "Giỏ hàng được bảo vệ bằng cơ chế RLS. Vui lòng đăng nhập ở mục Tài khoản."
              : "Cart data is private and protected by row-level security. Sign in on the Account tab."
          }
        />
      </Page>
    );
  }
  if (resource.loading && !resource.data) return <LoadingState label={locale === "vi" ? "Đang tải giỏ hàng…" : "Loading your cart…"} />;
  if (resource.error) {
    return (
      <Page title={t.cart.title}>
        <MessageState
          title={locale === "vi" ? "Không tải được giỏ hàng" : "Could not load cart"}
          message={resource.error}
          actionLabel={t.discover.tryAgain}
          onAction={() => void resource.refresh()}
        />
      </Page>
    );
  }

  const fields = [
    { key: "recipientName", label: locale === "vi" ? "Họ và tên người nhận" : "Recipient name" },
    { key: "phone", label: locale === "vi" ? "Số điện thoại" : "Phone" },
    { key: "addressLine", label: locale === "vi" ? "Địa chỉ nhận hàng" : "Shipping address" },
    { key: "notes", label: locale === "vi" ? "Ghi chú (tùy chọn)" : "Delivery notes (optional)" }
  ] as const;

  return (
    <Page
      title={t.cart.title}
      intro={locale === "vi" ? "Giá và số lượng được đồng bộ từ giỏ hàng Supabase của bạn." : "Prices and availability are read from your persisted Supabase cart."}
    >
      {resource.data?.length ? (
        <>
          <View style={styles.list}>
            {resource.data.map((line) => (
              <View key={line.id} style={styles.row}>
                <View style={styles.grow}>
                  <Text style={styles.name}>{line.name}</Text>
                  <Text style={styles.meta}>
                    {locale === "vi" ? `Số lượng: ${line.quantity}` : `Quantity ${line.quantity}`}
                  </Text>
                </View>
                <Text style={styles.price}>{money(line.priceVnd * line.quantity)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.total}>{t.cart.total}: {money(total)}</Text>
          {fields.map(({ key, label }) => (
            <TextInput
              key={key}
              accessibilityLabel={label}
              placeholder={label}
              value={shipping[key]}
              onChangeText={(value) => setShipping((current) => ({ ...current, [key]: value }))}
              style={styles.input}
            />
          ))}
          <Text style={styles.disclosure}>
            {locale === "vi"
              ? "THANH TOÁN THỬ NGHIỆM — Chỉ tạo bản ghi thử nghiệm. Không kết nối cổng thanh toán thật."
              : "TEST CHECKOUT — creates a simulated payment attempt only. No payment provider is contacted."}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            style={[styles.button, busy && styles.disabled]}
            onPress={() => void checkout()}
          >
            <Text style={styles.buttonText}>
              {busy ? (locale === "vi" ? "Đang tạo đơn thử…" : "Creating test order…") : (locale === "vi" ? "Xác nhận đặt đơn thử nghiệm" : "Place test order")}
            </Text>
          </Pressable>
        </>
      ) : (
        <MessageState
          title={t.cart.empty}
          message={t.cart.emptyMsg}
        />
      )}
      {notice ? <MessageState title={locale === "vi" ? "Trạng thái đơn hàng" : "Checkout status"} message={notice} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: "white", borderRadius: 15, padding: 14, gap: 12 },
  row: { flexDirection: "row", borderBottomColor: "#eee5dc", borderBottomWidth: 1, paddingBottom: 11 },
  grow: { flex: 1 },
  name: { fontWeight: "700", color: "#34241c" },
  meta: { color: "#75645a", marginTop: 3 },
  price: { fontWeight: "700", color: "#8a3f22" },
  total: { fontSize: 20, fontWeight: "800", textAlign: "right", marginVertical: 16 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#d8cdc4", borderRadius: 12, padding: 12, marginBottom: 8 },
  disclosure: { marginVertical: 10, fontSize: 12, color: "#7b442f", fontWeight: "700" },
  button: { backgroundColor: "#8a3f22", padding: 14, borderRadius: 11, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "800" },
  disabled: { opacity: 0.5 }
});

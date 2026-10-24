import { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Page } from "../../src/components/Page";
import { LoadingState, MessageState, SetupState } from "../../src/components/States";
import { money } from "../../src/domain";
import { useResource } from "../../src/hooks/useResource";
import { loadOrders } from "../../src/lib/adapters";
import { useApp } from "../../src/providers/AppProvider";

export default function OrdersScreen() {
  const { bundle, session, missingConfig, locale, t } = useApp();
  const loader = useCallback(
    () => (bundle && session ? loadOrders(bundle.api) : Promise.resolve([])),
    [bundle, session]
  );
  const resource = useResource(bundle && session ? loader : null);

  if (!bundle) return <Page title={t.orders.title}><SetupState missing={missingConfig} /></Page>;
  if (!session) {
    return (
      <Page title={t.orders.title}>
        <MessageState
          title={locale === "vi" ? "Yêu cầu đăng nhập" : "Sign in required"}
          message={
            locale === "vi"
              ? "Dữ liệu đơn hàng là riêng tư. Đăng nhập ở mục Tài khoản để xem các bản ghi được cấp quyền bởi RLS."
              : "Orders are private. Sign in on the Account tab to access records allowed by row-level security."
          }
        />
      </Page>
    );
  }
  if (resource.loading && !resource.data) return <LoadingState label={locale === "vi" ? "Đang tải danh sách đơn hàng…" : "Loading your orders…"} />;
  if (resource.error) {
    return (
      <Page title={t.orders.title}>
        <MessageState
          title={locale === "vi" ? "Không tải được đơn hàng" : "Could not load orders"}
          message={resource.error}
          actionLabel={t.discover.tryAgain}
          onAction={() => void resource.refresh()}
        />
      </Page>
    );
  }

  return (
    <Page
      title={t.orders.title}
      intro={
        locale === "vi"
          ? "Trạng thái hiển thị nguyên bản từ backend; ứng dụng không tự suy đoán tiến trình giao vận."
          : "Statuses come from the configured backend; the app does not infer fulfillment."
      }
    >
      {resource.data?.length ? (
        resource.data.map((order) => (
          <View key={order.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.id}>#{order.id.slice(0, 8)}</Text>
              <Text style={styles.status}>{order.status}</Text>
            </View>
            <Text style={styles.price}>{money(order.subtotalVnd)}</Text>
            <Text style={styles.date}>
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB")
                : (locale === "vi" ? "Thời gian không khả dụng" : "Date unavailable")}
            </Text>
          </View>
        ))
      ) : (
        <MessageState title={t.orders.empty} message={t.orders.emptyMsg} />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "white", borderWidth: 1, borderColor: "#e4d9cf", borderRadius: 14, padding: 15, marginBottom: 12, gap: 6 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  id: { fontWeight: "800", color: "#34241c" },
  status: { textTransform: "capitalize", color: "#8a3f22", fontWeight: "700" },
  price: { fontSize: 18, fontWeight: "700" },
  date: { color: "#77675e" }
});

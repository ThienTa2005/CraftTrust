import { useCallback, useMemo, useState } from "react";
import { StyleSheet, TextInput } from "react-native";
import { ProductCard } from "../../src/components/Cards";
import { Page } from "../../src/components/Page";
import { LoadingState, MessageState, SetupState } from "../../src/components/States";
import { useResource } from "../../src/hooks/useResource";
import { loadProducts } from "../../src/lib/adapters";
import { useApp } from "../../src/providers/AppProvider";

export default function CatalogScreen() {
  const { bundle, session, missingConfig, locale, t } = useApp();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loader = useCallback(() => (bundle ? loadProducts(bundle.api) : Promise.resolve([])), [bundle]);
  const resource = useResource(bundle ? loader : null);

  const filtered = useMemo(
    () =>
      (resource.data ?? []).filter((item) =>
        `${item.name} ${item.artisanName}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi"))
      ),
    [query, resource.data]
  );

  const add = async (productId: string) => {
    if (!bundle || !session) {
      setNotice(
        locale === "vi"
          ? "Đăng nhập ở mục Tài khoản trước khi thêm sản phẩm vào giỏ."
          : "Sign in on the Account tab before adding items."
      );
      return;
    }
    setAdding(productId);
    setNotice(null);
    try {
      await bundle.api.addToCart({ productId, quantity: 1 });
      setNotice(locale === "vi" ? "Đã thêm tác phẩm vào giỏ hàng." : "Added to your persisted cart.");
    } catch (cause) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : locale === "vi"
          ? "Không thể cập nhật giỏ hàng."
          : "Could not update the cart."
      );
    } finally {
      setAdding(null);
    }
  };

  if (!bundle) return <Page title={t.catalog.title}><SetupState missing={missingConfig} /></Page>;
  if (resource.loading && !resource.data) return <LoadingState label={t.catalog.loading} />;
  if (resource.error) {
    return (
      <Page title={t.catalog.title}>
        <MessageState
          title={t.catalog.couldNotLoad}
          message={resource.error}
          actionLabel={t.catalog.tryAgain}
          onAction={() => void resource.refresh()}
        />
      </Page>
    );
  }

  return (
    <Page title={t.catalog.title} intro={t.catalog.intro}>
      <TextInput
        accessibilityLabel={locale === "vi" ? "Tìm kiếm tác phẩm" : "Search crafts"}
        placeholder={locale === "vi" ? "Tìm kiếm tác phẩm, nghệ nhân…" : "Search craft or artisan"}
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      {notice ? <MessageState title={t.tabs.cart} message={notice} /> : null}
      {filtered.length ? (
        filtered.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            busy={adding === product.id}
            onAdd={() => void add(product.id)}
          />
        ))
      ) : (
        <MessageState
          title={t.catalog.noProducts}
          message={t.catalog.noProductsMsg}
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: "white",
    borderColor: "#d8cdc4",
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
    color: "#30221b"
  }
});

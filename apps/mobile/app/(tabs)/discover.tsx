import { useCallback } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { VillageCard } from "../../src/components/Cards";
import { Page } from "../../src/components/Page";
import { LoadingState, MessageState, SetupState } from "../../src/components/States";
import { useResource } from "../../src/hooks/useResource";
import { loadArtisans, loadVillages } from "../../src/lib/adapters";
import { useApp } from "../../src/providers/AppProvider";

export default function DiscoverScreen() {
  const { bundle, missingConfig, t } = useApp();
  const loader = useCallback(
    async () =>
      bundle
        ? { villages: await loadVillages(bundle.api), artisans: await loadArtisans(bundle.api) }
        : { villages: [], artisans: [] },
    [bundle]
  );
  const resource = useResource(bundle ? loader : null);

  if (!bundle) return <Page title={t.discover.title}><SetupState missing={missingConfig} /></Page>;
  if (resource.loading && !resource.data) return <LoadingState label={t.discover.loadingVillages} />;
  if (resource.error) {
    return (
      <Page title={t.discover.title}>
        <MessageState
          title={t.discover.couldNotLoad}
          message={resource.error}
          actionLabel={t.discover.tryAgain}
          onAction={() => void resource.refresh()}
        />
      </Page>
    );
  }

  return (
    <Page title={t.discover.title} intro={t.discover.intro}>
      {resource.data?.villages.length ? (
        resource.data.villages.map((village) => <VillageCard key={village.id} village={village} />)
      ) : (
        <MessageState title={t.discover.noVillages} message={t.discover.noVillagesMsg} />
      )}
      <Text style={styles.section}>{t.discover.artisans}</Text>
      {resource.data?.artisans.length ? (
        resource.data.artisans.map((artisan) => (
          <View key={artisan.id} style={styles.artisan}>
            {artisan.portraitUrl ? (
              <Image source={{ uri: artisan.portraitUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar} />
            )}
            <View style={styles.grow}>
              <Text style={styles.name}>{artisan.name}</Text>
              <Text style={styles.meta}>
                {artisan.yearsPracticing} {t.discover.yearsPracticing}
              </Text>
              <Text numberOfLines={3} style={styles.bio}>
                {artisan.bio}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <MessageState title={t.discover.noArtisans} message={t.discover.noArtisansMsg} />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: "serif", fontSize: 24, fontWeight: "800", color: "#352219", marginVertical: 14 },
  artisan: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, backgroundColor: "white", borderWidth: 1, borderColor: "#e7dfd7", marginBottom: 12 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#eee5da" },
  grow: { flex: 1 },
  name: { fontWeight: "800", fontSize: 17, color: "#34241c" },
  meta: { color: "#8a3f22", fontSize: 12, marginVertical: 3 },
  bio: { color: "#68584f", lineHeight: 19 }
});

import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Page } from "../../src/components/Page";
import { LoadingState, MessageState, SetupState } from "../../src/components/States";
import type { PassportView } from "../../src/domain";
import { extractPassportId, toPassportView } from "../../src/lib/adapters";
import { useApp } from "../../src/providers/AppProvider";

export default function PassportScreen() {
  const { bundle, missingConfig, locale, t } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PassportView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (raw: string, qr = false) => {
    if (!bundle) return;
    const identifier = extractPassportId(raw);
    if (!identifier) {
      setError(locale === "vi" ? "Nhập mã định danh hộ chiếu hoặc quét mã QR Craft-Trust." : "Enter a passport identifier or scan a Craft-Trust QR code.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const response = qr ? await bundle.api.resolveQr(identifier) : await bundle.api.getPassport(identifier);
      setResult(toPassportView(response, identifier));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (locale === "vi" ? "Không tra cứu được hộ chiếu." : "Passport lookup failed."));
    } finally {
      setBusy(false);
      setScanning(false);
    }
  };

  const onBarcode = (scan: BarcodeScanningResult) => {
    if (!busy) void lookup(scan.data, true);
  };

  if (!bundle) return <Page title={t.passport.title}><SetupState missing={missingConfig} /></Page>;
  if (busy) return <LoadingState label={t.passport.searching} />;

  return (
    <Page title={t.passport.title} intro={t.passport.intro}>
      <TextInput
        accessibilityLabel={locale === "vi" ? "Mã hộ chiếu" : "Passport identifier"}
        autoCapitalize="none"
        placeholder={t.passport.enterCode}
        value={input}
        onChangeText={setInput}
        style={styles.input}
      />
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => void lookup(input)}>
        <Text style={styles.buttonText}>{t.passport.search}</Text>
      </Pressable>

      {Platform.OS === "web" ? (
        <MessageState
          title={locale === "vi" ? "Chưa hỗ trợ camera trên web" : "Camera scan unavailable"}
          message={locale === "vi" ? "Vui lòng nhập trực tiếp mã hộ chiếu hoặc mã QR ở ô trên." : "Camera scanning is not enabled in this web export. Enter the passport identifier above."}
        />
      ) : permission === null ? (
        <MessageState
          title={locale === "vi" ? "Kiểm tra quyền máy ảnh" : "Checking camera permission"}
          message={locale === "vi" ? "Đang chờ quyền truy cập camera từ thiết bị." : "Waiting for the operating system permission state."}
        />
      ) : !permission.granted ? (
        permission.canAskAgain ? (
          <MessageState
            title={locale === "vi" ? "Cần cấp quyền máy ảnh" : "Camera permission needed"}
            message={locale === "vi" ? "Quyền camera chỉ được sử dụng để quét mã QR hộ chiếu." : "Camera access is used only while scanning a passport QR code."}
            actionLabel={locale === "vi" ? "Cấp quyền camera" : "Allow camera"}
            onAction={() => void requestPermission()}
          />
        ) : (
          <MessageState
            title={locale === "vi" ? "Quyền camera bị chặn" : "Camera permission blocked"}
            message={locale === "vi" ? "Bật quyền camera trong Cài đặt thiết bị, hoặc nhập mã thủ công." : "Enable camera permission in device settings, or use manual lookup."}
          />
        )
      ) : scanning ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onBarcode}
          />
          <Pressable style={styles.stop} onPress={() => setScanning(false)}>
            <Text style={styles.buttonText}>{locale === "vi" ? "Dừng quét" : "Cancel scan"}</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => setScanning(true)}>
          <Text style={styles.secondaryText}>{t.passport.scanQr}</Text>
        </Pressable>
      )}

      {error ? <MessageState title={t.passport.notFound} message={error} /> : null}

      {result ? (
        <View style={styles.passport}>
          <Text style={styles.eyebrow}>
            {locale === "vi" ? "KẾT QUẢ SỔ ĐĂNG KÝ · " : "REGISTRY RESULT · "}
            {result.status.toUpperCase()}
          </Text>
          <Text style={styles.product}>{result.productName}</Text>
          <Text style={styles.tier}>{result.tier.toUpperCase()} {locale === "vi" ? "HỘ CHIẾU" : "PASSPORT"}</Text>
          <Text style={styles.detail}>{result.artisanName} · {result.villageName}</Text>
          <Text style={styles.detail}>
            {result.evidenceCount} {locale === "vi" ? "hồ sơ bằng chứng được ghi nhận" : "evidence record(s) returned"}
          </Text>
          <Text style={styles.warning}>
            {locale === "vi"
              ? "Kết quả này phản ánh tình trạng bằng chứng hiện tại trong sổ đăng ký, không thay thế giấy kiểm định độc quyền."
              : "This display does not independently certify authenticity. It reports the current evidence-based registry state."}
          </Text>
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: "white", borderColor: "#d8cdc4", borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 10 },
  button: { backgroundColor: "#8a3f22", padding: 14, borderRadius: 11, alignItems: "center" },
  buttonText: { color: "white", fontWeight: "800" },
  secondary: { borderColor: "#8a3f22", borderWidth: 1, padding: 13, borderRadius: 11, alignItems: "center", marginTop: 12 },
  secondaryText: { color: "#8a3f22", fontWeight: "800" },
  cameraWrap: { marginTop: 14, borderRadius: 16, overflow: "hidden" },
  camera: { height: 320 },
  stop: { backgroundColor: "#4a2720", padding: 13, alignItems: "center" },
  passport: { backgroundColor: "#fff7e7", borderColor: "#d6b36d", borderWidth: 2, borderRadius: 18, padding: 20, marginTop: 16, gap: 8 },
  eyebrow: { fontSize: 11, letterSpacing: 1.2, color: "#6b4b27", fontWeight: "800" },
  product: { fontFamily: "serif", fontSize: 25, fontWeight: "800", color: "#38251d" },
  tier: { alignSelf: "flex-start", backgroundColor: "#8a3f22", color: "white", fontWeight: "800", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  detail: { color: "#55453b" },
  warning: { marginTop: 8, fontSize: 12, color: "#77584c" }
});

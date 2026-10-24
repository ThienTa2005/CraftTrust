import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Page } from "../../src/components/Page";
import { LoadingState, MessageState, SetupState } from "../../src/components/States";
import { useApp } from "../../src/providers/AppProvider";

export default function AccountScreen() {
  const { bundle, session, authLoading, missingConfig, locale, setLocale, t } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const signIn = async () => {
    if (!bundle || !email || !password) {
      setMessage(locale === "vi" ? "Vui lòng nhập email và mật khẩu." : "Enter your email and password.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await bundle.supabase.auth.signInWithPassword({ email: email.trim(), password });
    setMessage(
      error
        ? error.message
        : locale === "vi"
        ? "Đã đăng nhập thành công vào dự án Supabase."
        : "Signed in with the configured Supabase project."
    );
    setBusy(false);
  };

  const signOut = async () => {
    if (bundle) {
      setBusy(true);
      const { error } = await bundle.supabase.auth.signOut();
      setMessage(error?.message ?? null);
      setBusy(false);
    }
  };

  if (!bundle) return <Page title={t.account.title}><SetupState missing={missingConfig} /></Page>;
  if (authLoading) return <LoadingState label={locale === "vi" ? "Đang khôi phục phiên…" : "Restoring saved session…"} />;

  return (
    <Page title={t.account.title} intro={t.account.intro}>
      <View style={styles.langSection}>
        <Text style={styles.langLabel}>{t.account.language}:</Text>
        <View style={styles.langRow}>
          <Pressable
            style={[styles.langBtn, locale === "vi" ? styles.langBtnActive : null]}
            onPress={() => setLocale("vi")}
          >
            <Text style={[styles.langBtnText, locale === "vi" ? styles.langBtnTextActive : null]}>🇻🇳 Tiếng Việt</Text>
          </Pressable>
          <Pressable
            style={[styles.langBtn, locale === "en" ? styles.langBtnActive : null]}
            onPress={() => setLocale("en")}
          >
            <Text style={[styles.langBtnText, locale === "en" ? styles.langBtnTextActive : null]}>🇬🇧 English</Text>
          </Pressable>
        </View>
      </View>

      {session ? (
        <>
          <MessageState
            title={locale === "vi" ? "Đã đăng nhập" : "Signed in"}
            message={session.user.email ?? session.user.id}
          />
          <Pressable disabled={busy} style={styles.button} onPress={() => void signOut()}>
            <Text style={styles.buttonText}>{busy ? (locale === "vi" ? "Đang đăng xuất…" : "Signing out…") : t.account.signOut}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            accessibilityLabel={t.account.email}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder={t.account.email}
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            accessibilityLabel={t.account.password}
            secureTextEntry
            placeholder={t.account.password}
            value={password}
            onChangeText={setPassword}
            style={styles.input}
          />
          <Pressable disabled={busy} style={styles.button} onPress={() => void signIn()}>
            <Text style={styles.buttonText}>{busy ? (locale === "vi" ? "Đang đăng nhập…" : "Signing in…") : t.account.signIn}</Text>
          </Pressable>
          <Text style={styles.help}>
            {locale === "vi"
              ? "Tài khoản và quản lý mật khẩu được xử lý qua ứng dụng web hoặc quản trị viên dự án."
              : "Account creation and password recovery are handled by the deployed web app or project administrator."}
          </Text>
        </>
      )}
      {message ? <MessageState title={locale === "vi" ? "Xác thực" : "Authentication"} message={message} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  langSection: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e7dfd7",
    marginBottom: 16
  },
  langLabel: {
    fontWeight: "700",
    color: "#352219",
    marginBottom: 8,
    fontSize: 14
  },
  langRow: {
    flexDirection: "row",
    gap: 10
  },
  langBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d8cdc4",
    alignItems: "center",
    backgroundColor: "#fbf7f1"
  },
  langBtnActive: {
    backgroundColor: "#8a3f22",
    borderColor: "#8a3f22"
  },
  langBtnText: {
    color: "#68584f",
    fontWeight: "600",
    fontSize: 13
  },
  langBtnTextActive: {
    color: "#fff",
    fontWeight: "800"
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d8cdc4",
    borderRadius: 11,
    padding: 13,
    marginBottom: 10
  },
  button: {
    backgroundColor: "#8a3f22",
    padding: 14,
    borderRadius: 11,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "800"
  },
  help: {
    marginTop: 12,
    color: "#76655b",
    lineHeight: 20
  }
});

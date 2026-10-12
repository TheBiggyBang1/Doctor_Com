import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Pressable,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

const websiteUrl =
  process.env.EXPO_PUBLIC_WEB_URL?.trim() ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:5173"
    : "http://localhost:5173");
const websiteOrigin = new URL(websiteUrl).origin;
const historyBridgeScript = `(function() {
  function notifyNative() {
    var route = window.history.state && window.history.state.doctorCom;
    var canGoBack = Boolean(route && route.depth > 0);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(canGoBack ? "doctor-com-can-go-back" : "doctor-com-at-root");
    }
  }
  var pushState = window.history.pushState;
  window.history.pushState = function() {
    var result = pushState.apply(this, arguments);
    notifyNative();
    return result;
  };
  window.addEventListener("popstate", notifyNative);
  document.addEventListener("DOMContentLoaded", notifyNative, { once: true });
  notifyNative();
  true;
})();`;

export default function App() {
  const webView = useRef<WebView>(null);
  const canGoBack = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!canGoBack.current) return false;
        webView.current?.injectJavaScript("window.history.back();true;");
        return true;
      },
    );

    return () => subscription.remove();
  }, []);

  function handleNavigationChange(navigation: WebViewNavigation) {
    if (navigation.canGoBack) canGoBack.current = true;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={["top", "right", "bottom", "left"]}
        style={styles.container}
      >
        <StatusBar
          translucent={Platform.OS === "android"}
          backgroundColor={Platform.OS === "android" ? "transparent" : "#f7f5fb"}
          barStyle="dark-content"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboard}
        >
          <WebView
            ref={webView}
            source={{ uri: websiteUrl }}
            style={styles.webView}
            originWhitelist={["http://*", "https://*"]}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            automaticallyAdjustContentInsets={false}
            contentInsetAdjustmentBehavior="never"
            injectedJavaScriptBeforeContentLoaded={historyBridgeScript}
            startInLoadingState
            onLoadStart={() => setLoadError(null)}
            onError={(event) => setLoadError(event.nativeEvent.description)}
            onNavigationStateChange={handleNavigationChange}
            onMessage={(event) => {
              canGoBack.current = event.nativeEvent.data === "doctor-com-can-go-back";
            }}
            onShouldStartLoadWithRequest={(request) => {
              if (new URL(request.url).origin === websiteOrigin) return true;
              if (/^https?:\/\//i.test(request.url)) {
                void Linking.openURL(request.url);
              }
              return false;
            }}
            onOpenWindow={(event) => {
              void Linking.openURL(event.nativeEvent.targetUrl);
            }}
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color="#4f2c88" />
              </View>
            )}
          />
          {loadError ? (
            <View style={styles.errorOverlay}>
              <View style={styles.error}>
                <Text style={styles.title}>Doctor Com</Text>
                <Text style={styles.message}>
                  The website could not be reached.
                </Text>
                <Text selectable style={styles.url}>{websiteUrl}</Text>
                <Text selectable style={styles.details}>{loadError}</Text>
                <Text style={styles.hint}>
                  On a physical phone, use your computer&apos;s Wi-Fi IP address and
                  make sure the phone and computer are on the same network. Test this
                  URL in the phone&apos;s browser first.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setLoadError(null);
                    webView.current?.reload();
                  }}
                  style={styles.retry}
                >
                  <Text style={styles.retryText}>Try again</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f5fb",
  },
  keyboard: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: "#f7f5fb",
  },
  loading: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f5fb",
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f7f5fb",
  },
  error: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: "#4f2c88",
    fontSize: 24,
    fontWeight: "700",
  },
  message: {
    marginTop: 12,
    color: "#626875",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  url: {
    marginTop: 12,
    color: "#4f2c88",
    fontSize: 14,
    textAlign: "center",
  },
  details: {
    marginTop: 8,
    color: "#a53b35",
    fontSize: 12,
    textAlign: "center",
  },
  hint: {
    marginTop: 16,
    color: "#626875",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  retry: {
    marginTop: 24,
    borderRadius: 8,
    backgroundColor: "#4f2c88",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});

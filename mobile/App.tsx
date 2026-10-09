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
const pdfPath = "/api/questionnaire/report.pdf";
const pdfViewerPath = "/api/questionnaire/report/viewer";
const androidPdfViewerScript = `(function() {
  var viewerUrl = ${JSON.stringify(`${websiteOrigin}${pdfViewerPath}`)};
  function isReportPdf(value) {
    try { return new URL(value, window.location.href).pathname === ${JSON.stringify(pdfPath)}; }
    catch (_) { return false; }
  }
  function replacePdfFrame(frame) {
    if (isReportPdf(frame.src)) frame.src = viewerUrl;
  }
  function scan(node) {
    if (node.nodeType !== 1) return;
    if (node.tagName === "IFRAME") replacePdfFrame(node);
    node.querySelectorAll("iframe").forEach(replacePdfFrame);
  }
  function start() {
    scan(document.documentElement);
    new MutationObserver(function(records) {
      records.forEach(function(record) {
        if (record.type === "attributes") replacePdfFrame(record.target);
        else record.addedNodes.forEach(scan);
      });
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src"]
    });
  }
  if (document.documentElement) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  true;
})();`;
const mobileSpacingStyles = `
  @media (max-width: 760px) {
    .topbar, .app-topbar { min-height: 56px !important; }
    .hero {
      min-height: auto !important;
      align-items: flex-start !important;
      padding-top: 24px !important;
      padding-bottom: 32px !important;
    }
    .questionnaire { margin-top: 4px !important; }
    .step-heading { margin-top: 12px !important; margin-bottom: 12px !important; }
  }
`;
const mobileSpacingScript = `(function() {
  var style = document.createElement("style");
  style.textContent = ${JSON.stringify(mobileSpacingStyles)};
  var attach = function() { if (document.head) document.head.appendChild(style); };
  if (document.head) attach();
  else document.addEventListener("DOMContentLoaded", attach, { once: true });
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
        webView.current?.goBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, []);

  function handleNavigationChange(navigation: WebViewNavigation) {
    canGoBack.current = navigation.canGoBack;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        edges={["top", "right", "bottom", "left"]}
        style={styles.container}
      >
        <StatusBar backgroundColor="#f7f5fb" barStyle="dark-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
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
            injectedJavaScriptBeforeContentLoaded={mobileSpacingScript}
            injectedJavaScript={Platform.OS === "android" ? androidPdfViewerScript : undefined}
            startInLoadingState
            onLoadStart={() => setLoadError(null)}
            onError={(event) => setLoadError(event.nativeEvent.description)}
            onNavigationStateChange={handleNavigationChange}
            onShouldStartLoadWithRequest={(request) => {
              if (new URL(request.url).origin === websiteOrigin) return true;
              if (/^https?:\/\//i.test(request.url)) {
                void Linking.openURL(request.url);
              }
              return false;
            }}
            onOpenWindow={(event) => {
              const targetUrl = new URL(event.nativeEvent.targetUrl);
              if (
                targetUrl.origin === websiteOrigin &&
                targetUrl.pathname === pdfPath
              ) {
                webView.current?.injectJavaScript(
                  `window.location.href=${JSON.stringify(`${websiteOrigin}${pdfViewerPath}`)};true;`,
                );
                return;
              }
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

package za.ac.uj.academicliteracies;

import android.os.Bundle;
import android.os.Build;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
		final long splashEndTimeMillis = System.currentTimeMillis() + 950;
		splashScreen.setKeepOnScreenCondition(() -> System.currentTimeMillis() < splashEndTimeMillis);

		super.onCreate(savedInstanceState);
		WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
		getWindow().setStatusBarColor(Color.TRANSPARENT);
		getWindow().setNavigationBarColor(Color.TRANSPARENT);
		WindowInsetsControllerCompat insetsController = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
		insetsController.setAppearanceLightStatusBars(false);
		insetsController.setAppearanceLightNavigationBars(false);

		WebView webView = getBridge().getWebView();
		WebSettings webSettings = webView.getSettings();

		webSettings.setMediaPlaybackRequiresUserGesture(false);
		webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
		webSettings.setDomStorageEnabled(true);
		webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
		webSettings.setAllowFileAccess(false);
		webSettings.setAllowContentAccess(true);
		webSettings.setSupportMultipleWindows(false);
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
			webSettings.setSafeBrowsingEnabled(true);
		}

		CookieManager cookieManager = CookieManager.getInstance();
		cookieManager.setAcceptCookie(true);
		cookieManager.setAcceptThirdPartyCookies(webView, true);

		boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
		WebView.setWebContentsDebuggingEnabled(isDebuggable);
		if (!isDebuggable) {
			webView.setWebViewClient(new WebViewClient() {
				@Override
				public void onPageFinished(WebView view, String url) {
					super.onPageFinished(view, url);
					view.evaluateJavascript("(function(){"
						+ "try {"
						+ "document.documentElement.classList.add('android-app');"
						+ "window.__ACADEMIC_APP_SURFACE = Object.assign({}, window.__ACADEMIC_APP_SURFACE || {}, { nativeShell: 'android', nativeBridgeVersion: '1.2.0', voice: { nativeSTT: true } });"
						+ "var style = document.getElementById('hide-debug-ui-style');"
						+ "if (!style) {"
						+ "style = document.createElement('style');"
						+ "style.id = 'hide-debug-ui-style';"
						+ "style.textContent = '[id*=\\\"debug\\\" i], [class*=\\\"debug\\\" i], [data-testid*=\\\"debug\\\" i], [id*=\\\"devtools\\\" i], [class*=\\\"devtools\\\" i] { display:none !important; visibility:hidden !important; }';"
						+ "document.head.appendChild(style);"
						+ "}"
						+ "document.querySelectorAll('button,a,[role=\\\"button\\\"]').forEach(function(el){"
						+ "var text=(el.textContent||'').trim().toLowerCase();"
						+ "if (text==='debug' || text==='developer' || text==='devtools') { el.style.display='none'; el.style.visibility='hidden'; }"
						+ "});"
						+ "} catch(e) {}"
						+ "})();", null);
				}
			});
		}
	}

	@Override
	public void onBackPressed() {
		WebView webView = getBridge() != null ? getBridge().getWebView() : null;
		if (webView == null) {
			super.onBackPressed();
			return;
		}

		webView.evaluateJavascript(
			"(function(){try{return !!(window.__consumeAcademicAndroidBack && window.__consumeAcademicAndroidBack());}catch(e){return false;}})();",
			value -> {
				String normalized = value == null ? "" : value.replace("\"", "").trim();
				boolean handled = "true".equalsIgnoreCase(normalized);
				if (handled) {
					return;
				}
				if (webView.canGoBack()) {
					webView.goBack();
					return;
				}
				MainActivity.super.onBackPressed();
			}
		);
	}
}

package za.ac.uj.academicliteracies;

import android.os.Bundle;
import android.content.pm.ApplicationInfo;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
		final long splashEndTimeMillis = System.currentTimeMillis() + 1_200;
		splashScreen.setKeepOnScreenCondition(() -> System.currentTimeMillis() < splashEndTimeMillis);

		super.onCreate(savedInstanceState);

		WebView webView = getBridge().getWebView();
		WebSettings webSettings = webView.getSettings();

		webSettings.setMediaPlaybackRequiresUserGesture(false);
		webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
		webSettings.setDomStorageEnabled(true);
		webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

		CookieManager cookieManager = CookieManager.getInstance();
		cookieManager.setAcceptCookie(true);
		cookieManager.setAcceptThirdPartyCookies(webView, true);

		boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
		if (!isDebuggable) {
			webView.setWebViewClient(new WebViewClient() {
				@Override
				public void onPageFinished(WebView view, String url) {
					super.onPageFinished(view, url);
					view.evaluateJavascript("(function(){"
						+ "try {"
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
}

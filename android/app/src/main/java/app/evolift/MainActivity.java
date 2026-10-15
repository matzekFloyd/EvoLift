package app.evolift;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.WHITE));
        WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insets.setAppearanceLightStatusBars(true);
        insets.setAppearanceLightNavigationBars(true);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() == null ? null : getBridge().getWebView();
                if (webView == null) {
                    leaveTheApp(this);
                    return;
                }
                if (webView.canGoBack() && !backLeavesTheApp(webView.getUrl(), true)) {
                    webView.goBack();
                    return;
                }
                // Next.js moves between pages without a WebView history entry.
                webView.evaluateJavascript(
                        "(function(){try{var path=location.pathname||'';"
                                + "if(path===''||path==='/')return 'leave';"
                                + "if(window.navigation&&navigation.canGoBack){history.back();return 'back';}"
                                + "return 'leave';}catch(e){return 'leave';}})()",
                        value -> {
                            if (value != null && value.contains("back")) {
                                return;
                            }
                            leaveTheApp(this);
                        });
            }

            private void leaveTheApp(OnBackPressedCallback callback) {
                callback.setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        });
    }

    /**
     * Home always leaves the app. Any other page goes back when the WebView has history.
     * Same rule as backLeavesTheApp in shell/server-config.cjs.
     */
    static boolean backLeavesTheApp(String url, boolean canGoBack) {
        if (isShellHome(url)) {
            return true;
        }
        return !canGoBack;
    }

    static boolean isShellHome(String url) {
        if (url == null || url.trim().isEmpty()) {
            return true;
        }
        try {
            String path = Uri.parse(url).getPath();
            return path == null || path.isEmpty() || "/".equals(path);
        } catch (Exception ex) {
            return true;
        }
    }
}

package app.evolift;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.WHITE));
        WindowInsetsControllerCompat insets = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        insets.setAppearanceLightStatusBars(true);
        insets.setAppearanceLightNavigationBars(true);
        if (getBridge() != null) {
            getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public void doUpdateVisitedHistory(WebView view, String url, boolean isReload) {
                    super.doUpdateVisitedHistory(view, url, isReload);
                    applyScreenHold(url);
                }
            });
        }
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
                        "(function(){try{var path=location.pathname||'/';"
                                + "while(path.length>1&&path.endsWith('/'))path=path.slice(0,-1);"
                                + "if(path==='/app')return 'leave';"
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

    @Override
    public void onResume() {
        super.onResume();
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        applyScreenHold(webView == null ? null : webView.getUrl());
    }

    @Override
    public void onPause() {
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        super.onPause();
    }

    private void applyScreenHold(String url) {
        if (screenStaysAwake(url)) {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            return;
        }
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    /**
     * `/app` always leaves the app. Any other page goes back when the WebView has history.
     * Same rule as backLeavesTheApp in shell/server-config.cjs.
     */
    static boolean backLeavesTheApp(String url, boolean canGoBack) {
        if (isShellHome(url)) {
            return true;
        }
        return !canGoBack;
    }

    /**
     * True for /app/sessions/new and /app/sessions/[id]. Same rule as screenStaysAwake in shell/server-config.cjs.
     */
    static boolean screenStaysAwake(String url) {
        if (url == null || url.trim().isEmpty()) {
            return false;
        }
        try {
            String path = shellPath(url);
            if (!path.startsWith("/app/sessions/")) {
                return false;
            }
            String rest = path.substring("/app/sessions/".length());
            return !rest.isEmpty() && !rest.contains("/");
        } catch (Exception ex) {
            return false;
        }
    }

    static boolean isShellHome(String url) {
        if (url == null || url.trim().isEmpty()) {
            return true;
        }
        try {
            return "/app".equals(shellPath(url));
        } catch (Exception ex) {
            return true;
        }
    }

    /** Pathname with a trailing slash removed. A missing path is the site root. */
    private static String shellPath(String url) {
        String path = Uri.parse(url).getPath();
        if (path == null || path.isEmpty()) {
            return "/";
        }
        while (path.length() > 1 && path.endsWith("/")) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }
}

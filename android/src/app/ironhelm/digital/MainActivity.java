package app.ironhelm.digital;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.pm.ApplicationInfo;
import android.content.res.AssetManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.DisplayCutout;
import android.view.KeyEvent;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JsPromptResult;
import android.webkit.JsResult;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Iron Helm Digital: actividad única que aloja el juego (HTML/CSS/JS empaquetado en assets/)
 * en un WebView a pantalla completa, sin red. El contenido se sirve desde el origen seguro
 * https://appassets.androidplatform.net/ (un origen estable hace que localStorage persista
 * entre arranques y que Web Audio funcione sin restricciones de file://).
 */
public class MainActivity extends Activity {
    private static final String TAG = "IronHelm";
    private static final String TAG_JS = "IronHelmJS";
    static final String HOST = "appassets.androidplatform.net";
    static final String ORIGIN = "https://" + HOST + "/";
    static final String START_URL = ORIGIN + "index.html";
    static final int BG = 0xFF0D0805;
    private static final long BACK_WINDOW_MS = 2000;
    private static final long BACK_JS_TIMEOUT_MS = 800;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private FrameLayout root;
    private WebView web;
    private boolean debuggable;
    private boolean destroyed;

    /** Insets (en px CSS) que ya se inyectaron/van a inyectarse al juego. Se leen desde el hilo de red del WebView. */
    private volatile String insetsCss = "0px,0px,0px,0px";
    private int imeBottomPx = 0;

    // Botón atrás
    private long lastBackAt = 0;
    private int backToken = 0;
    private Toast backToast;

    private AlertDialog jsDialog;

    // ------------------------------------------------------------------ ciclo de vida

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        if (debuggable) WebView.setWebContentsDebuggingEnabled(true);

        Window w = getWindow();
        w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        w.setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(BG));
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
        }

        root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        root.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            @Override
            public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
                handleInsets(insets);
                return v.onApplyWindowInsets(insets);
            }
        });
        setContentView(root, new FrameLayout.LayoutParams(-1, -1));
        applyImmersive(w);
        if (Build.VERSION.SDK_INT < 30) {
            // Si el sistema vuelve a mostrar las barras (gesto), se ocultan de nuevo tras un momento.
            w.getDecorView().setOnSystemUiVisibilityChangeListener(new View.OnSystemUiVisibilityChangeListener() {
                @Override
                public void onSystemUiVisibilityChange(int visibility) {
                    if ((visibility & View.SYSTEM_UI_FLAG_HIDE_NAVIGATION) == 0) {
                        ui.postDelayed(new Runnable() { @Override public void run() { applyImmersive(getWindow()); } }, 1800);
                    }
                }
            });
        }

        // Las respuestas de assets/ las genera shouldInterceptRequest y no pasan por la caché HTTP del WebView,
        // así que una APK nueva nunca ve contenido viejo. localStorage (la partida guardada) persiste entre versiones.
        createWebView();
        root.requestApplyInsets();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
        applyImmersive(getWindow());
        root.requestApplyInsets();
    }

    @Override
    protected void onPause() {
        // El WebView se queda en segundo plano: la página pasa a "hidden" y Web Audio se suspende solo.
        // La partida se guarda en localStorage en cada paso (no depende de este evento).
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        ui.removeCallbacksAndMessages(null);
        if (jsDialog != null) { try { jsDialog.dismiss(); } catch (Exception ignored) { } jsDialog = null; }
        if (web != null) {
            root.removeView(web);
            web.stopLoading();
            web.setWebViewClient(new WebViewClient());
            web.setWebChromeClient(null);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        // Rotación, plegado, cambio de tamaño de fuente, etc.: la actividad no se recrea.
        super.onConfigurationChanged(newConfig);
        applyImmersive(getWindow());
        root.requestApplyInsets();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersive(getWindow());
            if (web != null) web.requestFocus();
        }
    }

    // ------------------------------------------------------------------ WebView

    @SuppressLint({"SetJavaScriptEnabled", "ClickableViewAccessibility"})
    private void createWebView() {
        final WebView wv = new WebView(this);
        wv.setBackgroundColor(BG);
        wv.setOverScrollMode(View.OVER_SCROLL_NEVER);
        wv.setVerticalScrollBarEnabled(false);
        wv.setHorizontalScrollBarEnabled(false);
        wv.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
        wv.setHapticFeedbackEnabled(false);
        wv.setLongClickable(false);
        // La pulsación larga la usa el juego (ver carta en grande): que el sistema no abra menús ni seleccione texto.
        wv.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) { return true; }
        });
        wv.setFocusable(true);
        wv.setFocusableInTouchMode(true);

        WebSettings s = wv.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setGeolocationEnabled(false);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSaveFormData(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setBlockNetworkLoads(true); // sin red: las respuestas interceptadas (assets) no cuentan como carga de red
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(false);
        if (Build.VERSION.SDK_INT >= 29) {
            try { s.setForceDark(WebSettings.FORCE_DARK_OFF); } catch (Throwable ignored) { }
        }

        wv.setWebViewClient(new GameClient());
        wv.setWebChromeClient(new GameChrome());

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(-1, -1);
        lp.bottomMargin = imeBottomPx;
        root.addView(wv, lp);
        web = wv;
        wv.loadUrl(START_URL);
        wv.requestFocus();
    }

    /** Sirve assets/ como si fuera https://appassets.androidplatform.net/ y bloquea todo lo demás. */
    private final class GameClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return serve(request.getUrl(), request.getMethod());
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (isOwn(u)) return false;
            Log.w(TAG, "Navegación externa bloqueada: " + u);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            injectInsets();
        }

        @Override
        public void onPageCommitVisible(WebView view, String url) {
            injectInsets();
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            injectInsets();
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            Log.e(TAG, "Error de carga " + request.getUrl() + " : " + (Build.VERSION.SDK_INT >= 23 ? error.getDescription() : ""));
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            Log.w(TAG, "HTTP " + errorResponse.getStatusCode() + " " + request.getUrl());
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // El proceso de render murió (poca memoria, etc.): se recrea el WebView sin cerrar la app.
            Log.e(TAG, "Proceso de render terminado (crash=" + detail.didCrash() + "); se recrea el WebView");
            if (destroyed || view != web) return true;
            root.removeView(view);
            view.destroy();
            web = null;
            createWebView();
            return true;
        }
    }

    /** Reenvía la consola de JS a logcat y atiende alert/confirm/prompt con diálogos oscuros. */
    private final class GameChrome extends WebChromeClient {
        @Override
        public boolean onConsoleMessage(ConsoleMessage m) {
            int prio;
            switch (m.messageLevel()) {
                case ERROR: prio = Log.ERROR; break;
                case WARNING: prio = Log.WARN; break;
                case DEBUG: prio = Log.DEBUG; break;
                default: prio = Log.INFO; break;
            }
            String src = m.sourceId();
            if (src != null) {
                int i = src.lastIndexOf('/');
                if (i >= 0) src = src.substring(i + 1);
            }
            Log.println(prio, TAG_JS, m.message() + " (" + src + ":" + m.lineNumber() + ")");
            return true;
        }

        @Override
        public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
            showJsDialog(message, null, false, result, null);
            return true;
        }

        @Override
        public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
            showJsDialog(message, null, true, result, null);
            return true;
        }

        @Override
        public boolean onJsPrompt(WebView view, String url, String message, String defaultValue, final JsPromptResult result) {
            showJsDialog(message, defaultValue == null ? "" : defaultValue, true, null, result);
            return true;
        }

        @Override
        public boolean onJsBeforeUnload(WebView view, String url, String message, JsResult result) {
            result.confirm();
            return true;
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            request.deny(); // el juego no necesita cámara, micrófono ni nada parecido
        }

        @Override
        public Bitmap getDefaultVideoPoster() {
            return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
        }
    }

    private void showJsDialog(String message, String promptDefault, boolean cancelable,
                              final JsResult result, final JsPromptResult promptResult) {
        if (destroyed || isFinishing()) {
            if (promptResult != null) promptResult.cancel(); else if (result != null) result.cancel();
            return;
        }
        if (jsDialog != null) { try { jsDialog.dismiss(); } catch (Exception ignored) { } }
        AlertDialog.Builder b = new AlertDialog.Builder(this, R.style.IronDialog);
        b.setMessage(message);
        final EditText input;
        if (promptResult != null) {
            input = new EditText(this);
            input.setText(promptDefault);
            input.setSingleLine(true);
            b.setView(input);
        } else {
            input = null;
        }
        b.setPositiveButton(R.string.dialog_ok, new DialogInterface.OnClickListener() {
            @Override public void onClick(DialogInterface d, int which) {
                if (promptResult != null) promptResult.confirm(input.getText().toString()); else result.confirm();
            }
        });
        if (cancelable) {
            b.setNegativeButton(R.string.dialog_cancel, new DialogInterface.OnClickListener() {
                @Override public void onClick(DialogInterface d, int which) {
                    if (promptResult != null) promptResult.cancel(); else result.cancel();
                }
            });
        }
        b.setOnCancelListener(new DialogInterface.OnCancelListener() {
            @Override public void onCancel(DialogInterface d) {
                if (promptResult != null) promptResult.cancel(); else result.cancel();
            }
        });
        AlertDialog d = b.create();
        // El diálogo también se muestra sin barras del sistema.
        d.getWindow().setFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE);
        d.show();
        applyImmersive(d.getWindow());
        d.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE);
        jsDialog = d;
    }

    // ------------------------------------------------------------------ servidor de assets

    private static boolean isOwn(Uri u) {
        return u != null && "https".equals(u.getScheme()) && HOST.equalsIgnoreCase(u.getHost());
    }

    private static final Map<String, String> MIME = new HashMap<String, String>();
    static {
        MIME.put("html", "text/html"); MIME.put("htm", "text/html");
        MIME.put("js", "text/javascript"); MIME.put("mjs", "text/javascript");
        MIME.put("css", "text/css");
        MIME.put("json", "application/json"); MIME.put("map", "application/json");
        MIME.put("webmanifest", "application/manifest+json");
        MIME.put("txt", "text/plain");
        MIME.put("jpg", "image/jpeg"); MIME.put("jpeg", "image/jpeg");
        MIME.put("png", "image/png"); MIME.put("webp", "image/webp");
        MIME.put("gif", "image/gif"); MIME.put("svg", "image/svg+xml"); MIME.put("ico", "image/x-icon");
        MIME.put("avif", "image/avif");
        MIME.put("woff2", "font/woff2"); MIME.put("woff", "font/woff");
        MIME.put("ttf", "font/ttf"); MIME.put("otf", "font/otf");
        MIME.put("mp3", "audio/mpeg"); MIME.put("ogg", "audio/ogg"); MIME.put("wav", "audio/wav");
        MIME.put("m4a", "audio/mp4"); MIME.put("mp4", "video/mp4"); MIME.put("webm", "video/webm");
        MIME.put("wasm", "application/wasm");
    }

    private WebResourceResponse serve(Uri url, String method) {
        if (!isOwn(url)) {
            // Todo lo que no sea el propio juego (red, http, otros hosts) se corta: la app va 100 % sin conexión.
            return reply(403, "Forbidden", "text/plain", null, "Bloqueado: Iron Helm funciona sin conexión.".getBytes());
        }
        String path = url.getPath();
        if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
        path = path.substring(1);
        if (path.equals("favicon.ico")) {
            return reply(204, "No Content", "image/x-icon", null, new byte[0]); // el juego no lleva favicon: sin 404 ni ruido en logcat
        }
        if (path.contains("..") || path.startsWith("/")) {
            return reply(403, "Forbidden", "text/plain", null, "Ruta no válida".getBytes());
        }
        String ext = "";
        int dot = path.lastIndexOf('.');
        if (dot >= 0) ext = path.substring(dot + 1).toLowerCase(Locale.ROOT);
        String mime = MIME.get(ext);
        if (mime == null) mime = "application/octet-stream";
        final boolean text = mime.startsWith("text/") || mime.equals("application/json") || mime.equals("image/svg+xml");
        try {
            AssetManager am = getAssets();
            InputStream in = null;
            if (ext.equals("jpg") || ext.equals("jpeg")) {
                // Las cartas van recomprimidas como .webp (mismo nombre base) para que la APK pese menos.
                try {
                    in = am.open(path.substring(0, dot) + ".webp", AssetManager.ACCESS_STREAMING);
                    mime = "image/webp";
                } catch (IOException notWebp) {
                    in = null;
                }
            }
            if (in == null) in = am.open(path, AssetManager.ACCESS_STREAMING);
            // Medios inmutables dentro de una versión: caché larga. Código y estilos: siempre se revalidan.
            boolean media = mime.startsWith("image/") || mime.startsWith("font/") || mime.startsWith("audio/") || mime.startsWith("video/");
            Map<String, String> h = new HashMap<String, String>();
            h.put("Cache-Control", media ? "public, max-age=86400" : "no-cache");
            h.put("X-Content-Type-Options", "nosniff");
            h.put("Accept-Ranges", "none");
            if ("HEAD".equalsIgnoreCase(method)) {
                try { in.close(); } catch (IOException ignored) { }
                in = new ByteArrayInputStream(new byte[0]);
            } else if (path.equals("index.html")) {
                in = new ByteArrayInputStream(withInsets(readAll(in)));
            }
            return new WebResourceResponse(mime, text ? "utf-8" : null, 200, "OK", h, in);
        } catch (IOException e) {
            Log.w(TAG, "No existe en assets: " + path);
            return reply(404, "Not Found", "text/plain", null, ("No encontrado: " + path).getBytes());
        }
    }

    private static WebResourceResponse reply(int code, String reason, String mime, String enc, byte[] body) {
        Map<String, String> h = new HashMap<String, String>();
        h.put("Cache-Control", "no-store");
        return new WebResourceResponse(mime, enc, code, reason, h, new ByteArrayInputStream(body));
    }

    private static byte[] readAll(InputStream in) throws IOException {
        try {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream(8192);
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            try { in.close(); } catch (IOException ignored) { }
        }
    }

    /** Inserta en index.html los insets actuales como variables CSS, para que el primer pintado ya sea correcto. */
    private byte[] withInsets(byte[] html) {
        String s = new String(html, java.nio.charset.Charset.forName("UTF-8"));
        String style = "<style id=\"ih-native-insets\">:root{" + cssVars(insetsCss) + "}</style>";
        int i = s.indexOf("</head>");
        s = i >= 0 ? s.substring(0, i) + style + s.substring(i) : style + s;
        return s.getBytes(java.nio.charset.Charset.forName("UTF-8"));
    }

    private static String cssVars(String csv) {
        String[] p = csv.split(",");
        return "--sai-t:" + p[0] + ";--sai-b:" + p[1] + ";--sai-l:" + p[2] + ";--sai-r:" + p[3] + ";";
    }

    // ------------------------------------------------------------------ insets

    private static String px(float v) {
        // Dos decimales como máximo, sin ceros sobrantes: "24px", "24.5px".
        float r = Math.round(v * 100f) / 100f;
        if (r == (int) r) return ((int) r) + "px";
        return String.valueOf(r) + "px";
    }

    private void handleInsets(WindowInsets insets) {
        int t, b, l, r;
        int ime = 0;
        if (Build.VERSION.SDK_INT >= 30) {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            t = bars.top; b = bars.bottom; l = bars.left; r = bars.right;
            if (insets.isVisible(WindowInsets.Type.ime())) ime = insets.getInsets(WindowInsets.Type.ime()).bottom;
        } else {
            t = insets.getSystemWindowInsetTop();
            b = insets.getSystemWindowInsetBottom();
            l = insets.getSystemWindowInsetLeft();
            r = insets.getSystemWindowInsetRight();
            if (Build.VERSION.SDK_INT >= 28) {
                DisplayCutout dc = insets.getDisplayCutout();
                if (dc != null) {
                    t = Math.max(t, dc.getSafeInsetTop());
                    b = Math.max(b, dc.getSafeInsetBottom());
                    l = Math.max(l, dc.getSafeInsetLeft());
                    r = Math.max(r, dc.getSafeInsetRight());
                }
            }
            // En Android < 11 el teclado aparece como inset inferior del sistema (con la barra de navegación oculta).
            if (b > 0 && root.getHeight() > 0 && b > root.getHeight() / 6) { ime = b; }
        }
        if (ime > 0) b = 0; // el teclado ya recorta el WebView por abajo
        float d = getResources().getDisplayMetrics().density;
        if (d <= 0) d = 1f;
        insetsCss = px(t / d) + "," + px(b / d) + "," + px(l / d) + "," + px(r / d);
        if (ime != imeBottomPx) {
            imeBottomPx = ime;
            if (web != null) {
                FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) web.getLayoutParams();
                lp.bottomMargin = ime;
                web.setLayoutParams(lp);
            }
        }
        injectInsets();
    }

    private void injectInsets() {
        final WebView wv = web;
        if (wv == null || destroyed) return;
        String[] p = insetsCss.split(",");
        final String js = "(function(){try{var s=document.documentElement.style;"
                + "s.setProperty('--sai-t','" + p[0] + "');s.setProperty('--sai-b','" + p[1] + "');"
                + "s.setProperty('--sai-l','" + p[2] + "');s.setProperty('--sai-r','" + p[3] + "');"
                + "window.dispatchEvent(new CustomEvent('ironhelm-insets',{detail:{top:'" + p[0] + "',bottom:'" + p[1] + "',left:'" + p[2] + "',right:'" + p[3] + "'}}));"
                + "}catch(e){}})();";
        wv.post(new Runnable() {
            @Override public void run() { if (!destroyed && web == wv) wv.evaluateJavascript(js, null); }
        });
    }

    // ------------------------------------------------------------------ pantalla inmersiva

    @SuppressWarnings("deprecation")
    private void applyImmersive(Window w) {
        if (w == null) return;
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                c.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
            }
        } else {
            w.getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }
    }

    // ------------------------------------------------------------------ botón atrás

    @Override
    @SuppressWarnings({"deprecation", "unchecked", "rawtypes"})
    public void onBackPressed() {
        final WebView wv = web;
        if (wv == null) { exitFlow(); return; }
        final int token = ++backToken;
        // Si el juego no contesta a tiempo (JS colgado), se sigue el flujo normal de salida.
        ui.postDelayed(new Runnable() {
            @Override public void run() { if (token == backToken) { backToken++; exitFlow(); } }
        }, BACK_JS_TIMEOUT_MS);
        try {
            wv.evaluateJavascript(
                    "(function(){try{return window.ironHelmBack?window.ironHelmBack():false}catch(e){return false}})()",
                    // ValueCallback "crudo" a propósito: con genéricos javac 21 emite un puente con MethodParameters
                    // sin nombre que hace fallar a d8 de build-tools 34.
                    new android.webkit.ValueCallback() {
                        @Override public void onReceiveValue(Object value) {
                            if (token != backToken) return; // ya gestionado por el temporizador
                            backToken++;
                            if ("true".equals(value)) lastBackAt = 0; // el juego lo ha consumido (cerró una ficha, la mochila...)
                            else exitFlow();
                        }
                    });
        } catch (Exception e) {
            if (token == backToken) { backToken++; exitFlow(); }
        }
    }

    /** Doble pulsación en 2 s para salir. */
    private void exitFlow() {
        if (destroyed) return;
        long now = android.os.SystemClock.elapsedRealtime();
        if (lastBackAt != 0 && now - lastBackAt <= BACK_WINDOW_MS) {
            if (backToast != null) backToast.cancel();
            finishAndRemoveTask();
            return;
        }
        lastBackAt = now;
        if (backToast != null) backToast.cancel();
        backToast = Toast.makeText(this, R.string.back_again, Toast.LENGTH_SHORT);
        backToast.show();
    }
}

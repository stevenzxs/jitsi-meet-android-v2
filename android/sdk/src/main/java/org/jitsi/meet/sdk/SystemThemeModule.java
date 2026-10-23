package org.jitsi.meet.sdk;

import android.app.Activity;
import android.content.Context;
import android.graphics.Color;
import android.os.Build;
import android.view.Window;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.module.annotations.ReactModule;

/** Applies the app selection to system bars without changing device-wide night mode. */
@ReactModule(name = SystemThemeModule.NAME)
class SystemThemeModule extends ReactContextBaseJavaModule implements LifecycleEventListener {
    static final String NAME = "SystemTheme";
    private static final String PREFERENCES = "cloudmeet-system-theme";

    SystemThemeModule(ReactApplicationContext context) {
        super(context);
        context.addLifecycleEventListener(this);
    }

    @Override
    public String getName() {
        return NAME;
    }

    @ReactMethod
    public void setTheme(String mode) {
        // Mirror Redux's persisted selection for window creation before JS is ready.
        getReactApplicationContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .edit().putBoolean("light", "light".equals(mode)).apply();
        updateActivity();
    }

    static void apply(Activity activity) {
        boolean light = activity.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
            .getBoolean("light", false);
        int color = Color.parseColor(light ? "#F3F5F9" : "#040404");
        Window window = activity.getWindow();
        // Also paint behind transparent Android 15 edge-to-edge system bars.
        window.getDecorView().setBackgroundColor(color);
        window.setStatusBarColor(color);
        window.setNavigationBarColor(color);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(light);
        controller.setAppearanceLightNavigationBars(light);
    }

    private void updateActivity() {
        Activity activity = getCurrentActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> apply(activity));
        }
    }

    @Override
    public void onHostResume() {
        updateActivity();
    }

    @Override
    public void onHostPause() { }

    @Override
    public void onHostDestroy() { }

    @Override
    public void invalidate() {
        getReactApplicationContext().removeLifecycleEventListener(this);
        super.invalidate();
    }
}

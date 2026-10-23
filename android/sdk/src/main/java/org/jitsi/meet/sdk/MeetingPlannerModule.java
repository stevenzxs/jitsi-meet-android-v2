package org.jitsi.meet.sdk;

import android.app.Activity;
import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Calendar;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Native date/time pickers and Keystore-backed private planner persistence. */
class MeetingPlannerModule extends ReactContextBaseJavaModule {
    private static final String ALIAS = "cloudmeet-planner-v1";
    MeetingPlannerModule(ReactApplicationContext context) { super(context); }
    @Override public String getName() { return "MeetingPlanner"; }

    private SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (!store.containsAlias(ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
            generator.generateKey();
        }
        return (SecretKey) store.getKey(ALIAS, null);
    }

    @ReactMethod public synchronized void read(Promise promise) {
        try {
            String value = getReactApplicationContext().getSharedPreferences(ALIAS, Context.MODE_PRIVATE).getString("data", null);
            if (value == null) { promise.resolve(null); return; }
            String[] parts = value.split(":");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            promise.resolve(new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8));
        } catch (Exception error) { promise.reject("PLANNER_READ", "无法读取本机预定记录，请勿清除数据或重复创建"); }
    }

    @ReactMethod public synchronized void write(String value, Promise promise) {
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key());
            String encrypted = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":"
                + Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
            if (!getReactApplicationContext().getSharedPreferences(ALIAS, Context.MODE_PRIVATE).edit().putString("data", encrypted).commit()) {
                throw new Exception("write failed");
            }
            promise.resolve(null);
        } catch (Exception error) { promise.reject("PLANNER_WRITE", "无法安全保存预定凭据，请重试"); }
    }

    @ReactMethod public void pick(double timestamp, boolean date, boolean light, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null) { promise.reject("NO_ACTIVITY", "页面不可用"); return; }
        activity.runOnUiThread(() -> {
            Calendar calendar = Calendar.getInstance();
            calendar.setTimeInMillis((long) timestamp);
            int theme = light ? android.app.AlertDialog.THEME_DEVICE_DEFAULT_LIGHT : android.app.AlertDialog.THEME_DEVICE_DEFAULT_DARK;
            if (date) {
                DatePickerDialog dialog = new DatePickerDialog(activity, theme, (view, year, month, day) -> {
                    calendar.set(year, month, day);
                    promise.resolve((double) calendar.getTimeInMillis());
                }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH));
                dialog.setOnCancelListener(ignored -> promise.resolve(null));
                dialog.show();
            } else {
                TimePickerDialog dialog = new TimePickerDialog(activity, theme, (view, hour, minute) -> {
                    calendar.set(Calendar.HOUR_OF_DAY, hour);
                    calendar.set(Calendar.MINUTE, minute);
                    calendar.set(Calendar.SECOND, 0);
                    calendar.set(Calendar.MILLISECOND, 0);
                    promise.resolve((double) calendar.getTimeInMillis());
                }, calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE), true);
                dialog.setOnCancelListener(ignored -> promise.resolve(null));
                dialog.show();
            }
        });
    }
}

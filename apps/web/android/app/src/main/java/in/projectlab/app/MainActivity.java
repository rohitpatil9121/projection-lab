package in.projectlab.app;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Pin text zoom to 100%: Android WebView otherwise multiplies all web text
        // by the system font scale, which blows the fixed mobile layout past the
        // screen edge on devices with "Large" font settings.
        WebSettings settings = bridge.getWebView().getSettings();
        settings.setTextZoom(100);
    }
}

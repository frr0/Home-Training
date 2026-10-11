package com.velotrain.app;

import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void downloadBase64File(String filename, String base64Data) {
                runOnUiThread(() -> {
                    try {
                        byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
                        Uri fileUri = null;

                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                            ContentValues values = new ContentValues();
                            values.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                            values.put(MediaStore.Downloads.MIME_TYPE, "application/octet-stream");
                            values.put(MediaStore.Downloads.IS_PENDING, 1);

                            fileUri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                            if (fileUri != null) {
                                try (OutputStream out = getContentResolver().openOutputStream(fileUri)) {
                                    out.write(fileBytes);
                                }
                                values.clear();
                                values.put(MediaStore.Downloads.IS_PENDING, 0);
                                getContentResolver().update(fileUri, values, null, null);
                            }
                        } else {
                            File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                            File file = new File(downloadsDir, filename);
                            try (FileOutputStream fos = new FileOutputStream(file)) {
                                fos.write(fileBytes);
                            }
                            fileUri = FileProvider.getUriForFile(MainActivity.this, getPackageName() + ".fileprovider", file);
                        }

                        Toast.makeText(MainActivity.this, "File .FIT salvato in Download: " + filename, Toast.LENGTH_LONG).show();

                        if (fileUri != null) {
                            Intent shareIntent = new Intent(Intent.ACTION_SEND);
                            shareIntent.setType("application/octet-stream");
                            shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
                            shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            startActivity(Intent.createChooser(shareIntent, "Condividi o Salva file .FIT"));
                        }
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Errore salvataggio: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                });
            }
        }, "AndroidDownloader");
    }
}

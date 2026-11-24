package com.ilavty.camstudy;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Rect;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.face.Face;
import com.google.mlkit.vision.face.FaceDetection;
import com.google.mlkit.vision.face.FaceDetector;
import com.google.mlkit.vision.face.FaceDetectorOptions;

import java.io.OutputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** 얼굴 찾기(ML Kit) + 영상/사진을 기기 갤러리에 저장하는 작은 플러그인 */
@CapacitorPlugin(name = "FaceDetect")
public class FaceDetectPlugin extends Plugin {
    private FaceDetector detector;
    private final ExecutorService ex = Executors.newSingleThreadExecutor();
    private final Map<Integer, OutputStream> outs = new HashMap<>();
    private int next = 1;

    @Override
    public void load() {
        FaceDetectorOptions o = new FaceDetectorOptions.Builder()
                .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
                .setMinFaceSize(0.06f)
                .build();
        detector = FaceDetection.getClient(o);
    }

    /** images: base64 JPEG 목록 → results: 사진마다 얼굴 상자 목록 (0~1 비율) */
    @PluginMethod
    public void detectBatch(final PluginCall call) {
        final JSArray images = call.getArray("images");
        ex.execute(new Runnable() {
            @Override
            public void run() {
                try {
                    JSArray results = new JSArray();
                    for (int i = 0; i < images.length(); i++) {
                        byte[] bytes = Base64.decode(images.getString(i), Base64.DEFAULT);
                        Bitmap bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                        JSArray arr = new JSArray();
                        if (bmp != null) {
                            List<Face> faces = Tasks.await(detector.process(InputImage.fromBitmap(bmp, 0)));
                            for (Face f : faces) {
                                Rect r = f.getBoundingBox();
                                JSObject o = new JSObject();
                                o.put("x", r.left / (double) bmp.getWidth());
                                o.put("y", r.top / (double) bmp.getHeight());
                                o.put("w", r.width() / (double) bmp.getWidth());
                                o.put("h", r.height() / (double) bmp.getHeight());
                                arr.put(o);
                            }
                            bmp.recycle();
                        }
                        results.put(arr);
                    }
                    JSObject ret = new JSObject();
                    ret.put("results", results);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject(String.valueOf(e.getMessage()));
                }
            }
        });
    }

    @PluginMethod
    public void saveBegin(PluginCall call) {
        try {
            String name = call.getString("name", "file");
            String mime = call.getString("mime", "application/octet-stream");
            if (Build.VERSION.SDK_INT < 29) {
                call.reject("Android 10 이상에서만 저장할 수 있어요");
                return;
            }
            ContentResolver cr = getContext().getContentResolver();
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(MediaStore.MediaColumns.MIME_TYPE, mime);
            Uri col;
            if (mime.startsWith("video")) {
                col = MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, "Movies/캠스터디");
            } else if (mime.startsWith("image")) {
                col = MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, "Pictures/캠스터디");
            } else {
                col = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                v.put(MediaStore.MediaColumns.RELATIVE_PATH, "Download/캠스터디");
            }
            Uri uri = cr.insert(col, v);
            OutputStream os = cr.openOutputStream(uri);
            int id = next++;
            outs.put(id, os);
            JSObject r = new JSObject();
            r.put("id", id);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void saveChunk(PluginCall call) {
        try {
            OutputStream os = outs.get(call.getInt("id"));
            os.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    @PluginMethod
    public void saveEnd(PluginCall call) {
        try {
            OutputStream os = outs.remove(call.getInt("id"));
            if (os != null) os.close();
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }
}

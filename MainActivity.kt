package kios.bukukas

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var filePathCallback: android.webkit.ValueCallback<Array<android.net.Uri>>? = null
    private val FILE_CHOOSER_REQUEST_CODE = 12345

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Create WebView programmatically to keep it simple and avoid layout XML
        webView = WebView(this)
        setContentView(webView)

        // Configure WebView
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        
        // Add native storage interface
        webView.addJavascriptInterface(WebAppInterface(this, webView), "AndroidStorage")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: android.webkit.ValueCallback<Array<android.net.Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val intent = fileChooserParams?.createIntent() ?: android.content.Intent(android.content.Intent.ACTION_GET_CONTENT).apply {
                    type = "image/*"
                    addCategory(android.content.Intent.CATEGORY_OPENABLE)
                }

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    return false
                }
                return true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false
                if (url.startsWith("https://wa.me/") || url.startsWith("https://api.whatsapp.com/") || url.startsWith("whatsapp://") || url.startsWith("tel:") || url.startsWith("mailto:")) {
                    try {
                        val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }
                }
                return super.shouldOverrideUrlLoading(view, request)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                injectStorageInterface()
            }
        }

        // Load the local HTML file from assets
        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return
            val results = WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    private fun injectStorageInterface() {
        val js = """
            window.storage = {
                get: function(key, isGlobal) {
                    return new Promise(function(resolve, reject) {
                        try {
                            var jsonStr = AndroidStorage.get(key, !!isGlobal);
                            resolve(JSON.parse(jsonStr));
                        } catch(e) {
                            reject(e);
                        }
                    });
                },
                set: function(key, value, isGlobal) {
                    return new Promise(function(resolve, reject) {
                        try {
                            AndroidStorage.set(key, value, !!isGlobal);
                            resolve();
                        } catch(e) {
                            reject(e);
                        }
                    });
                }
            };
        """.trimIndent()
        webView.evaluateJavascript(js, null)
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    class WebAppInterface(private val activity: Activity, private val webView: WebView) {
        private val sharedPrefs = activity.getSharedPreferences("KiosPrefs", Context.MODE_PRIVATE)

        @JavascriptInterface
        fun printPage() {
            activity.runOnUiThread {
                try {
                    val printManager = activity.getSystemService(Context.PRINT_SERVICE) as android.print.PrintManager
                    val printAdapter = webView.createPrintDocumentAdapter("Laporan_Keuangan")
                    val jobName = "Laporan Uncen Fresh"
                    printManager.print(jobName, printAdapter, android.print.PrintAttributes.Builder().build())
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        @JavascriptInterface
        fun get(key: String, isGlobal: Boolean): String {
            val value = sharedPrefs.getString(key, null)
            val result = JSONObject()
            result.put("value", value)
            return result.toString()
        }

        @JavascriptInterface
        fun set(key: String, value: String, isGlobal: Boolean) {
            sharedPrefs.edit().putString(key, value).apply()
        }

        @JavascriptInterface
        fun openWhatsApp(phone: String, text: String) {
            activity.runOnUiThread {
                try {
                    val cleanPhone = phone.replace(Regex("[^0-9]"), "").replace(Regex("^0"), "62")
                    val url = if (cleanPhone.isNotEmpty()) {
                        "https://api.whatsapp.com/send?phone=$cleanPhone&text=${java.net.URLEncoder.encode(text, "UTF-8")}"
                    } else {
                        "https://api.whatsapp.com/send?text=${java.net.URLEncoder.encode(text, "UTF-8")}"
                    }
                    val intent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))
                    intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                    activity.startActivity(intent)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        @JavascriptInterface
        fun shareImage(base64Data: String, filename: String) {
            activity.runOnUiThread {
                try {
                    val cleanBase64 = if (base64Data.contains(",")) {
                        base64Data.substring(base64Data.indexOf(",") + 1)
                    } else {
                        base64Data
                    }
                    val imageBytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT)
                    
                    val cacheDir = java.io.File(activity.cacheDir, "shared_images")
                    if (!cacheDir.exists()) {
                        cacheDir.mkdirs()
                    }
                    val file = java.io.File(cacheDir, filename)
                    val fos = java.io.FileOutputStream(file)
                    fos.write(imageBytes)
                    fos.flush()
                    fos.close()

                    val uri = androidx.core.content.FileProvider.getUriForFile(
                        activity,
                        "kios.bukukas.fileprovider",
                        file
                    )

                    val shareIntent = android.content.Intent().apply {
                        action = android.content.Intent.ACTION_SEND
                        putExtra(android.content.Intent.EXTRA_STREAM, uri)
                        type = "image/png"
                        addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    
                    val chooser = android.content.Intent.createChooser(shareIntent, "Bagikan Gambar Ke:")
                    chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                    activity.startActivity(chooser)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }
}

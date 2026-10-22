# نشر GB Browser على App Store — كل شي مطلوب

## اللي سويته بالتطبيق (إجباري حسب قواعد أبل)
| القاعدة | شنو تطلب | الحالة |
|---|---|---|
| 5.1.1 | ما تجبر المستخدم يسوي حساب إذا التطبيق يشتغل بدونه | ✅ زر «المتابعة بدون حساب» بالآيفون |
| 5.1.1(v) | إذا اكو إنشاء حساب، لازم حذف الحساب من داخل التطبيق | ✅ الإعدادات ← الحساب ← حذف الحساب |
| 5.1.1(i) | رابط سياسة خصوصية داخل التطبيق وبالمتجر | ✅ PRIVACY.md + بالإعدادات وشاشة التسجيل |
| 2.5.2 | التطبيق ما يحدّث نفسه من برّا المتجر | ✅ نظام التحديث صار للأندرويد بس |
| 2.5.6 | المتصفحات لازم تستخدم WebKit | ✅ يستخدم WKWebView |
| Privacy Manifest | تصريح بالـ APIs الحساسة وجمع البيانات | ✅ بـ app.json (ما يجمع بيانات، ماكو تتبّع) |
| التشفير | تصريح التصدير | ✅ ITSAppUsesNonExemptEncryption = NO |
| أذونات | سبب الكاميرا/المايك/الموقع | ✅ مكتوبة (للمواقع اللي تطلبها) |
| معرّف فريد | Bundle ID | ✅ com.haydarsadiq.gbbrowser |

## اللي لازم تسويه إنت (ما ينسوّى من الكود)
1. **اشتراك Apple Developer Program** باسمك (developer.apple.com/programs) — سنوي مدفوع، والتفعيل ياخذ يوم إلى يومين.
2. **البناء والرفع:** من الكمبيوتر دبل كلك على `3-Publish-iPhone.bat` (بمجلد المشروع، بعد ما تنزل آخر نسخة من GitHub). يسجّل دخول Expo ثم حساب أبل، ويسوي الشهادات، ويبني ويرفع لـ App Store Connect.
3. **App Store Connect** (appstoreconnect.apple.com) ← تطبيقك:
   - **الاسم:** GB Browser (إذا محجوز: GB Browser – متصفح آمن)
   - **العنوان الفرعي:** متصفح آمن بالعربي
   - **الفئة:** Utilities (أدوات)
   - **رابط سياسة الخصوصية:** https://github.com/Haidar-Hacking/My-web-site/blob/main/PRIVACY.md
   - **رابط الدعم:** https://github.com/Haidar-Hacking/My-web-site/issues
   - **الصور:** الملفات اللي بمجلد `store/screenshots` (مقاس آيفون ٦٫٩ إنش، جاهزة)
   - **خصوصية التطبيق (App Privacy):** اختار **Data Not Collected**
   - **التصنيف العمري:** جاوب «Unrestricted Web Access» = **Yes** (كل المتصفحات لازم هيچ) — يطلع ١٨+ أو حسب أسئلة أبل الجديدة
   - **ملاحظات للمراجع (Review Notes):** انسخ النص اللي تحت
4. اضغط **Add for Review** ← **Submit**. المراجعة عادة ١–٣ أيام.

## الوصف (انسخه)
**عربي:**
GB Browser متصفح سريع وآمن مصمم بالعربي.
• محرك بحث Go Browser مع البحث الآمن دائماً
• درع يحجب الإعلانات والمتتبعات، وحجب المواقع الإباحية
• صفحة بداية بالساعة والتاريخ الهجري والطقس وحكمة اليوم
• تبويبات مرتبة وتصفح خاص
• وضع القراءة، ويقرالك المقال بصوت عالي
• آلة حاسبة واختصارات بحث بالشريط
• عربي وإنكليزي، فاتح وداكن
ما نجمع أي بيانات عنك، وكلشي يبقى على جهازك.

**كلمات البحث (Keywords):** متصفح,بحث,آمن,خصوصية,حجب الإعلانات,عربي,browser,private,adblock

## ملاحظات للمراجع (Review Notes)
The app does not require an account: tap «المتابعة بدون حساب» (Continue without an account) on the first screen. Accounts are stored only on the device and can be deleted in Settings → Account → Delete account. Search results come from DuckDuckGo with safe search forced on. No data is collected.

# Learning Journey — Cloud Edition

موقع متابعة الدراسة: الأمن السيبراني والذكاء الاصطناعي والإنجليزية.

## التشغيل والنشر
1. أنشئي مشروعًا في Firebase Console.
2. من Project Settings > Your apps، سجلي Web App وانسخي firebaseConfig إلى `firebase-config.js`.
3. من Authentication > Sign-in method، فعّلي Google.
4. من Firestore Database، أنشئي قاعدة بيانات (Production mode)، ثم الصقي محتوى `firestore.rules` في تبويب Rules وانشري القواعد.
5. أنشئي مستودع GitHub جديدًا وارفعي الملفات الأربعة الموجودة في هذا المجلد إلى جذر المستودع.
6. من Settings > Pages اختاري Deploy from a branch ثم main / (root).
7. من Firebase Authentication > Settings > Authorized domains، أضيفي نطاق موقعك المستضاف (مثل username.github.io).
8. افتحي رابط الموقع بعد نشره، واضغطي «تسجيل الدخول».

## ملاحظات
- يجب نشر الملفات على HTTPS؛ لا تعتمدي على فتح index.html محليًا لتشغيل Firebase.
- بيانات Firebase web config ليست سرية، لكن لا تضعي مفاتيح خدمة خاصة أو كلمات مرور في المستودع.
- قواعد Firestore تمنع المستخدمين من قراءة بيانات بعضهم.
- قبل تسجيل الدخول لأول مرة، خذي نسخة احتياطية من «تصدير تقدمي».
- في حال وجود تقدم مختلف على جهازين، بيانات السحابة تُعتمد عند تسجيل الدخول؛ ليست هناك آلية دمج تلقائي للتعديلات المتزامنة.
- في حال ظهور خطأ في المصادقة أو المزامنة، تحققي من إعدادات Firebase والنطاقات المصرح بها.

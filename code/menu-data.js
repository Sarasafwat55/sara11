/* =========================================================
   TOOT | توت — بيانات المنيو الافتراضية
   ---------------------------------------------------------
   ده الملف اللي بيظهر لكل الزوار.
   أي تعديل من لوحة "إدارة المنيو" بيتحفظ على جهازك بس،
   ولما تخلص اضغط "تحميل ملف المنيو للنشر" من اللوحة
   وارفع الملف الناتج مكان الملف ده على GitHub (code/menu-data.js).
   ========================================================= */
window.TOOT_DEFAULT = {
  "version": 1,
  "settings": {
    "name": "توت",
    "nameEn": "TOOT",
    "tagline": "جودة الملوك",
    "announcement": "",
    "whatsapp": "201270274606",
    "phone": "01270274606",
    "address": "مصر الجديدة، القاهرة",
    "mapUrl": "",
    "hours": "",
    "openFrom": "",
    "openTo": "",
    "currency": "ج.م",
    "deliveryFee": 0,
    "facebook": "",
    "instagram": "",
    "tiktok": "",
    "reels": [],
    "adminPin": ""
  },
  "categories": [
    { "id": "shawaya",  "name": "فراخ شواية" },
    { "id": "charcoal", "name": "فراخ على الفحم" },
    { "id": "oven",     "name": "فراخ فرن" },
    { "id": "fatta",    "name": "فتة" },
    { "id": "sandwich", "name": "سندوتشات" },
    { "id": "fries",    "name": "بطاطس" },
    { "id": "drinks",   "name": "مشروبات" }
  ],
  "products": [
    {
      "id": "p1", "cat": "shawaya", "name": "فرخة شواية توت",
      "desc": "فرخة متتبلة بخلطة توت السرية ومشوية على السيخ لحد ما تبقى دهبي ومقرمشة.",
      "image": "images/shawaya.jpg", "badge": "الأكثر طلبًا", "available": true,
      "price": 0,
      "sizes": [ { "name": "ربع", "price": 95 }, { "name": "نص", "price": 180 }, { "name": "فرخة كاملة", "price": 340 } ]
    },
    {
      "id": "p2", "cat": "shawaya", "name": "وجبة الملك — شواية",
      "desc": "نص فرخة شواية + رز بسمتي + بطاطس + سلطة + عيش + صوص توم.",
      "image": "images/shawaya.jpg", "badge": "", "available": true,
      "price": 230, "sizes": []
    },
    {
      "id": "p3", "cat": "charcoal", "name": "فرخة فحم توت",
      "desc": "مشوية على الفحم الطبيعي بتتبيلة البهارات المصرية وريحة الشوي الأصلية.",
      "image": "images/charcoal.jpg", "badge": "ملكي", "available": true,
      "price": 0,
      "sizes": [ { "name": "ربع", "price": 100 }, { "name": "نص", "price": 190 }, { "name": "فرخة كاملة", "price": 360 } ]
    },
    {
      "id": "p4", "cat": "charcoal", "name": "وجبة الفرعون — فحم",
      "desc": "نص فرخة فحم + رز + بطاطس ودجز + سلطة + عيش + صوصين.",
      "image": "images/charcoal.jpg", "badge": "", "available": true,
      "price": 240, "sizes": []
    },
    {
      "id": "p5", "cat": "oven", "name": "فرخة فرن بالأعشاب",
      "desc": "فرخة طرية متسوية في الفرن بالروزماري والزعتر والتوم، مع بطاطس محمرة.",
      "image": "images/oven.jpg", "badge": "", "available": true,
      "price": 0,
      "sizes": [ { "name": "نص", "price": 185 }, { "name": "فرخة كاملة", "price": 350 } ]
    },
    {
      "id": "p6", "cat": "oven", "name": "فرخة فرن ليمون وتوم",
      "desc": "تتبيلة ليمون وتوم وفلفل أسود، متسوية على مهلها في الفرن.",
      "image": "images/oven.jpg", "badge": "", "available": true,
      "price": 0,
      "sizes": [ { "name": "نص", "price": 185 }, { "name": "فرخة كاملة", "price": 350 } ]
    },
    {
      "id": "p7", "cat": "fatta", "name": "فتة فراخ بالخل والتوم",
      "desc": "رز وعيش محمص وصلصة خل وتوم، ومتغطية بقطع فراخ مشوية.",
      "image": "images/fatta.jpg", "badge": "", "available": true,
      "price": 0,
      "sizes": [ { "name": "صغير", "price": 120 }, { "name": "كبير", "price": 170 } ]
    },
    {
      "id": "p8", "cat": "fatta", "name": "فتة فراخ فحم",
      "desc": "فتة على الطريقة المصرية بقطع فراخ الفحم وصوص الطحينة.",
      "image": "images/fatta.jpg", "badge": "", "available": true,
      "price": 0,
      "sizes": [ { "name": "صغير", "price": 130 }, { "name": "كبير", "price": 180 } ]
    },
    {
      "id": "p9", "cat": "sandwich", "name": "سندوتش فراخ مشوية",
      "desc": "قطع فراخ مشوية + خس وطماطم + صوص توم في عيش سوري سخن.",
      "image": "images/sandwich.jpg", "badge": "", "available": true,
      "price": 75, "sizes": []
    },
    {
      "id": "p10", "cat": "sandwich", "name": "سندوتش فحم حار",
      "desc": "فراخ فحم متقطعة بصوص حار ومخلل وبطاطس جوه السندوتش.",
      "image": "images/sandwich.jpg", "badge": "حار", "available": true,
      "price": 80, "sizes": []
    },
    {
      "id": "p11", "cat": "sandwich", "name": "سندوتش توت سبيشيال",
      "desc": "دبل فراخ مشوية + جبنة شيدر + صوص توت الخاص.",
      "image": "images/sandwich.jpg", "badge": "جديد", "available": true,
      "price": 95, "sizes": []
    },
    {
      "id": "p12", "cat": "fries", "name": "بطاطس ودجز",
      "desc": "أصابع بطاطس بقشرها متتبلة ومقرمشة.",
      "image": "images/fries.jpg", "badge": "", "available": true,
      "price": 0,
      "sizes": [ { "name": "وسط", "price": 40 }, { "name": "كبير", "price": 55 } ]
    },
    {
      "id": "p13", "cat": "fries", "name": "بطاطس بالجبنة",
      "desc": "بطاطس محمرة عليها صوص جبنة شيدر سايح.",
      "image": "images/fries.jpg", "badge": "", "available": true,
      "price": 60, "sizes": []
    },
    {
      "id": "p14", "cat": "drinks", "name": "مشروب غازي",
      "desc": "كانز ساقع.",
      "image": "images/drinks.jpg", "badge": "", "available": true,
      "price": 25, "sizes": []
    },
    {
      "id": "p15", "cat": "drinks", "name": "ليمون نعناع",
      "desc": "ليمون فريش بالنعناع.",
      "image": "images/drinks.jpg", "badge": "", "available": true,
      "price": 45, "sizes": []
    },
    {
      "id": "p16", "cat": "drinks", "name": "مياه معدنية",
      "desc": "زجاجة صغيرة.",
      "image": "images/drinks.jpg", "badge": "", "available": true,
      "price": 10, "sizes": []
    }
  ]
};

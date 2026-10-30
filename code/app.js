/* =========================================================
   TOOT | توت — منطق الموقع
   المنيو بأقسام • شريط أقسام ذكي • بحث • سلة • طلب واتساب
   اقتراحات • إعادة الطلب • مفتوح/مقفول • تثبيت كتطبيق • لوحة إدارة
   ========================================================= */
(function () {
  'use strict';

  var DATA_KEY = 'toot_menu_v1';
  var CART_KEY = 'toot_cart_v1';
  var FORM_KEY = 'toot_customer_v1';
  var LAST_KEY = 'toot_last_order_v1';
  var PLACEHOLDER = 'images/placeholder.jpg';

  /* ---------- Storage (آمن لو التخزين مقفول) ---------- */
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { toast('مساحة التخزين مليانة — جرّب صورة أصغر'); return false; }
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var BASE_KEY = 'toot_menu_base_v1';     // بصمة ملف المنيو المنشور اللي اتبنت عليه التعديلات المحلية
  var BACKUP_KEY = 'toot_menu_local_backup_v1';

  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return String(h); }

  var DEFAULT = window.TOOT_DEFAULT || { settings: {}, categories: [], products: [] };
  var BASE_HASH = hashStr(JSON.stringify(DEFAULT));
  var stored = load(DATA_KEY, null);
  var storedBase = load(BASE_KEY, null);
  var publishedUpdated = false;
  // لو اترفع ملف منيو جديد على GitHub، الجهاز اللي عليه تعديلات قديمة ياخد النسخة المنشورة
  // (والنسخة المحلية القديمة بتتحفظ احتياطي)
  var olderFormat = stored && (Number(stored.version) || 1) < (Number(DEFAULT.version) || 1);
  if (stored && ((storedBase && storedBase !== BASE_HASH) || olderFormat)) {
    save(BACKUP_KEY, stored);
    try { localStorage.removeItem(DATA_KEY); } catch (e) {}
    stored = null; publishedUpdated = true;
  }
  if (!storedBase || publishedUpdated) save(BASE_KEY, BASE_HASH);
  var data = stored || clone(DEFAULT);
  data.settings = Object.assign({}, DEFAULT.settings, data.settings || {});
  var cart = load(CART_KEY, []);
  var state = { q: '', picks: {}, activeCat: null, sent: false };

  /* ---------- Utils ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return Number(n || 0).toLocaleString('ar-EG'); }
  function cur() { return data.settings.currency || 'ج.م'; }
  function money(n) { return num(n) + ' ' + cur(); }
  function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function catName(id) { var c = data.categories.find(function (x) { return x.id === id; }); return c ? c.name : ''; }
  function findProduct(id) { return data.products.find(function (p) { return p.id === id; }); }
  function imgSrc(p) { return (p && p.image) || PLACEHOLDER; }
  function persistData() { save(DATA_KEY, data); save(BASE_KEY, BASE_HASH); }
  function zones() {
    return (data.settings.zones || []).filter(function (z) { return z && z.name; });
  }
  function payments() {
    return (data.settings.payments || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
  }
  function norm(s) { // بحث عربي متسامح: يوحّد الألف والتاء المربوطة والياء ويشيل التشكيل
    return String(s || '').toLowerCase()
      .replace(/[ً-ْـ]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  }
  function imgTag(src, alt, extra) {
    return '<img src="' + esc(src) + '" alt="' + esc(alt || '') + '" ' + (extra || '') + ' onerror="this.onerror=null;this.src=\'' + PLACEHOLDER + '\'">';
  }

  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-show'); }, 2200);
  }

  /* =========================================================
     مفتوح / مقفول (من مواعيد العمل في الإعدادات)
     ========================================================= */
  function toMin(t) { var m = String(t || '').match(/^(\d{1,2}):(\d{2})$/); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function fmtTime(t) {
    var m = toMin(t); if (m == null) return '';
    var h = Math.floor(m / 60) % 24, mm = m % 60;
    var period = h < 12 ? 'ص' : 'م';
    var h12 = h % 12 || 12;
    return num(h12) + (mm ? ':' + String(mm).padStart(2, '0') : '') + ' ' + period;
  }
  function openState() {
    var a = toMin(data.settings.openFrom), b = toMin(data.settings.openTo);
    if (a == null || b == null) return null;
    var d = new Date(), now = d.getHours() * 60 + d.getMinutes();
    var open = a <= b ? (now >= a && now < b) : (now >= a || now < b);
    return { open: open, from: fmtTime(data.settings.openFrom), to: fmtTime(data.settings.openTo) };
  }
  function renderStatus() {
    var st = openState(), pill = $('#statusPill');
    if (!st) { pill.hidden = true; $('#closedNotice').hidden = true; return; }
    pill.hidden = false;
    pill.classList.toggle('is-closed', !st.open);
    pill.textContent = st.open ? 'مفتوح دلوقتي' : 'مقفول — بنفتح ' + st.from;
    $('#closedNotice').hidden = st.open;
    $('#closedNotice').textContent = 'إحنا مقفولين دلوقتي — تقدر تبعت طلبك وهنأكده أول ما نفتح الساعة ' + st.from + '.';
  }

  /* =========================================================
     الموقع العام
     ========================================================= */
  function waLink(text) {
    var n = String(data.settings.whatsapp || '').replace(/\D/g, '');
    return 'https://wa.me/' + n + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  function renderSettings() {
    var s = data.settings;
    var ann = s.announcement || '';
    $('#announce').hidden = !ann;
    document.body.classList.toggle('has-announce', !!ann);
    $('#announceText').textContent = ann;
    $('#year').textContent = new Date().getFullYear();
    $('#footerWhatsapp').href = waLink('');
    $$('[data-wa]').forEach(function (a) { a.href = waLink('السلام عليكم، عايز أطلب من توت'); a.target = '_blank'; a.rel = 'noopener'; });

    var icons = {
      phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
      wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/><path d="M8.5 8.5c0 4 3 7 7 7l1.5-1.5-2-1.5-1 1c-1.5-.5-3-2-3.5-3.5l1-1-1.5-2z"/></svg>',
      pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
      clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
    };
    var items = [];
    if (s.phone) items.push('<li class="contact__item">' + icons.phone + '<div><span>اتصل بينا</span><a href="tel:' + esc(s.phone.replace(/\s/g, '')) + '" dir="ltr">' + esc(s.phone) + '</a></div></li>');
    if (s.whatsapp) items.push('<li class="contact__item">' + icons.wa + '<div><span>واتساب</span><a href="' + esc(waLink('')) + '" target="_blank" rel="noopener">ابعتلنا رسالة</a></div></li>');
    if (s.address) {
      var map = s.mapUrl || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent((s.nameEn || 'TOOT') + ' ' + s.address));
      items.push('<li class="contact__item">' + icons.pin + '<div><span>العنوان</span><a href="' + esc(map) + '" target="_blank" rel="noopener">' + esc(s.address) + '</a></div></li>');
    }
    var hours = s.hours || (toMin(s.openFrom) != null && toMin(s.openTo) != null ? 'يوميًا من ' + fmtTime(s.openFrom) + ' لـ ' + fmtTime(s.openTo) : '');
    if (hours) items.push('<li class="contact__item">' + icons.clock + '<div><span>مواعيد العمل</span><b>' + esc(hours) + '</b></div></li>');
    $('#contactList').innerHTML = items.join('');

    var soc = {
      facebook: '<svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg>',
      instagram: '<svg viewBox="0 0 24 24"><path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5.5-1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/></svg>',
      tiktok: '<svg viewBox="0 0 24 24"><path d="M15 3c.4 2.4 1.9 4 4 4.3v3.2a7.5 7.5 0 0 1-4-1.3V15a6 6 0 1 1-6-6v3.3A2.7 2.7 0 1 0 11.7 15V3H15z"/></svg>'
    };
    var labels = { facebook: 'فيسبوك', instagram: 'إنستجرام', tiktok: 'تيك توك' };
    $('#socialLinks').innerHTML = ['facebook', 'instagram', 'tiktok'].filter(function (k) { return s[k]; }).map(function (k) {
      return '<a href="' + esc(s[k]) + '" target="_blank" rel="noopener" aria-label="' + labels[k] + '">' + soc[k] + '</a>';
    }).join('');

    renderReels();
    renderStatus();
  }

  /* ---------- الريلز: إنستجرام / تيك توك / يوتيوب شورتس / mp4 ---------- */
  function reelEmbed(url) {
    url = String(url || '').trim();
    var m;
    if ((m = url.match(/instagram\.com\/(?:reel|reels|p)\/([A-Za-z0-9_-]+)/))) return '<iframe src="https://www.instagram.com/reel/' + m[1] + '/embed" loading="lazy" allowfullscreen title="ريل توت"></iframe>';
    if ((m = url.match(/tiktok\.com\/.*video\/(\d+)/))) return '<iframe src="https://www.tiktok.com/embed/v2/' + m[1] + '" loading="lazy" allowfullscreen title="فيديو توت"></iframe>';
    if ((m = url.match(/(?:youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/))) return '<iframe src="https://www.youtube.com/embed/' + m[1] + '" loading="lazy" allowfullscreen title="فيديو توت"></iframe>';
    if (/\.(mp4|webm)(\?|$)/i.test(url)) return '<video src="' + esc(url) + '" controls playsinline preload="metadata" muted loop></video>';
    return '';
  }
  function renderReels() {
    var list = (data.settings.reels || []).map(reelEmbed).filter(Boolean);
    $('#reels').hidden = list.length === 0;
    $('#reelsGrid').innerHTML = list.map(function (h) { return '<div class="reel">' + h + '</div>'; }).join('');
  }

  /* ---------- المنيو بأقسام ---------- */
  function visibleProducts() {
    var q = norm(state.q.trim());
    return data.products.filter(function (p) {
      if (!q) return true;
      return norm(p.name + ' ' + (p.desc || '') + ' ' + catName(p.cat)).indexOf(q) !== -1;
    });
  }
  function catsWithItems(list) {
    return data.categories.map(function (c) {
      return { cat: c, items: list.filter(function (p) { return p.cat === c.id; }) };
    }).filter(function (g) { return g.items.length; });
  }

  function renderChips(groups) {
    $('#categoryChips').innerHTML = groups.map(function (g) {
      var on = state.activeCat === g.cat.id;
      return '<button type="button" role="tab" class="chip' + (on ? ' is-active' : '') + '" aria-selected="' + on + '" data-cat="' + esc(g.cat.id) + '">' + esc(g.cat.name) + ' <small>' + num(g.items.length) + '</small></button>';
    }).join('');
    $('#quickCats').innerHTML = data.categories.slice(0, 7).map(function (c) {
      return '<a href="#cat-' + esc(c.id) + '" data-jump="' + esc(c.id) + '">' + esc(c.name) + '</a>';
    }).join('');
    $$('#quickCats a').forEach(function (a, i) { a.style.setProperty('--i', i); });
  }

  function currentPrice(p) {
    if (p.sizes && p.sizes.length) {
      var i = Math.min(state.picks[p.id] || 0, p.sizes.length - 1);
      var sz = p.sizes[i];
      return { price: Number(sz.price) || 0, size: sz.name, index: i };
    }
    return { price: Number(p.price) || 0, size: '', index: -1 };
  }
  function lineKey(pid, size, note) { return pid + '|' + (size || '') + (note ? '|' + note : ''); }
  function qtyOf(key) { var l = cart.find(function (x) { return x.key === key; }); return l ? l.qty : 0; }

  function highlight(text) {
    var q = state.q.trim();
    var safe = esc(text);
    if (!q) return safe;
    var i = norm(text).indexOf(norm(q));
    if (i < 0) return safe;
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function cardHTML(p) {
    var cp = currentPrice(p);
    var off = p.available === false;
    var sizes = '';
    if (p.sizes && p.sizes.length) {
      sizes = '<div class="sizes-pick" role="radiogroup" aria-label="اختار الحجم">' + p.sizes.map(function (s, i) {
        return '<button type="button" role="radio" aria-checked="' + (i === cp.index) + '" class="size-chip' + (i === cp.index ? ' is-active' : '') + '" data-size="' + i + '" data-pid="' + esc(p.id) + '">' + esc(s.name) + '</button>';
      }).join('') + '</div>';
    }
    var key = lineKey(p.id, cp.size), q = qtyOf(key);
    var action = q
      ? '<div class="stepper" aria-label="الكمية"><button type="button" data-step="1" data-key="' + esc(key) + '" aria-label="زيادة">+</button><b>' + num(q) + '</b><button type="button" data-step="-1" data-key="' + esc(key) + '" aria-label="تقليل">−</button></div>'
      : '<button type="button" class="add-btn" data-add="' + esc(p.id) + '"' + (off ? ' disabled' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>أضف</button>';
    return '<article class="card' + (off ? ' is-off' : '') + '" data-pid="' + esc(p.id) + '">' +
      '<div class="card__media" data-qv="' + esc(p.id) + '" role="button" tabindex="0" aria-label="تفاصيل ' + esc(p.name) + '">' + imgTag(imgSrc(p), p.name, 'loading="lazy" width="720" height="500"') +
        (p.badge ? '<span class="card__badge">' + esc(p.badge) + '</span>' : '') +
        (off ? '<span class="card__soldout">غير متاح حاليًا</span>' : '') +
      '</div>' +
      '<div class="card__body">' +
        '<h4 class="card__title"><button type="button" class="card__open" data-qv="' + esc(p.id) + '">' + highlight(p.name) + '</button></h4>' +
        (p.desc ? '<p class="card__desc">' + esc(p.desc) + '</p>' : '') +
        sizes +
        '<div class="card__foot"><span class="price">' + num(cp.price) + '<small>' + esc(cur()) + '</small></span>' + action + '</div>' +
      '</div></article>';
  }

  var spy;
  function renderMenu() {
    var groups = catsWithItems(visibleProducts());
    if (!state.activeCat || !groups.some(function (g) { return g.cat.id === state.activeCat; })) state.activeCat = groups[0] ? groups[0].cat.id : null;
    $('#menuSections').innerHTML = groups.map(function (g) {
      return '<section class="menu-cat" id="cat-' + esc(g.cat.id) + '" data-cat-section="' + esc(g.cat.id) + '">' +
        '<div class="menu-cat__head"><h3>' + esc(g.cat.name) + '</h3><span>' + num(g.items.length) + ' صنف</span></div>' +
        '<div class="grid">' + g.items.map(cardHTML).join('') + '</div></section>';
    }).join('');
    $('#emptyState').hidden = groups.length > 0;
    renderChips(groups);
    setupSpy();
    observeReveal();
  }
  function refreshCards() { // تحديث خفيف من غير ما نعيد بناء الأقسام
    $$('#menuSections .card').forEach(function (el) {
      var p = findProduct(el.dataset.pid);
      if (p) el.outerHTML = cardHTML(p);
    });
  }

  function setActiveChip(id, scrollChip) {
    state.activeCat = id;
    $$('#categoryChips .chip').forEach(function (c) {
      var on = c.dataset.cat === id;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-selected', on);
      if (on && scrollChip) {
        var box = $('#categoryChips');
        var target = c.offsetLeft - (box.clientWidth - c.clientWidth) / 2;
        box.scrollTo({ left: target, behavior: 'smooth' });
      }
    });
  }
  var spyLock = 0;
  function setupSpy() {
    if (spy) spy.disconnect();
    if (!('IntersectionObserver' in window)) return;
    var offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) + $('#menuBar').offsetHeight + 20;
    spy = new IntersectionObserver(function (entries) {
      if (Date.now() < spyLock) return;
      entries.forEach(function (e) { if (e.isIntersecting) setActiveChip(e.target.dataset.catSection, true); });
    }, { rootMargin: '-' + offset + 'px 0px -55% 0px', threshold: 0 });
    $$('[data-cat-section]').forEach(function (s) { spy.observe(s); });
  }
  function jumpToCat(id) {
    if (state.q) { state.q = ''; $('#searchInput').value = ''; $('#searchClear').hidden = true; $('.search').classList.remove('has-q'); renderMenu(); }
    var sec = document.getElementById('cat-' + id);
    if (!sec) return;
    spyLock = Date.now() + 900;
    setActiveChip(id, true);
    sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------- ظهور العناصر مع النزول ---------- */
  var revealIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  var REVEAL_SEL = '.section-head, .feature, .menu-cat__head, .card, .cta__inner, .contact__item, .footer__brand, .reel, .glyph-strip + .features';
  function observeReveal() {
    if (!revealIO) return;
    var groups = {};
    $$(REVEAL_SEL).forEach(function (el) {
      if (el.classList.contains('reveal')) return;
      var parent = el.parentElement, key = parent ? (parent.id || parent.className) : '';
      groups[key] = (groups[key] || 0) + 1;
      el.classList.add('reveal');
      if (el.matches('.menu-cat__head, .section-head--start')) el.classList.add('reveal--side');
      el.style.setProperty('--d', Math.min((groups[key] - 1) * 80, 400) + 'ms');
      revealIO.observe(el);
    });
  }

  /* ---------- الصنف بيطير للسلة ---------- */
  function flyToCart(srcEl) {
    if (!srcEl || !srcEl.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var card = srcEl.closest('.card, .upsell__item');
    var img = card && card.querySelector('img');
    var target = [ $('.cart-btn'), $('.bottom-nav__cart') ].filter(function (el) { return el && el.offsetParent !== null; })[0];
    if (!img || !target) return;
    var a = img.getBoundingClientRect(), b = target.getBoundingClientRect();
    var size = Math.min(a.width, 120);
    var fly = document.createElement('img');
    fly.src = img.currentSrc || img.src; fly.className = 'fly-img'; fly.alt = '';
    fly.style.width = size + 'px'; fly.style.height = size * .75 + 'px';
    fly.style.left = (a.left + a.width / 2 - size / 2) + 'px'; fly.style.top = (a.top + a.height / 2 - size * .375) + 'px';
    document.body.appendChild(fly);
    var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
    var anim = fly.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx * .5 + 'px,' + (dy * .5 - 80) + 'px) scale(.7) rotate(-12deg)', opacity: 1, offset: .5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.15) rotate(-25deg)', opacity: .3 }
    ], { duration: 750, easing: 'cubic-bezier(.4,.1,.3,1)' });
    anim.onfinish = function () {
      fly.remove();
      target.classList.remove('got'); void target.offsetWidth; target.classList.add('got');
    };
  }

  /* ---------- السلة ---------- */
  function selectedZone() {
    var v = ($('#orderForm').zone || {}).value;
    if (v === '' || v == null) return null;
    return zones()[Number(v)] || null;
  }
  function cartTotals() {
    var sub = cart.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
    var type = ($('input[name="type"]:checked') || {}).value || 'delivery';
    var zs = zones(), zone = selectedZone();
    var fee = 0, needZone = false;
    if (type === 'delivery' && cart.length) {
      if (zs.length) { if (zone) fee = Number(zone.fee) || 0; else needZone = true; }
      else fee = Number(data.settings.deliveryFee) || 0;
    }
    var freeOver = Number(data.settings.freeOver) || 0;
    var freeLeft = 0;
    if (type === 'delivery' && freeOver > 0 && cart.length) {
      if (sub >= freeOver) { fee = 0; needZone = false; } else freeLeft = freeOver - sub;
    }
    var min = Number(data.settings.minOrder) || 0;
    var short = (type === 'delivery' && min > 0 && sub < min) ? min - sub : 0;
    return { freeOver: freeOver, freeLeft: freeLeft, sub: sub, fee: fee, total: sub + fee, count: cart.reduce(function (a, l) { return a + l.qty; }, 0), type: type, zone: zone, needZone: needZone, short: short, min: min };
  }
  function renderOrderOptions() {
    var zs = zones(), sel = $('#orderForm').zone, saved = load(FORM_KEY, {}) || {};
    var prev = sel.value !== '' ? zs[Number(sel.value)] : null;
    var keepName = prev ? prev.name : saved.zone;
    sel.innerHTML = '<option value="">اختار منطقتك…</option>' + zs.map(function (z, i) {
      var fee = Number(z.fee) || 0;
      return '<option value="' + i + '">' + esc(z.name) + ' — ' + (fee ? money(fee) : 'توصيل مجاني') + '</option>';
    }).join('');
    var idx = zs.findIndex(function (z) { return z.name === keepName; });
    sel.value = idx >= 0 ? String(idx) : '';
    var pays = payments(), box = $('#payOpts');
    var current = ($('input[name="pay"]:checked') || {}).value || saved.pay;
    if (pays.indexOf(current) < 0) current = pays[0];
    $('#payField').hidden = pays.length < 2;
    box.innerHTML = pays.map(function (p) {
      return '<label><input type="radio" name="pay" value="' + esc(p) + '"' + (p === current ? ' checked' : '') + '><span>' + esc(p) + '</span></label>';
    }).join('');
  }
  function bump() {
    $$('[data-cart-count]').forEach(function (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  }
  function addToCart(pid, sizeIndex, qty, note, silent) {
    var p = findProduct(pid);
    if (!p || p.available === false) return;
    if (sizeIndex != null) state.picks[pid] = sizeIndex;
    qty = Math.max(1, qty || 1); note = String(note || '').trim();
    var cp = currentPrice(p);
    var key = lineKey(pid, cp.size, note);
    var line = cart.find(function (l) { return l.key === key; });
    if (line) line.qty += qty;
    else cart.push({ key: key, id: pid, name: p.name, size: cp.size, price: cp.price, image: imgSrc(p), qty: qty, note: note });
    state.sent = false;
    save(CART_KEY, cart);
    if (silent) return;
    renderCart(); refreshCards(); bump();
    toast('اتضاف ' + (qty > 1 ? num(qty) + ' × ' : '') + p.name + (cp.size ? ' (' + cp.size + ')' : ''));
  }
  function changeQty(key, d) {
    var line = cart.find(function (l) { return l.key === key; });
    if (!line) return;
    line.qty += d;
    if (line.qty <= 0) cart = cart.filter(function (l) { return l.key !== key; });
    state.sent = false;
    save(CART_KEY, cart);
    renderCart(); refreshCards();
  }

  function upsellItems() {
    if (!cart.length) return [];
    var inCartCats = {};
    cart.forEach(function (l) { var p = findProduct(l.id); if (p) inCartCats[p.cat] = 1; });
    var prefer = ['fries', 'drinks', 'sandwich', 'fatta'];
    var out = [];
    prefer.concat(data.categories.map(function (c) { return c.id; })).forEach(function (cid) {
      if (out.length >= 4 || inCartCats[cid] || out.some(function (p) { return p.cat === cid; })) return;
      var p = data.products.find(function (x) { return x.cat === cid && x.available !== false; });
      if (p) out.push(p);
    });
    return out;
  }

  function renderCart() {
    var t = cartTotals();
    $$('[data-cart-count]').forEach(function (el) { el.textContent = num(t.count); el.hidden = t.count === 0; });
    $$('[data-cart-total]').forEach(function (el) { animateMoney(el, t.total); });
    $('.cart-btn__total').hidden = t.count === 0;
    $('#cartBar').hidden = t.count === 0;
    document.body.classList.toggle('has-cart', t.count > 0);
    $('#subTotal').textContent = money(t.sub);
    var hasZones = zones().length > 0;
    $('#deliveryTotal').textContent = (t.freeOver && !t.freeLeft) ? 'مجاني 🎉' : (t.needZone ? 'اختار المنطقة' : (t.fee ? money(t.fee) : 'مجاني'));
    $('#deliveryRow').hidden = !(t.type === 'delivery' && (hasZones || Number(data.settings.deliveryFee) > 0));
    var empty = cart.length === 0;
    $('#cartEmpty').hidden = !empty;
    $('#orderForm').hidden = empty;
    $('#drawerFoot').hidden = empty;
    $('#addressField').hidden = t.type !== 'delivery';
    $('#zoneField').hidden = !(t.type === 'delivery' && hasZones);
    $('#minNote').hidden = !t.short;
    $('#minNote').textContent = t.short ? 'الحد الأدنى للتوصيل ' + money(t.min) + ' — ضيف أصناف بـ ' + money(t.short) + ' كمان، أو اختار الاستلام من الفرع.' : '';
    $('#sendOrder').disabled = !!t.short;
    $('#sentBox').hidden = !state.sent || empty;
    var showFree = t.type === 'delivery' && t.freeOver > 0 && !empty;
    $('#freeBar').hidden = !showFree;
    if (showFree) {
      $('#freeBar').classList.toggle('is-done', !t.freeLeft);
      $('#freeText').innerHTML = t.freeLeft ? 'فاضلك <b>' + money(t.freeLeft) + '</b> وتاخد <b>التوصيل مجاني</b> 🛵' : '👑 مبروك! <b>التوصيل عليك مجاني</b>';
      $('#freeFill').style.width = Math.min(100, t.sub / t.freeOver * 100) + '%';
    }
    var last = load(LAST_KEY, null);
    $('#reorderBtn').hidden = !(empty && last && last.length);
    $('#cartList').innerHTML = cart.map(function (l) {
      return '<li class="cart-line">' + imgTag(l.image, '') +
        '<div><h4>' + esc(l.name) + '</h4>' + (l.size ? '<small>' + esc(l.size) + '</small><br>' : '') + (l.note ? '<small class="line-note">✎ ' + esc(l.note) + '</small><br>' : '') +
        '<span class="line-price">' + money(l.price * l.qty) + '</span></div>' +
        '<div class="stepper"><button type="button" data-step="1" data-key="' + esc(l.key) + '" aria-label="زيادة">+</button><b>' + num(l.qty) + '</b>' +
        '<button type="button" data-step="-1" data-key="' + esc(l.key) + '" aria-label="تقليل">−</button></div></li>';
    }).join('');
    var ups = upsellItems();
    $('#upsell').hidden = ups.length === 0;
    $('#upsellList').innerHTML = ups.map(function (p) {
      return '<button type="button" class="upsell__item" data-add="' + esc(p.id) + '">' + imgTag(imgSrc(p), '') +
        '<span>' + esc(p.name) + '<small>+ ' + money(currentPrice(p).price) + '</small></span></button>';
    }).join('');
  }

  function reorder() {
    var last = load(LAST_KEY, []) || [];
    var added = 0;
    last.forEach(function (l) {
      var p = findProduct(l.id);
      if (!p || p.available === false) return;
      var price = Number(p.price) || 0;
      if (l.size && p.sizes) { var s = p.sizes.find(function (x) { return x.name === l.size; }); if (!s) return; price = Number(s.price) || 0; }
      cart.push({ key: lineKey(p.id, l.size, l.note), id: p.id, name: p.name, size: l.size, price: price, image: imgSrc(p), qty: l.qty, note: l.note || '' });
      added++;
    });
    save(CART_KEY, cart); renderCart(); refreshCards();
    toast(added ? 'رجّعنالك طلبك اللي فات بالأسعار الحالية' : 'الأصناف دي مش متاحة دلوقتي');
  }

  function sendOrder() {
    var f = $('#orderForm'), err = $('#formError'), t = cartTotals();
    var name = f.name.value.trim(), phone = f.phone.value.trim(), address = f.address.value.trim(), notes = f.notes.value.trim();
    if (!cart.length) return;
    if (!name) { err.textContent = 'اكتب اسمك من فضلك'; f.name.focus(); return; }
    var digits = phone.replace(/[^\d+]/g, '');
    if (!/^\+?\d{8,15}$/.test(digits)) { err.textContent = 'اكتب رقم موبايل صحيح'; f.phone.focus(); return; }
    if (t.type === 'delivery' && zones().length && !t.zone) { err.textContent = 'اختار منطقة التوصيل'; f.zone.focus(); return; }
    if (t.type === 'delivery' && !address) { err.textContent = 'اكتب العنوان علشان التوصيل'; f.address.focus(); return; }
    if (t.short) { err.textContent = 'الطلب أقل من الحد الأدنى للتوصيل'; return; }
    err.textContent = '';
    var pay = ($('input[name="pay"]:checked') || {}).value || payments()[0] || '';
    save(FORM_KEY, { name: name, phone: phone, address: address, zone: t.zone ? t.zone.name : '', pay: pay });
    save(LAST_KEY, cart.map(function (l) { return { id: l.id, size: l.size, qty: l.qty, note: l.note || '' }; }));

    var d = new Date();
    var ref = 'T' + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(Math.floor(1000 + Math.random() * 9000));
    var st = openState();
    var lines = cart.map(function (l, i) {
      return (i + 1) + '. ' + l.name + (l.size ? ' (' + l.size + ')' : '') + ' × ' + l.qty + ' = ' + money(l.price * l.qty) + (l.note ? '\n   ↳ ' + l.note : '');
    });
    var msg = [
      '👑 طلب جديد من موقع ' + (data.settings.name || 'توت'),
      'رقم الطلب: ' + ref,
      '',
      lines.join('\n'),
      '',
      'الأصناف: ' + money(t.sub),
      t.type === 'delivery' && (t.fee || t.zone) ? 'التوصيل: ' + (t.fee ? money(t.fee) : 'مجاني') : null,
      'الإجمالي: ' + money(t.total),
      pay ? 'الدفع: ' + pay : null,
      '',
      'الاسم: ' + name,
      'الموبايل: ' + phone,
      'الاستلام: ' + (t.type === 'delivery' ? 'توصيل' : 'استلام من الفرع'),
      t.type === 'delivery' && t.zone ? 'المنطقة: ' + t.zone.name : null,
      t.type === 'delivery' ? 'العنوان: ' + address : null,
      notes ? 'ملاحظات: ' + notes : null,
      st && !st.open ? '(الطلب اتبعت والمحل مقفول)' : null
    ].filter(function (x) { return x !== null; }).join('\n');

    window.open(waLink(msg), '_blank', 'noopener');
    state.sent = true;
    renderCart();
  }
  function newOrder() {
    cart = []; state.sent = false;
    save(CART_KEY, cart);
    $('#orderForm').notes.value = '';
    renderCart(); refreshCards();
    toast('السلة فضيت — اطلب براحتك');
  }

  /* ---------- مزامنة السلة مع المنيو الحالي (الأسعار والأحجام) ---------- */
  function syncCart() {
    cart = cart.filter(function (l) {
      var p = findProduct(l.id);
      if (!p || p.available === false) return false;
      var hasSizes = p.sizes && p.sizes.length;
      if (l.size) {
        if (!hasSizes) return false;
        var s = p.sizes.find(function (x) { return x.name === l.size; });
        if (!s) return false;
        l.price = Number(s.price) || 0;
      } else {
        if (hasSizes) return false;
        l.price = Number(p.price) || 0;
      }
      l.name = p.name; l.image = imgSrc(p);
      return true;
    });
    save(CART_KEY, cart);
  }

  /* ---------- عارض الصور بالحجم الكامل ---------- */
  function openLightbox(src, alt) {
    var d = $('#lightbox'), img = $('#lightboxImg');
    img.src = src; img.alt = alt || '';
    if (d.showModal) d.showModal(); else window.open(src, '_blank');
  }
  function closeLightbox() { var d = $('#lightbox'); if (d.open) d.close(); }
  $('#lightbox').addEventListener('click', function (e) { if (e.target === this) closeLightbox(); });

  /* ---------- الأدراج ---------- */
  var lastFocus = null;
  function openDrawer(el) {
    closeDrawers(true);
    lastFocus = document.activeElement;
    el.classList.add('is-open');
    el.setAttribute('aria-hidden', 'false');
    $('#overlay').hidden = false;
    document.documentElement.style.overflow = 'hidden';
    if (window.matchMedia('(min-width: 761px)').matches) {
      var first = el.querySelector('.drawer__head button');
      if (first) setTimeout(function () { first.focus(); }, 60);
    }
    if (el.id === 'cartDrawer' && location.hash !== '#cart') history.pushState({ drawer: 1 }, '', '#cart');
  }
  function closeDrawers(silent) {
    var wasOpen = $$('.drawer.is-open, .admin.is-open').length > 0;
    $$('.drawer, .admin').forEach(function (d) { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); });
    $('#overlay').hidden = true;
    document.documentElement.style.overflow = '';
    if (!silent && wasOpen && location.hash === '#cart') history.replaceState(null, '', location.pathname + location.search);
    if (!silent && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  window.addEventListener('popstate', function () { if (location.hash !== '#cart') closeDrawers(true); });

  /* ---------- شريط التنقل السفلي: تمييز القسم الحالي ---------- */
  function setupNavSpy() {
    if (!('IntersectionObserver' in window)) return;
    var map = { home: '#home', menu: '#menu', contact: '#contact' };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        $$('.bottom-nav [data-nav]').forEach(function (a) { a.classList.toggle('is-active', a.dataset.nav === id); });
        $$('.nav a').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === '#' + id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(map).forEach(function (k) { var el = $(map[k]); if (el) io.observe(el); });
  }

  /* =========================================================
     لوحة الإدارة
     ========================================================= */
  var adminUnlocked = false;
  // الرمز بيتخزن مشفّر (SHA-256) — محدش يقدر يعرفه من ملف المنيو
  function sha256(text) {
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode('toot|' + text)).then(function (buf) {
      return 'sha256:' + Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }
  function checkPin(input) {
    var stored = String(data.settings.adminPin || '');
    if (stored.indexOf('sha256:') !== 0) return Promise.resolve(input === stored);
    return sha256(input).then(function (h) { return h === stored; });
  }
  function openAdmin() {
    var pin = String(data.settings.adminPin || '');
    var locked = pin && !adminUnlocked;
    $('#adminLock').hidden = !locked;
    $('#adminContent').hidden = locked;
    $('#productEditor').hidden = true;
    if (!locked) renderAdmin();
    openDrawer($('#adminPanel'));
    if (locked) setTimeout(function () { $('#pinInput').focus(); }, 60);
  }
  function renderAdmin() { renderAdminProducts(); renderAdminCats(); renderSettingsForm(); }

  function catOptions(selected, withAll) {
    return (withAll ? '<option value="all">كل الأقسام</option>' : '') + data.categories.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
  }
  var adminFilter = 'all';
  function priceLabel(p) {
    if (p.sizes && p.sizes.length) return p.sizes.map(function (s) { return s.name + ' ' + num(s.price); }).join(' • ');
    return money(p.price);
  }
  function renderAdminProducts() {
    $('#adminFilter').innerHTML = catOptions(adminFilter, true);
    $('#adminFilter').value = adminFilter;
    var list = data.products.filter(function (p) { return adminFilter === 'all' || p.cat === adminFilter; });
    $('#adminProducts').innerHTML = list.length ? list.map(function (p) {
      return '<li class="admin-item' + (p.available === false ? ' is-off' : '') + '">' + imgTag(imgSrc(p), '') +
        '<div><h4>' + esc(p.name) + '</h4><small>' + esc(catName(p.cat)) + ' — ' + esc(priceLabel(p)) + '</small></div>' +
        '<div class="admin-item__actions">' +
          '<button type="button" class="mini" data-toggle="' + esc(p.id) + '">' + (p.available === false ? 'إظهار' : 'إخفاء') + '</button>' +
          '<button type="button" class="mini" data-edit="' + esc(p.id) + '">تعديل</button>' +
          '<button type="button" class="mini" data-dup="' + esc(p.id) + '">نسخ</button>' +
          '<button type="button" class="mini mini--danger" data-del="' + esc(p.id) + '">حذف</button>' +
        '</div></li>';
    }).join('') : '<li class="empty">مفيش منتجات في القسم ده.</li>';
  }
  function renderAdminCats() {
    $('#adminCats').innerHTML = data.categories.map(function (c, i) {
      var count = data.products.filter(function (p) { return p.cat === c.id; }).length;
      return '<li class="admin-item admin-item--cat"><div><input class="cat-rename" data-cat-rename="' + esc(c.id) + '" value="' + esc(c.name) + '" aria-label="اسم القسم">' +
        '<small>' + num(count) + ' منتج</small></div><div class="admin-item__actions">' +
        '<button type="button" class="mini" data-cat-up="' + i + '" aria-label="لفوق"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" class="mini" data-cat-down="' + i + '" aria-label="لتحت"' + (i === data.categories.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '<button type="button" class="mini mini--danger" data-cat-del="' + esc(c.id) + '">حذف</button></div></li>';
    }).join('');
  }

  var SETTINGS_FIELDS = [
    ['h', 'بيانات المطعم'],
    ['name', 'اسم المطعم (عربي)'], ['nameEn', 'اسم المطعم (إنجليزي)'], ['tagline', 'الشعار'],
    ['announcement', 'شريط الإعلان أعلى الموقع (سيبه فاضي لإخفائه)'],
    ['h', 'مواعيد العمل'],
    ['openFrom', 'بنفتح الساعة', 'time'], ['openTo', 'بنقفل الساعة (لو بعد نص الليل عادي)', 'time'],
    ['hours', 'نص مواعيد مخصص (اختياري، مثال: يوميًا ما عدا الجمعة)'],
    ['h', 'الطلبات والتواصل'],
    ['whatsapp', 'رقم واتساب الطلبات (بكود الدولة، مثال 2012…)', 'tel'],
    ['phone', 'رقم التليفون', 'tel'],
    ['currency', 'العملة'], ['deliveryFee', 'رسوم التوصيل الثابتة (0 = مجاني — بتتلغي لو حطيت مناطق)', 'number'],
    ['zones', 'مناطق التوصيل — منطقة في كل سطر بالشكل ده:  مصر الجديدة = 20  (سيبها فاضية لو الرسوم ثابتة)', 'zones'],
    ['minOrder', 'الحد الأدنى لطلب التوصيل (0 = مفيش)', 'number'],
    ['freeOver', 'توصيل مجاني للطلبات فوق (0 = مفيش)', 'number'],
    ['payments', 'طرق الدفع — طريقة في كل سطر (أول واحدة هي الافتراضية)', 'lines'],
    ['address', 'العنوان'], ['mapUrl', 'رابط جوجل ماب (اختياري)', 'url'],
    ['h', 'السوشيال ميديا'],
    ['facebook', 'رابط فيسبوك', 'url'], ['instagram', 'رابط إنستجرام', 'url'], ['tiktok', 'رابط تيك توك', 'url'],
    ['reels', 'روابط ريلز توت (رابط في كل سطر — إنستجرام / تيك توك / يوتيوب شورتس / ملف mp4)', 'textarea'],
    ['h', 'الحماية'],
    ['adminPin', 'رمز دخول لوحة الإدارة (اختياري)', 'password']
  ];
  function renderSettingsForm() {
    var s = data.settings;
    $('#settingsForm').innerHTML = SETTINGS_FIELDS.map(function (f) {
      if (f[0] === 'h') return '<h4>' + f[1] + '</h4>';
      if (f[2] === 'textarea') return '<label class="field"><span>' + f[1] + '</span><textarea name="' + f[0] + '" rows="4" dir="ltr">' + esc((s[f[0]] || []).join('\n')) + '</textarea></label>';
      if (f[2] === 'lines') return '<label class="field"><span>' + f[1] + '</span><textarea name="' + f[0] + '" rows="3">' + esc((s[f[0]] || []).join('\n')) + '</textarea></label>';
      if (f[2] === 'zones') return '<label class="field"><span>' + f[1] + '</span><textarea name="' + f[0] + '" rows="5" placeholder="مصر الجديدة = 20\nمدينة نصر = 30">' + esc((s.zones || []).map(function (z) { return z.name + ' = ' + (Number(z.fee) || 0); }).join('\n')) + '</textarea></label>';
      if (f[0] === 'adminPin') return '<label class="field"><span>' + f[1] + '</span><input name="adminPin" type="password" inputmode="numeric" autocomplete="new-password" value="" placeholder="' + (s.adminPin ? 'فيه رمز متسجل — اكتب رمز جديد علشان تغيّره' : 'اكتب رمز (٤ أرقام أو أكتر)') + '"></label>';
      return '<label class="field"><span>' + f[1] + '</span><input name="' + f[0] + '" type="' + (f[2] || 'text') + '" value="' + esc(s[f[0]]) + '"' + (f[2] === 'number' ? ' min="0"' : '') + (f[2] === 'tel' || f[2] === 'url' ? ' dir="ltr"' : '') + '></label>';
    }).join('') + '<button type="submit" class="btn btn--gold btn--block">حفظ الإعدادات</button>';
  }

  var editingId = null;
  function sizeRowHTML(s) {
    s = s || { name: '', price: '' };
    return '<div class="size-row"><input placeholder="الحجم (ربع، نص…)" value="' + esc(s.name) + '" aria-label="اسم الحجم">' +
      '<input type="number" min="0" placeholder="السعر" value="' + esc(s.price) + '" aria-label="سعر الحجم">' +
      '<button type="button" class="mini mini--danger" data-remove-size aria-label="حذف الحجم">×</button></div>';
  }
  function openEditor(id) {
    editingId = id || null;
    var p = id ? findProduct(id) : { name: '', desc: '', cat: (adminFilter !== 'all' ? adminFilter : (data.categories[0] || {}).id), price: '', sizes: [], badge: '', image: '', available: true };
    var f = $('#productForm');
    $('#editorTitle').textContent = id ? 'تعديل: ' + p.name : 'منتج جديد';
    $('#editorCat').innerHTML = catOptions(p.cat);
    f.name.value = p.name; f.desc.value = p.desc || ''; f.badge.value = p.badge || '';
    f.price.value = p.price || ''; f.image.value = p.image || ''; f.available.checked = p.available !== false;
    $('#editorPreview').src = imgSrc(p);
    $('#sizeRows').innerHTML = (p.sizes || []).map(sizeRowHTML).join('');
    $('#editorError').textContent = '';
    $('#productEditor').hidden = false;
    $('#productEditor').scrollTop = 0;
  }
  function saveEditor(e) {
    e.preventDefault();
    var f = $('#productForm');
    var sizes = $$('.size-row', $('#sizeRows')).map(function (r) {
      var i = r.querySelectorAll('input');
      return { name: i[0].value.trim(), price: Number(i[1].value) || 0 };
    }).filter(function (s) { return s.name; });
    var name = f.name.value.trim();
    if (!name) { $('#editorError').textContent = 'اكتب اسم المنتج'; f.name.focus(); return; }
    if (!sizes.length && !(Number(f.price.value) > 0)) { $('#editorError').textContent = 'حط سعر للمنتج أو ضيف حجم بسعره'; return; }
    var obj = { name: name, desc: f.desc.value.trim(), cat: f.cat.value, badge: f.badge.value.trim(), price: Number(f.price.value) || 0, sizes: sizes, image: f.image.value.trim(), available: f.available.checked };
    if (editingId) Object.assign(findProduct(editingId), obj);
    else { obj.id = uid(); data.products.push(obj); }
    persistData();
    $('#productEditor').hidden = true;
    renderAdminProducts(); renderAdminCats(); renderMenu();
    toast('اتحفظ المنتج');
  }
  function resizeImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 800, w = img.width, h = img.height;
        if (w > max) { h = Math.round(h * max / w); w = max; }
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function confirmClick(btn, label) {
    if (btn.classList.contains('is-confirm')) return true;
    btn.classList.add('is-confirm'); var old = btn.textContent; btn.textContent = label || 'متأكد؟';
    setTimeout(function () { btn.classList.remove('is-confirm'); btn.textContent = old; }, 3000);
    return false;
  }

  /* =========================================================
     الأحداث
     ========================================================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a');
    if (!t) return;

    if (t.matches('[data-zoom]')) { openLightbox(t.dataset.zoom, (t.querySelector('img') || {}).alt); return; }
    if (t.matches('[data-close-lightbox]')) { closeLightbox(); return; }
    if (t.matches('[data-open-cart]')) { e.preventDefault(); renderCart(); openDrawer($('#cartDrawer')); return; }
    if (t.matches('[data-close-drawer]')) { closeDrawers(); if (t.getAttribute('href') === '#menu') { e.preventDefault(); $('#menu').scrollIntoView({ behavior: 'smooth' }); } return; }
    if (t.matches('[data-open-admin]')) { openAdmin(); return; }
    if (t.matches('.chip[data-cat]')) { jumpToCat(t.dataset.cat); return; }
    if (t.matches('[data-jump]')) { e.preventDefault(); jumpToCat(t.dataset.jump); return; }
    if (t.matches('.size-chip')) { state.picks[t.dataset.pid] = Number(t.dataset.size); refreshCards(); return; }
    if (t.matches('[data-add]')) { flyToCart(t); addToCart(t.dataset.add); return; }
    if (t.matches('[data-step]')) { changeQty(t.dataset.key, Number(t.dataset.step)); return; }
    if (t.id === 'sendOrder') { sendOrder(); return; }
    if (t.id === 'reorderBtn') { reorder(); return; }
    if (t.id === 'newOrder') { newOrder(); return; }
    if (t.id === 'resetSearch') { state.q = ''; $('#searchInput').value = ''; $('#searchClear').hidden = true; $('.search').classList.remove('has-q'); renderMenu(); return; }
    if (t.id === 'searchClear') { state.q = ''; $('#searchInput').value = ''; t.hidden = true; $('.search').classList.remove('has-q'); renderMenu(); $('#searchInput').blur(); return; }

    // الإدارة
    if (t.matches('.tab')) {
      $$('.tab').forEach(function (b) { b.classList.toggle('is-active', b === t); });
      $$('.tab-panel').forEach(function (p) { p.hidden = p.dataset.panel !== t.dataset.tab; });
      return;
    }
    if (t.id === 'addProduct') { openEditor(null); return; }
    if (t.matches('[data-edit]')) { openEditor(t.dataset.edit); return; }
    if (t.matches('[data-dup]')) {
      var src = findProduct(t.dataset.dup); if (!src) return;
      var copy = clone(src); copy.id = uid(); copy.name = src.name + ' (نسخة)';
      data.products.splice(data.products.indexOf(src) + 1, 0, copy);
      persistData(); renderAdminProducts(); renderAdminCats(); renderMenu();
      openEditor(copy.id); toast('اتعملت نسخة — عدّلها واحفظ'); return;
    }
    if (t.matches('[data-toggle]')) { var p = findProduct(t.dataset.toggle); p.available = p.available === false; persistData(); renderAdminProducts(); renderMenu(); return; }
    if (t.matches('[data-del]')) {
      if (!confirmClick(t)) return;
      data.products = data.products.filter(function (x) { return x.id !== t.dataset.del; });
      persistData(); renderAdminProducts(); renderAdminCats(); renderMenu(); toast('اتحذف المنتج'); return;
    }
    if (t.id === 'cancelEdit') { $('#productEditor').hidden = true; return; }
    if (t.id === 'addSize') { $('#sizeRows').insertAdjacentHTML('beforeend', sizeRowHTML()); return; }
    if (t.matches('[data-remove-size]')) { t.closest('.size-row').remove(); return; }
    if (t.matches('[data-cat-del]')) {
      var cid = t.dataset.catDel;
      if (data.products.some(function (x) { return x.cat === cid; })) { toast('انقل أو احذف منتجات القسم الأول'); return; }
      data.categories = data.categories.filter(function (c) { return c.id !== cid; });
      persistData(); renderAdminCats(); renderMenu(); return;
    }
    if (t.matches('[data-cat-up], [data-cat-down]')) {
      var i = Number(t.dataset.catUp != null ? t.dataset.catUp : t.dataset.catDown);
      var j = t.dataset.catUp != null ? i - 1 : i + 1;
      var tmp = data.categories[i]; data.categories[i] = data.categories[j]; data.categories[j] = tmp;
      persistData(); renderAdminCats(); renderMenu(); return;
    }
    if (t.id === 'exportJson') { download('toot-menu-backup.json', JSON.stringify(data, null, 2), 'application/json'); toast('اتحملت النسخة'); return; }
    if (t.id === 'exportJs') {
      var hasUploads = data.products.some(function (x) { return /^data:/.test(x.image || ''); });
      var header = '/* TOOT | توت — بيانات المنيو (اتعملت من لوحة الإدارة ' + new Date().toLocaleDateString('ar-EG') + ') */\n';
      download('menu-data.js', header + 'window.TOOT_DEFAULT = ' + JSON.stringify(data, null, 2) + ';\n', 'text/javascript');
      toast(hasUploads ? 'اتحمل الملف — الصور المرفوعة من الجهاز جواه، الأفضل ترفعها في فولدر images' : 'اتحمل الملف — ارفعه مكان code/menu-data.js');
      return;
    }
    if (t.id === 'resetData') {
      if (!confirmClick(t, 'اضغط تاني للتأكيد')) return;
      data = clone(DEFAULT); persistData(); renderAll(); renderAdmin(); toast('رجع المنيو الأصلي'); return;
    }
  });

  $('#overlay').addEventListener('click', function () { closeDrawers(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || $('#overlay').hidden) return;
    if (!$('#productEditor').hidden) $('#productEditor').hidden = true; else closeDrawers();
  });

  var searchTimer;
  $('#searchInput').addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    $('#searchClear').hidden = !e.target.value;
    $('.search').classList.toggle('has-q', !!e.target.value);
    searchTimer = setTimeout(function () {
      state.q = e.target.value; renderMenu();
      var top = $('#menuBar').getBoundingClientRect().top;
      if (top > parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) + 5) $('#menuBar').scrollIntoView({ behavior: 'smooth' });
    }, 160);
  });
  $('#searchInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
  $$('input[name="type"]').forEach(function (r) { r.addEventListener('change', renderCart); });
  $('#orderForm').zone.addEventListener('change', function () { $('#formError').textContent = ''; renderCart(); });
  $('#orderForm').addEventListener('submit', function (e) { e.preventDefault(); sendOrder(); });

  $('#pinForm').addEventListener('submit', function (e) {
    e.preventDefault();
    checkPin($('#pinInput').value).then(function (ok) {
      if (ok) {
        adminUnlocked = true; $('#pinError').textContent = ''; $('#pinInput').value = '';
        $('#adminLock').hidden = true; $('#adminContent').hidden = false; renderAdmin();
      } else { $('#pinError').textContent = 'الرمز غلط'; $('#pinInput').select(); }
    });
  });
  $('#adminFilter').addEventListener('change', function (e) { adminFilter = e.target.value; renderAdminProducts(); });
  $('#productForm').addEventListener('submit', saveEditor);
  $('#productForm').image.addEventListener('input', function (e) { $('#editorPreview').src = e.target.value || PLACEHOLDER; });
  $('#imageUpload').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    resizeImage(file, function (url) { $('#productForm').image.value = url; $('#editorPreview').src = url; });
    e.target.value = '';
  });
  $('#catForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = $('#catName').value.trim(); if (!n) return;
    data.categories.push({ id: 'c' + Date.now().toString(36), name: n });
    $('#catName').value = '';
    persistData(); renderAdminCats(); renderMenu(); toast('اتضاف القسم');
  });
  $('#adminCats').addEventListener('change', function (e) {
    var id = e.target.dataset.catRename; if (!id) return;
    var c = data.categories.find(function (x) { return x.id === id; });
    if (c && e.target.value.trim()) { c.name = e.target.value.trim(); persistData(); renderMenu(); toast('اتغير اسم القسم'); }
  });
  $('#settingsForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var ta = e.target.querySelector('textarea[name="reels"]');
    if (ta) data.settings.reels = ta.value.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var pt = e.target.querySelector('textarea[name="payments"]');
    if (pt) data.settings.payments = pt.value.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var zt = e.target.querySelector('textarea[name="zones"]');
    if (zt) data.settings.zones = zt.value.split(/\n+/).map(function (line) {
      var m = line.trim().match(/^(.+?)\s*[=:،,\-–]\s*([\d٠-٩.]+)\s*$/);
      if (!m) return line.trim() ? { name: line.trim(), fee: 0 } : null;
      var fee = Number(m[2].replace(/[٠-٩]/g, function (c) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }));
      return { name: m[1].trim(), fee: fee || 0 };
    }).filter(Boolean);
    var newPin = '';
    $$('input', e.target).forEach(function (i) {
      if (i.name === 'adminPin') { newPin = i.value.trim(); i.value = ''; return; }
      data.settings[i.name] = i.type === 'number' ? (Number(i.value) || 0) : i.value.trim();
    });
    var done = function () { persistData(); renderSettings(); renderOrderOptions(); renderCart(); refreshCards(); renderSettingsForm(); toast('اتحفظت الإعدادات'); };
    if (newPin) {
      if (newPin.length < 4) { toast('الرمز لازم يكون ٤ أرقام أو أكتر'); return; }
      sha256(newPin).then(function (h) { if (h) { data.settings.adminPin = h; adminUnlocked = true; } done(); });
    } else done();
  });
  $('#importJson').addEventListener('change', function (e) {
    var file = e.target.files[0]; if (!file) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.products) || !Array.isArray(d.categories)) throw new Error('bad');
        d.settings = Object.assign({}, DEFAULT.settings, d.settings || {});
        data = d; persistData(); renderAll(); renderAdmin(); toast('اتسترجعت النسخة');
      } catch (err) { toast('الملف ده مش نسخة منيو صحيحة'); }
    };
    r.readAsText(file);
    e.target.value = '';
  });

  /* ---------- تثبيت كتطبيق (PWA) ---------- */
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; $('#installBtn').hidden = false; });
  $('#installBtn').addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () { deferredPrompt = null; $('#installBtn').hidden = true; });
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  /* =========================================================
     سلايدر صور الحملة: كل حركة تنزل الصورة اللي بعدها بكلامها
     ========================================================= */
  function setupSlider() {
    var root = $('#heroSlider'); if (!root) return;
    var slides = $$('.slide', root), texts = $$('.slide-text'), bgs = $$('.hero__bg-layer'), dots = $$('.slider__dot', root);
    var n = slides.length, cur = 0, timer = null, MS = 6000, paused = false;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.style.setProperty('--slide-ms', MS + 'ms');
    function show(i, dir) {
      i = (i + n) % n; if (i === cur) return;
      root.classList.toggle('is-back', dir < 0);
      var prev = cur; cur = i;
      slides.forEach(function (el, k) {
        el.classList.toggle('is-active', k === cur);
        el.classList.toggle('is-leaving', k === prev);
        el.classList.toggle('is-next', k === (cur + 1) % n && k !== prev);
        el.setAttribute('aria-hidden', k === cur ? 'false' : 'true');
        var b = el.querySelector('button'); if (b) b.tabIndex = k === cur ? 0 : -1;
      });
      setTimeout(function () { slides[prev].classList.remove('is-leaving'); }, 1000);
      texts.forEach(function (el, k) { el.classList.toggle('is-active', k === cur); el.setAttribute('aria-hidden', k === cur ? 'false' : 'true'); });
      var numEl = $('#slideNum'); if (numEl) { numEl.textContent = String(cur + 1).padStart(2, '0'); numEl.classList.remove('flip'); void numEl.offsetWidth; numEl.classList.add('flip'); }
      bgs.forEach(function (el, k) { el.classList.toggle('is-active', k === cur); });
      dots.forEach(function (d, k) {
        d.classList.remove('is-active'); d.classList.toggle('is-done', k < cur);
        if (k === cur) { void d.offsetWidth; d.classList.add('is-active'); }
        d.setAttribute('aria-current', k === cur ? 'true' : 'false');
      });
      restart();
    }
    function restart() {
      clearTimeout(timer);
      if (reduce || paused) return;
      timer = setTimeout(function () { show(cur + 1, 1); }, MS);
    }
    function pause(v) { paused = v; root.classList.toggle('is-paused', v); if (v) clearTimeout(timer); else restart(); }
    root.addEventListener('click', function (e) {
      var a = e.target.closest('[data-dir]'); if (a) { show(cur + Number(a.dataset.dir), Number(a.dataset.dir)); return; }
      var d = e.target.closest('[data-go]'); if (d) { var g = Number(d.dataset.go); show(g, g > cur ? 1 : -1); }
    });
    root.addEventListener('mouseenter', function () { pause(true); });
    root.addEventListener('mouseleave', function () { pause(false); });
    document.addEventListener('visibilitychange', function () { pause(document.hidden); });
    // سحب بالصباع على الموبايل (في العربي: السحب لليمين = اللي بعد)
    var x0 = null, y0 = null;
    var frame = $('.slider__frame', root);
    frame.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; pause(true); }, { passive: true });
    frame.addEventListener('touchend', function (e) {
      if (x0 == null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { show(cur + (dx > 0 ? 1 : -1), dx > 0 ? 1 : -1); frame.dataset.swiped = '1'; setTimeout(function () { frame.dataset.swiped = ''; }, 350); }
      x0 = null; pause(false);
    }, { passive: true });
    frame.addEventListener('click', function (e) { if (frame.dataset.swiped) { e.stopPropagation(); e.preventDefault(); } }, true);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { show(cur + 1, 1); } else if (e.key === 'ArrowRight') { show(cur - 1, -1); }
    });
    var bgWrap = $('.hero__bg'), hero = $('.hero');
    if (bgWrap && hero && window.matchMedia('(hover: hover)').matches && !reduce) {
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        bgWrap.style.transform = 'translate(' + (x * -30) + 'px,' + (y * -20) + 'px)';
      });
    }
    dots[0].classList.add('is-active');
    // الصورة اللي ورا: لو دوست عليها تيجي قدام
    frame.addEventListener('click', function (e) {
      var nx = e.target.closest('.slide.is-next');
      if (nx) { e.preventDefault(); e.stopPropagation(); show(cur + 1, 1); }
    }, true);
    // ميلان ثلاثي الأبعاد مع الماوس + لمعة بتتحرك
    var stage = $('.slider__stage', root);
    if (stage && !reduce && window.matchMedia('(hover: hover)').matches) {
      var raf = 0, tx = 0, ty = 0;
      stage.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          root.style.setProperty('--tilt-x', (ty * -12).toFixed(2) + 'deg');
          root.style.setProperty('--tilt-y', (tx * 14).toFixed(2) + 'deg');
          root.style.setProperty('--glare-x', ((tx + .5) * 100).toFixed(1) + '%');
          root.style.setProperty('--glare-y', ((ty + .5) * 100).toFixed(1) + '%');
        });
      });
      stage.addEventListener('pointerenter', function () { root.classList.add('is-tilting'); });
      stage.addEventListener('pointerleave', function () {
        root.classList.remove('is-tilting');
        root.style.setProperty('--tilt-x', '0deg'); root.style.setProperty('--tilt-y', '0deg');
      });
    }
    // عمق مع النزول: الصورة بتبعد وتلف شوية والخلفية أبطأ
    if (!reduce) {
      var heroEl = $('.hero'), ticking2 = false;
      window.addEventListener('scroll', function () {
        if (ticking2) return; ticking2 = true;
        requestAnimationFrame(function () {
          ticking2 = false;
          var r = heroEl.getBoundingClientRect(); if (r.bottom < 0) return;
          var k = Math.min(1, Math.max(0, -r.top / r.height));
          heroEl.style.setProperty('--scroll-k', k.toFixed(3));
        });
      }, { passive: true });
    }
    restart();
  }

  /* =========================================================
     نافذة تفاصيل الصنف (Quick View)
     ========================================================= */
  var qv = { pid: null, size: 0, qty: 1 };
  function qvPrice() {
    var p = findProduct(qv.pid); if (!p) return 0;
    if (p.sizes && p.sizes.length) return Number((p.sizes[qv.size] || p.sizes[0]).price) || 0;
    return Number(p.price) || 0;
  }
  function renderQv() {
    var p = findProduct(qv.pid); if (!p) return;
    $('#qvQty').textContent = num(qv.qty);
    $('#qvTotal').textContent = money(qvPrice() * qv.qty);
    $('#qvSizes').innerHTML = (p.sizes || []).map(function (s, i) {
      return '<button type="button" role="radio" aria-checked="' + (i === qv.size) + '" class="size-chip' + (i === qv.size ? ' is-active' : '') + '" data-qv-size="' + i + '">' + esc(s.name) + ' <small>' + num(s.price) + '</small></button>';
    }).join('');
    $('#qvSizes').hidden = !(p.sizes && p.sizes.length);
  }
  function openQv(pid) {
    var p = findProduct(pid); if (!p) return;
    qv = { pid: pid, size: Math.min(state.picks[pid] || 0, Math.max(0, (p.sizes || []).length - 1)), qty: 1 };
    $('#qvImg').src = imgSrc(p); $('#qvImg').alt = p.name;
    $('#qvTitle').textContent = p.name;
    $('#qvDesc').textContent = p.desc || '';
    $('#qvCat').textContent = catName(p.cat);
    $('#qvBadge').hidden = !p.badge; $('#qvBadge').textContent = p.badge || '';
    $('#qvNote').value = '';
    $('#qvAdd').disabled = p.available === false;
    renderQv();
    var d = $('#quickView');
    if (d.showModal) { d.showModal(); document.documentElement.style.overflow = 'hidden'; }
  }
  function closeQv() { var d = $('#quickView'); if (d.open) d.close(); }
  $('#quickView').addEventListener('close', function () { if ($('#overlay').hidden) document.documentElement.style.overflow = ''; });
  $('#quickView').addEventListener('click', function (e) {
    if (e.target === this) { closeQv(); return; }
    var b = e.target.closest('button'); if (!b) return;
    if (b.matches('[data-close-qv]')) { closeQv(); return; }
    if (b.dataset.qvSize != null) { qv.size = Number(b.dataset.qvSize); renderQv(); return; }
    if (b.dataset.qvStep) { qv.qty = Math.max(1, Math.min(50, qv.qty + Number(b.dataset.qvStep))); renderQv(); return; }
    if (b.id === 'qvAdd') {
      var p = findProduct(qv.pid);
      addToCart(qv.pid, (p.sizes && p.sizes.length) ? qv.size : null, qv.qty, $('#qvNote').value);
      var img = $('#qvImg'); var target = [$('.cart-btn'), $('.bottom-nav__cart')].filter(function (el) { return el && el.offsetParent !== null; })[0];
      closeQv();
      if (target) { target.classList.remove('got'); void target.offsetWidth; target.classList.add('got'); }
    }
  });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-qv]'); if (!t) return;
    e.preventDefault(); openQv(t.dataset.qv);
  });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card__media[data-qv]')) { e.preventDefault(); openQv(e.target.dataset.qv); }
  });

  /* =========================================================
     توت يختارلك — مساعد بيبني طلب كامل حسب العدد والمزاج والميزانية
     ========================================================= */
  var SIDE_CATS = ['fries', 'drinks'];
  function portionOf(sizeName) {
    var n = norm(sizeName || '');
    if (/كامل/.test(n)) return 4;
    if (/نص|كبير/.test(n)) return 2;
    if (/ربع|صغير|وسط/.test(n)) return 1;
    return 1;
  }
  function availIn(cat) { return data.products.filter(function (p) { return p.cat === cat && p.available !== false; }); }
  function priceOpts(p) { // كل الاختيارات (حجم + سعر + حصص)
    if (p.sizes && p.sizes.length) return p.sizes.map(function (s, i) { return { p: p, i: i, size: s.name, price: Number(s.price) || 0, por: portionOf(s.name) }; });
    var meal = /وجب/.test(norm(p.name));
    return [{ p: p, i: null, size: '', price: Number(p.price) || 0, por: meal ? 1.5 : 1 }];
  }
  function mainCats() {
    return data.categories.filter(function (c) { return SIDE_CATS.indexOf(c.id) < 0 && availIn(c.id).length; });
  }
  var pickerSeed = 0;
  function buildPick(people, mood, budget) {
    var cats = mood === 'any' ? mainCats().map(function (c) { return c.id; }) : [mood];
    var opts = [];
    cats.forEach(function (c) { availIn(c).forEach(function (p) { opts = opts.concat(priceOpts(p)); }); });
    if (!opts.length) return null;
    // ترتيب الاختيارات: الأوفر سعرًا للحصة مع شوية تنويع
    var rnd = function (i) { var x = Math.sin((i + 1) * 9301 + pickerSeed * 49297) * 233280; return x - Math.floor(x); };
    var target = budget * 0.62 / Math.max(1, people); // السعر المناسب للحصة على قد الميزانية
    opts.forEach(function (o, i) { o.score = Math.abs(o.price / o.por - target) / target + rnd(i) * 0.35; });
    var need = people, items = [], spent = 0, guard = 0;
    while (need > 0.4 && guard++ < 20) {
      var fit = opts.filter(function (o) { return o.por <= need + 1 && spent + o.price <= budget; });
      if (!fit.length) fit = opts.filter(function (o) { return spent + o.price <= budget; });
      if (!fit.length) break;
      // فضّل أكبر حجم يملأ الباقي، وبعدين الأوفر
      fit.sort(function (a, b) { return (b.por - a.por) || (a.score - b.score); });
      var big = fit.filter(function (o) { return o.por <= need; });
      var choice = (big.length ? big : fit).sort(function (a, b) { return a.score - b.score; })[0];
      if (big.length) { var maxPor = Math.max.apply(null, big.map(function (o) { return o.por; })); choice = big.filter(function (o) { return o.por === maxPor; }).sort(function (a, b) { return a.score - b.score; })[0]; }
      items.push(choice); spent += choice.price; need -= choice.por;
    }
    if (!items.length) return { items: [], total: 0, short: true };
    // جانبي: بطاطس لكل اتنين، ومشروب لكل واحد — لو الميزانية تسمح
    var sides = [];
    var fries = availIn('fries').map(priceOpts).reduce(function (a, b) { return a.concat(b); }, []).sort(function (a, b) { return a.price - b.price; })[0];
    var drinks = availIn('drinks').map(priceOpts).reduce(function (a, b) { return a.concat(b); }, []).sort(function (a, b) { return a.price - b.price; });
    if (drinks.length > 1 && /مي|مياه/.test(norm(drinks[0].p.name))) drinks.push(drinks.shift()); // الميه آخر اختيار
    var drink = drinks[pickerSeed % Math.max(1, Math.min(2, drinks.length))];
    var friesN = Math.max(1, Math.round(people / 2)), drinkN = people;
    if (fries) { while (friesN > 0 && spent + fries.price * friesN > budget) friesN--; if (friesN) { sides.push({ o: fries, qty: friesN }); spent += fries.price * friesN; } }
    if (drink) { while (drinkN > 0 && spent + drink.price * drinkN > budget) drinkN--; if (drinkN) { sides.push({ o: drink, qty: drinkN }); spent += drink.price * drinkN; } }
    // تجميع الأصناف المتكررة
    var merged = [];
    items.forEach(function (o) {
      var m = merged.find(function (x) { return x.o.p.id === o.p.id && x.o.i === o.i; });
      if (m) m.qty++; else merged.push({ o: o, qty: 1 });
    });
    return { items: merged.concat(sides), total: spent, short: need > 0.4 };
  }
  var lastPick = null;
  function renderPicker() {
    var f = $('#pickerForm'); if (!f) return;
    var people = Number((f.querySelector('input[name="people"]:checked') || {}).value) || 1;
    var mood = (f.querySelector('input[name="mood"]:checked') || {}).value || 'any';
    var budget = Number($('#budget').value);
    $('#budgetOut').textContent = money(budget);
    var pct = (budget - $('#budget').min) / ($('#budget').max - $('#budget').min) * 100;
    $('#budget').style.setProperty('--fill', pct + '%');
    var r = buildPick(people, mood, budget);
    lastPick = r;
    var box = $('#pickerResult');
    if (!r || !r.items.length) {
      box.innerHTML = '<div class="pick-empty"><b>الميزانية دي صغيرة على الاختيار ده</b><p>زوّد الميزانية شوية أو جرّب نوع تاني.</p></div>';
      return;
    }
    box.innerHTML = '<div class="pick-card">' +
      '<div class="pick-card__head"><span class="kicker">اقتراح توت ليك</span><b class="pick-card__total" data-count="' + r.total + '">' + money(r.total) + '</b></div>' +
      '<ul class="pick-list">' + r.items.map(function (x, i) {
        return '<li style="--i:' + i + '">' + imgTag(imgSrc(x.o.p), '') + '<span><b>' + esc(x.o.p.name) + '</b>' + (x.o.size ? '<small>' + esc(x.o.size) + '</small>' : '') + '</span><em>× ' + num(x.qty) + '</em></li>';
      }).join('') + '</ul>' +
      (r.short ? '<p class="pick-note">⚠️ الميزانية مش مكفية الكل بالكامل — زوّدها شوية علشان الكمية تبقى مريحة.</p>' : '<p class="pick-note">✔ مكفّي ' + (people >= 8 ? 'العزومة' : (people > 1 ? num(people) + ' أفراد' : 'فرد')) + ' وفاضلك ' + money(budget - r.total) + ' من الميزانية.</p>') +
      '<div class="pick-actions"><button type="button" class="btn btn--gold" id="pickAdd">ضيف الكل للسلة</button><button type="button" class="btn btn--ghost" id="pickShuffle">↻ اقتراح تاني</button></div></div>';
  }
  function setupPicker() {
    var f = $('#pickerForm'); if (!f) return;
    var moods = [{ id: 'any', name: '✨ فاجئني' }].concat(mainCats().map(function (c) { return { id: c.id, name: c.name }; }));
    $('#pickerMood').innerHTML = moods.map(function (m, i) {
      return '<label><input type="radio" name="mood" value="' + esc(m.id) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(m.name) + '</span></label>';
    }).join('');
    f.addEventListener('change', function (e) {
      if (e.target.name === 'people') { // ميزانية مقترحة على قد العدد
        var n = Number(e.target.value); $('#budget').value = Math.min(2000, Math.max(150, Math.round(n * 190 / 50) * 50));
      }
      renderPicker();
    });
    $('#budget').addEventListener('input', renderPicker);
    $('#pickerResult').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.id === 'pickShuffle') { pickerSeed++; renderPicker(); $('#pickerResult').classList.remove('is-new'); void $('#pickerResult').offsetWidth; $('#pickerResult').classList.add('is-new'); }
      if (b.id === 'pickAdd' && lastPick) {
        lastPick.items.forEach(function (x) { addToCart(x.o.p.id, x.o.i, x.qty, '', true); });
        renderCart(); refreshCards(); bump();
        toast('اتضاف اقتراح توت للسلة 👑');
        renderCart(); openDrawer($('#cartDrawer'));
      }
    });
    renderPicker();
  }

  /* =========================================================
     حركة وتفاعل
     ========================================================= */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setupHeroLogo() { // لوجو الهيدر يظهر بس لما الزائر ينزل تحت الهيرو
    var hero = $('#home'); if (!hero) return;
    if (!('IntersectionObserver' in window)) return;
    document.body.classList.add('hero-in-view');
    new IntersectionObserver(function (en) {
      document.body.classList.toggle('hero-in-view', en[0].isIntersecting);
    }, { rootMargin: '-35% 0px 0px 0px' }).observe(hero);
  }
  function setupMotion() {
    setupHeroLogo();
    // شريط تقدم النزول
    var bar = $('#scrollProgress'), ticking = false;
    function onScroll() {
      ticking = false;
      var h = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')';
      document.body.classList.toggle('is-scrolled', scrollY > 40);
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();
    if (reduceMotion) return;
    // ميلان الكروت مع الماوس (3D)
    if (window.matchMedia('(hover: hover)').matches) {
      document.addEventListener('pointermove', function (e) {
        var c = e.target.closest && e.target.closest('.card, .feature, .pick-card');
        if (!c) return;
        var r = c.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        c.style.setProperty('--rx', (y * -6).toFixed(2) + 'deg');
        c.style.setProperty('--ry', (x * 8).toFixed(2) + 'deg');
        c.style.setProperty('--mx', ((x + .5) * 100).toFixed(1) + '%');
        c.style.setProperty('--my', ((y + .5) * 100).toFixed(1) + '%');
      });
      document.addEventListener('pointerout', function (e) {
        var c = e.target.closest && e.target.closest('.card, .feature, .pick-card');
        if (c && !c.contains(e.relatedTarget)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
      });
      // زراير مغناطيسية
      $$('.btn--lg').forEach(function (b) {
        b.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect();
          b.style.translate = ((e.clientX - r.left - r.width / 2) * .15).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .25).toFixed(1) + 'px';
        });
        b.addEventListener('pointerleave', function () { b.style.translate = ''; });
      });
    }
    // باترن الخلفية بيتحرك مع النزول (Parallax)
    var bands = $$('.pattern-band, .picker');
    addEventListener('scroll', function () {
      bands.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        el.style.backgroundPositionY = (r.top * -.15).toFixed(1) + 'px';
      });
    }, { passive: true });
  }
  // عدّاد أرقام متحرك للإجمالي
  var countAnim = {};
  function animateMoney(el, to) {
    if (reduceMotion || !el.offsetParent) { el.textContent = money(to); return; }
    var from = Number(el.dataset.val || 0); el.dataset.val = to;
    if (from === to) { el.textContent = money(to); return; }
    var start = performance.now(), dur = 450, id = Math.random();
    countAnim[el] = id;
    (function step(now) {
      var k = Math.min(1, (now - start) / dur), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      el.textContent = money(v);
      if (k < 1) requestAnimationFrame(step);
    })(start);
  }
  // تحية حسب وقت اليوم في شريط الإعلان لو فاضي
  function timeGreeting() {
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return 'صباح الملوك ☀️ — الفطار عليك والفرخة علينا';
    if (h >= 12 && h < 17) return 'وقت الغدا 🍗 — فرخة سخنة في الطريق ليك';
    if (h >= 17 && h < 23) return 'عشا ملكي 👑 — اطلب دلوقتي وخليها علينا';
    return 'سهران؟ 🌙 اطلب وإحنا نجهزهولك';
  }

  /* ---------- البداية ---------- */
  function restoreCustomer() {
    var c = load(FORM_KEY, null); if (!c) return;
    var f = $('#orderForm');
    f.name.value = c.name || ''; f.phone.value = c.phone || ''; f.address.value = c.address || '';
  }
  function renderAll() {
    syncCart();
    renderSettings(); renderOrderOptions(); renderMenu(); renderCart();
  }
  restoreCustomer();
  renderAll();
  setupPicker();
  setupMotion();
  setupNavSpy();
  setupSlider();
  observeReveal();
  setInterval(renderStatus, 60000);
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(setupSpy, 200); });
  if (location.hash === '#admin') openAdmin();
  window.addEventListener('hashchange', function () { if (location.hash === '#admin') openAdmin(); });
  if (publishedUpdated) setTimeout(function () { toast('اتحمل المنيو المنشور الجديد'); }, 800);
  if (location.hash === '#cart') history.replaceState(null, '', location.pathname + location.search);
})();

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
  var PLACEHOLDER = 'placeholder.jpg';

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

  var DEFAULT = window.TOOT_DEFAULT || { settings: {}, categories: [], products: [] };
  var data = load(DATA_KEY, null) || clone(DEFAULT);
  data.settings = Object.assign({}, DEFAULT.settings, data.settings || {});
  var cart = load(CART_KEY, []);
  var state = { q: '', picks: {}, activeCat: null };

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
  function persistData() { save(DATA_KEY, data); }
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
    $('#announce').hidden = !s.announcement;
    document.body.classList.toggle('has-announce', !!s.announcement);
    $('#announceText').textContent = s.announcement || '';
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
  function lineKey(pid, size) { return pid + '|' + (size || ''); }
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
      '<div class="card__media">' + imgTag(imgSrc(p), p.name, 'loading="lazy" width="800" height="600"') +
        (p.badge ? '<span class="card__badge">' + esc(p.badge) + '</span>' : '') +
        (off ? '<span class="card__soldout">غير متاح حاليًا</span>' : '') +
      '</div>' +
      '<div class="card__body">' +
        '<h4 class="card__title">' + highlight(p.name) + '</h4>' +
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
    if (state.q) { state.q = ''; $('#searchInput').value = ''; $('#searchClear').hidden = true; renderMenu(); }
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
  function cartTotals() {
    var sub = cart.reduce(function (a, l) { return a + l.price * l.qty; }, 0);
    var type = ($('input[name="type"]:checked') || {}).value || 'delivery';
    var fee = (type === 'delivery' && cart.length) ? Number(data.settings.deliveryFee) || 0 : 0;
    return { sub: sub, fee: fee, total: sub + fee, count: cart.reduce(function (a, l) { return a + l.qty; }, 0), type: type };
  }
  function bump() {
    $$('[data-cart-count]').forEach(function (el) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); });
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) {} }
  }
  function addToCart(pid, sizeIndex) {
    var p = findProduct(pid);
    if (!p || p.available === false) return;
    if (sizeIndex != null) state.picks[pid] = sizeIndex;
    var cp = currentPrice(p);
    var key = lineKey(pid, cp.size);
    var line = cart.find(function (l) { return l.key === key; });
    if (line) line.qty += 1;
    else cart.push({ key: key, id: pid, name: p.name, size: cp.size, price: cp.price, image: imgSrc(p), qty: 1 });
    save(CART_KEY, cart);
    renderCart(); refreshCards(); bump();
    toast('اتضاف ' + p.name + (cp.size ? ' (' + cp.size + ')' : ''));
  }
  function changeQty(key, d) {
    var line = cart.find(function (l) { return l.key === key; });
    if (!line) return;
    line.qty += d;
    if (line.qty <= 0) cart = cart.filter(function (l) { return l.key !== key; });
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
    $$('[data-cart-count]').forEach(function (el) { el.textContent = num(t.count); });
    $$('[data-cart-total]').forEach(function (el) { el.textContent = money(t.total); });
    $('.cart-btn__total').hidden = t.count === 0;
    $('#subTotal').textContent = money(t.sub);
    $('#deliveryTotal').textContent = money(t.fee);
    $('#deliveryRow').hidden = !(t.type === 'delivery' && Number(data.settings.deliveryFee) > 0);
    var empty = cart.length === 0;
    $('#cartEmpty').hidden = !empty;
    $('#orderForm').hidden = empty;
    $('#drawerFoot').hidden = empty;
    $('#addressField').hidden = t.type !== 'delivery';
    var last = load(LAST_KEY, null);
    $('#reorderBtn').hidden = !(empty && last && last.length);
    $('#cartList').innerHTML = cart.map(function (l) {
      return '<li class="cart-line">' + imgTag(l.image, '') +
        '<div><h4>' + esc(l.name) + '</h4>' + (l.size ? '<small>' + esc(l.size) + '</small><br>' : '') +
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
      cart.push({ key: lineKey(p.id, l.size), id: p.id, name: p.name, size: l.size, price: price, image: imgSrc(p), qty: l.qty });
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
    if (t.type === 'delivery' && !address) { err.textContent = 'اكتب العنوان علشان التوصيل'; f.address.focus(); return; }
    err.textContent = '';
    save(FORM_KEY, { name: name, phone: phone, address: address });
    save(LAST_KEY, cart.map(function (l) { return { id: l.id, size: l.size, qty: l.qty }; }));

    var st = openState();
    var lines = cart.map(function (l, i) {
      return (i + 1) + '. ' + l.name + (l.size ? ' (' + l.size + ')' : '') + ' × ' + l.qty + ' = ' + money(l.price * l.qty);
    });
    var msg = [
      '👑 طلب جديد من موقع ' + (data.settings.name || 'توت'),
      '',
      lines.join('\n'),
      '',
      'الأصناف: ' + money(t.sub),
      t.fee ? 'التوصيل: ' + money(t.fee) : null,
      'الإجمالي: ' + money(t.total),
      '',
      'الاسم: ' + name,
      'الموبايل: ' + phone,
      'الاستلام: ' + (t.type === 'delivery' ? 'توصيل' : 'استلام من الفرع'),
      t.type === 'delivery' ? 'العنوان: ' + address : null,
      notes ? 'ملاحظات: ' + notes : null,
      st && !st.open ? '(الطلب اتبعت والمحل مقفول)' : null
    ].filter(function (x) { return x !== null; }).join('\n');

    window.open(waLink(msg), '_blank', 'noopener');
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
    ['currency', 'العملة'], ['deliveryFee', 'رسوم التوصيل (0 = مجاني)', 'number'],
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
    if (t.id === 'resetSearch') { state.q = ''; $('#searchInput').value = ''; $('#searchClear').hidden = true; renderMenu(); return; }
    if (t.id === 'searchClear') { state.q = ''; $('#searchInput').value = ''; t.hidden = true; renderMenu(); $('#searchInput').focus(); return; }

    // الإدارة
    if (t.matches('.tab')) {
      $$('.tab').forEach(function (b) { b.classList.toggle('is-active', b === t); });
      $$('.tab-panel').forEach(function (p) { p.hidden = p.dataset.panel !== t.dataset.tab; });
      return;
    }
    if (t.id === 'addProduct') { openEditor(null); return; }
    if (t.matches('[data-edit]')) { openEditor(t.dataset.edit); return; }
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
      toast(hasUploads ? 'اتحمل الملف — الصور المرفوعة من الجهاز جواه، الأفضل ترفعها على GitHub جنب باقي الصور' : 'اتحمل الملف — ارفعه مكان code/menu-data.js');
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
    searchTimer = setTimeout(function () {
      state.q = e.target.value; renderMenu();
      var top = $('#menuBar').getBoundingClientRect().top;
      if (top > parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) + 5) $('#menuBar').scrollIntoView({ behavior: 'smooth' });
    }, 160);
  });
  $$('input[name="type"]').forEach(function (r) { r.addEventListener('change', renderCart); });
  $('#orderForm').addEventListener('submit', function (e) { e.preventDefault(); sendOrder(); });

  $('#pinForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('#pinInput').value === String(data.settings.adminPin)) {
      adminUnlocked = true; $('#pinError').textContent = ''; $('#pinInput').value = '';
      $('#adminLock').hidden = true; $('#adminContent').hidden = false; renderAdmin();
    } else { $('#pinError').textContent = 'الرمز غلط'; }
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
    $$('input', e.target).forEach(function (i) { data.settings[i.name] = i.type === 'number' ? (Number(i.value) || 0) : i.value.trim(); });
    persistData(); renderSettings(); renderCart(); refreshCards(); toast('اتحفظت الإعدادات');
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
        el.setAttribute('aria-hidden', k === cur ? 'false' : 'true');
        var b = el.querySelector('button'); if (b) b.tabIndex = k === cur ? 0 : -1;
      });
      setTimeout(function () { slides[prev].classList.remove('is-leaving'); }, 1000);
      texts.forEach(function (el, k) { el.classList.toggle('is-active', k === cur); el.setAttribute('aria-hidden', k === cur ? 'false' : 'true'); });
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
    restart();
  }

  /* ---------- البداية ---------- */
  function restoreCustomer() {
    var c = load(FORM_KEY, null); if (!c) return;
    var f = $('#orderForm');
    f.name.value = c.name || ''; f.phone.value = c.phone || ''; f.address.value = c.address || '';
  }
  function renderAll() {
    cart = cart.filter(function (l) { return findProduct(l.id); });
    renderSettings(); renderMenu(); renderCart();
  }
  restoreCustomer();
  renderAll();
  setupNavSpy();
  setupSlider();
  observeReveal();
  setInterval(renderStatus, 60000);
  var resizeTimer;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(setupSpy, 200); });
  if (location.hash === '#admin') openAdmin();
  if (location.hash === '#cart') history.replaceState(null, '', location.pathname + location.search);
})();

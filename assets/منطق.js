/* =========================================================
   مرصد التهديدات السيبرانية — منطق التطبيق
   ========================================================= */

(function () {
  'use strict';

  /* ---------- أدوات مساعدة ---------- */
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => n.toLocaleString('en-US');

  /* ---------- رسم بياني (Canvas خفيف بلا مكتبات خارجية) ---------- */
  function drawBarChart(canvas, data, opts) {
    opts = opts || {};
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    // تخطَّ الأقسام المخفية (عرض صفر) — تُرسم لاحقاً عند ظهورها
    if (rect.width < 10 || rect.height < 10) return;
    const dpr = window.devicePixelRatio || 1;
    const W = rect.width, H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const isHoriz = opts.horizontal;
    const maxVal = opts.max || Math.max.apply(null, data.map(d => d.value)) * 1.15;
    const padTop = 22, padBottom = 42, padStart = isHoriz ? 96 : 40, padEnd = 14;
    const plotW = W - padStart - padEnd;
    const plotH = H - padTop - padBottom;
    const n = data.length;

    // خطوط الشبكة
    ctx.strokeStyle = 'rgba(34,211,238,0.08)';
    ctx.fillStyle = 'rgba(143,165,201,0.7)';
    ctx.font = '11px "Segoe UI", Tahoma, sans-serif';
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let g = 0; g <= gridLines; g++) {
      const v = (maxVal / gridLines) * g;
      if (isHoriz) {
        const x = padStart + (plotW * g / gridLines);
        ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, padTop + plotH); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(Math.round(v) + (opts.suffix || ''), x, padTop + plotH + 6);
      } else {
        const y = padTop + plotH - (plotH * g / gridLines);
        ctx.beginPath(); ctx.moveTo(padStart, y); ctx.lineTo(padStart + plotW, y); ctx.stroke();
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(v) + (opts.suffix || ''), padStart - 6, y);
      }
    }

    const slot = isHoriz ? plotH / n : plotW / n;
    const barThickness = isHoriz ? Math.min(26, slot * 0.62) : Math.min(58, slot * 0.58);

    data.forEach((d, i) => {
      const color = d.color || opts.color || '#22d3ee';
      const grad = ctx.createLinearGradient(
        isHoriz ? padStart : 0,
        isHoriz ? 0 : padTop,
        isHoriz ? 0 : padStart + plotW,
        isHoriz ? padTop + plotH : 0
      );
      grad.addColorStop(0, color);
      grad.addColorStop(1, shade(color, 28));

      if (isHoriz) {
        const y = padTop + slot * i + (slot - barThickness) / 2;
        const bw = Math.max(2, (d.value / maxVal) * plotW);
        roundRect(ctx, padStart, y, bw, barThickness, 5);
        ctx.fillStyle = grad; ctx.fill();
        ctx.fillStyle = '#e8f0ff'; ctx.font = 'bold 12.5px "Segoe UI", Tahoma, sans-serif';
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(trimLabel(d.label, 20), padStart - 10, y + barThickness / 2);
        ctx.fillStyle = shade(color, 40);
        ctx.textAlign = 'left';
        ctx.fillText(d.value + (opts.suffix || ''), padStart + bw + 8, y + barThickness / 2);
      } else {
        const x = padStart + slot * i + (slot - barThickness) / 2;
        const bh = Math.max(2, (d.value / maxVal) * plotH);
        roundRect(ctx, x, padTop + plotH - bh, barThickness, bh, 6);
        ctx.fillStyle = grad; ctx.fill();
        ctx.fillStyle = shade(color, 40);
        ctx.font = 'bold 13px "Segoe UI", Tahoma, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillText(d.value + (opts.suffix || ''), x + barThickness / 2, padTop + plotH - bh - 6);
        ctx.fillStyle = '#8fa5c9';
        ctx.font = '12px "Segoe UI", Tahoma, sans-serif';
        ctx.textBaseline = 'top';
        fillWrapped(ctx, trimLabel(d.label, 16), x + barThickness / 2, padTop + plotH + 8, barThickness + 16, 15);
      }
    });
  }

  function drawLineChart(canvas, labels, values, opts) {
    opts = opts || {};
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) return;
    const dpr = window.devicePixelRatio || 1;
    const W = rect.width, H = rect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const maxVal = opts.max || Math.max.apply(null, values) * 1.18;
    const minVal = opts.min || 0;
    const padTop = 30, padBottom = 38, padStart = 62, padEnd = 20;
    const plotW = W - padStart - padEnd;
    const plotH = H - padTop - padBottom;

    // شبكة
    ctx.strokeStyle = 'rgba(34,211,238,0.08)';
    ctx.fillStyle = 'rgba(143,165,201,0.7)';
    ctx.font = '11px "Segoe UI", Tahoma, sans-serif';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 5; g++) {
      const y = padTop + plotH - (plotH * g / 5);
      ctx.beginPath(); ctx.moveTo(padStart, y); ctx.lineTo(padStart + plotW, y); ctx.stroke();
      const v = minVal + (maxVal - minVal) * g / 5;
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(opts.suffix === '%' ? v.toFixed(0) + '%' : fmt(Math.round(v)), padStart - 8, y);
    }

    const n = values.length;
    const px = (i) => padStart + (plotW * i / (n - 1));
    const py = (v) => padTop + plotH - ((v - minVal) / (maxVal - minVal)) * plotH;

    // تدرج تحت الخط
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
    grad.addColorStop(0, 'rgba(34,211,238,0.32)');
    grad.addColorStop(1, 'rgba(34,211,238,0.01)');
    ctx.beginPath();
    ctx.moveTo(px(0), padTop + plotH);
    values.forEach((v, i) => ctx.lineTo(px(i), py(v)));
    ctx.lineTo(px(n - 1), padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // الخط
    ctx.beginPath();
    values.forEach((v, i) => i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v)));
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(34,211,238,0.55)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // النقاط والقيم
    values.forEach((v, i) => {
      ctx.beginPath();
      ctx.arc(px(i), py(v), 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#060d1f';
      ctx.fill();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#f4f8ff';
      ctx.font = 'bold 13px "Segoe UI", Tahoma, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(opts.suffix === '%' ? v + '%' : fmt(v), px(i), py(v) - 12);
    });

    // المحور الأفقي
    ctx.fillStyle = '#8fa5c9';
    ctx.font = '12px "Segoe UI", Tahoma, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    labels.forEach((l, i) => ctx.fillText(l, px(i), padTop + plotH + 10));
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function shade(hex, amt) {
    const c = hex.replace('#', '');
    let r = parseInt(c.substring(0, 2), 16),
        g = parseInt(c.substring(2, 4), 16),
        b = parseInt(c.substring(4, 6), 16);
    r = Math.max(0, Math.min(255, r - amt));
    g = Math.max(0, Math.min(255, g - amt));
    b = Math.max(0, Math.min(255, b - amt));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function trimLabel(s, n) {
    return s.length > n ? s.substring(0, n - 1) + '…' : s;
  }

  function fillWrapped(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '', ly = y;
    for (let i = 0; i < words.length; i++) {
      const test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && i > 0) {
        ctx.fillText(line, x, ly); line = words[i] + ' '; ly += lineHeight;
      } else { line = test; }
    }
    ctx.fillText(line, x, ly);
  }

  const CHARTS = [];
  function regChart(fn) { CHARTS.push(fn); fn(); }

  /* =========================================================
     وضع العرض التقديمي — الحالة
     ========================================================= */
  let presMode = false;

  /* =========================================================
     تأثيرات أسطورية — جزيئات، تتبع المؤشر، عدّ الأرقام
     ========================================================= */
  function buildParticles() {
    const box = $('bgParticles');
    if (!box) return;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const n = 26;
    let html = '';
    for (let i = 0; i < n; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 14;
      const dur = 10 + Math.random() * 12;
      const size = 2 + Math.random() * 3;
      const cyan = Math.random() > 0.5;
      html += '<i style="left:' + left.toFixed(2) + '%;animation-delay:' + delay.toFixed(2) + 's;' +
        'animation-duration:' + dur.toFixed(2) + 's;width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;' +
        (cyan ? '' : 'background:var(--blue-bright);box-shadow:0 0 8px var(--blue-bright)') + '"></i>';
    }
    box.innerHTML = html;
  }

  /* توهّج يتبع المؤشر داخل بطاقات المؤشرات */
  function bindPointerGlow() {
    if (!window.PointerEvent) return;
    document.addEventListener('pointermove', (e) => {
      const kpi = e.target.closest && e.target.closest('.kpi');
      if (!kpi) return;
      const r = kpi.getBoundingClientRect();
      kpi.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      kpi.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* عدّ الأرقام تصاعدياً عند الظهور */
  function countUp(el, target, opts) {
    opts = opts || {};
    const dur = opts.duration || 1400;
    const dec = opts.decimals !== undefined ? opts.decimals : 0;
    const prefix = opts.prefix || '';
    const suffix = opts.suffix || '';
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.textContent = prefix + target.toFixed(dec) + suffix;
      return;
    }
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      // منحنى خروج ناعم
      const eased = 1 - Math.pow(1 - p, 3);
      const val = target * eased;
      el.textContent = prefix + (dec ? val.toFixed(dec) : Math.round(val).toLocaleString('en-US')) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + (dec ? target.toFixed(dec) : target.toLocaleString('en-US')) + suffix;
    }
    requestAnimationFrame(frame);
  }

  /* شريط تقدّم أعلى الصفحة عند التنقل بين الأقسام */
  function buildRouteBar() {
    if (document.getElementById('routeBar')) return;
    const bar = document.createElement('div');
    bar.id = 'routeBar';
    bar.style.cssText =
      'position:fixed;top:0;inset-inline:0;height:3px;z-index:300;pointer-events:none;' +
      'background:linear-gradient(90deg,var(--cyan),var(--blue-bright),var(--violet));' +
      'transform:scaleX(0);transform-origin:right center;opacity:0;' +
      'transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .3s ease;' +
      'box-shadow:0 0 14px rgba(34,211,238,.6)';
    document.body.appendChild(bar);
  }

  function pulseRouteBar() {
    const bar = $('routeBar');
    if (!bar) return;
    bar.style.transform = 'scaleX(1)';
    bar.style.opacity = '1';
    setTimeout(() => {
      bar.style.transformOrigin = 'left center';
      bar.style.transform = 'scaleX(0)';
      bar.style.opacity = '0';
      setTimeout(() => { bar.style.transformOrigin = 'right center'; }, 500);
    }, 350);
  }

  /* =========================================================
     نظام الثيمات — تبديل المظهر والألوان
     ========================================================= */
  const THEMES = ['dark', 'light', 'violet', 'matrix', 'crimson', 'ocean'];
  const THEME_NAMES = { dark: 'داكن', light: 'فاتح', violet: 'بنفسجي', matrix: 'مصفوفة', crimson: 'عنابي', ocean: 'محيط' };

  function applyTheme(name) {
    if (THEMES.indexOf(name) === -1) name = 'dark';
    document.documentElement.setAttribute('data-theme', name);
    document.body.setAttribute('data-theme', name);
    try { localStorage.setItem('cto-theme', name); } catch (e) {}
    document.querySelectorAll('.theme-opt').forEach(o => {
      o.classList.toggle('active', o.dataset.t === name);
    });
    // أعد رسم الخريطة والمخططات بألوان الثيم الجديد
    setTimeout(() => CHARTS.forEach(fn => fn()), 320);
  }

  function initTheme() {
    let saved = 'dark';
    try { saved = localStorage.getItem('cto-theme') || 'dark'; } catch (e) {}
    if (THEMES.indexOf(saved) === -1) saved = 'dark';
    applyTheme(saved);

    $('themeFab').innerHTML = icon('bulb');
    $('themeTitleIco').innerHTML = icon('bulb');

    $('themeFab').addEventListener('click', (e) => {
      e.stopPropagation();
      $('themePanel').classList.toggle('open');
    });

    document.querySelectorAll('.theme-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.t);
      });
    });

    // إغلاق اللوحة عند النقر خارجها
    document.addEventListener('click', (e) => {
      const sw = $('themeSwitcher');
      if (sw && !sw.contains(e.target)) {
        $('themePanel').classList.remove('open');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $('themePanel').classList.remove('open');
    });
  }

  /* =========================================================
     التنقل بين الأقسام
     ========================================================= */
  const SECTIONS = [
    { id: 'dashboard', name: 'لوحة المعلومات', icon: 'dashboard' },
    { id: 'map', name: 'خريطة التهديدات', icon: 'globe' },
    { id: 'stats', name: 'الإحصائيات', icon: 'chart' },
    { id: 'library', name: 'مكتبة التهديدات', icon: 'book' },
    { id: 'lab', name: 'مختبر التصيد', icon: 'lab' },
    { id: 'osint', name: 'الهندسة الاجتماعية OSINT', icon: 'eye' },
    { id: 'quiz', name: 'الاختبارات', icon: 'quiz' },
    { id: 'awareness', name: 'ركن التوعية', icon: 'bulb' },
    { id: 'try', name: 'جرّب بنفسك', icon: 'tools' },
    { id: 'ai', name: 'اركان — المساعد الذكي', icon: 'robot' },
    { id: 'about', name: 'عن الموقع', icon: 'user' },
    { id: 'sources', name: 'المصادر', icon: 'sources' }
  ];

  const PRES_ORDER = ['dashboard', 'map', 'stats', 'library', 'lab', 'osint', 'quiz', 'awareness', 'try', 'ai', 'about', 'sources'];
  let currentSection = 'dashboard';

  function showSection(id, push) {
    currentSection = id;
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = $('section-' + id);
    if (target) target.classList.add('active');

    document.querySelectorAll('[data-section]').forEach(a => {
      a.classList.toggle('active', a.dataset.section === id);
    });

    // عنوان الصفحة
    const meta = SECTIONS.find(s => s.id === id);
    document.title = meta ? (meta.name + ' — مرصد التهديدات السيبرانية') : 'مرصد التهديدات السيبرانية';

    if (push !== false && location.hash !== '#' + id) {
      history.replaceState(null, '', '#' + id);
    }

    // إغلاق قائمة الجوال
    $('navLinks').classList.remove('open');
    const backdrop = $('menuBackdrop');
    if (backdrop) backdrop.classList.remove('show');
    const navToggle = $('navToggle');
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.innerHTML = icon('menu');
    }

    // شريط تقدّم أعلى الصفحة
    pulseRouteBar();

    // إعادة رسم المخططات التي أصبحت مرئية + تهيئة/تحجيم الخريطة
    if (id === 'map') {
      // على الشاشات الصغيرة يحتاج #map وقتاً لأخذ أبعاده النهائية قبل إنشاء الخريطة
      requestAnimationFrame(() => {
        CHARTS.forEach(fn => fn());
        if (!mapBuilt) initMapInstance();
        else if (mapInstance && typeof mapInstance.updateSize === 'function') {
          try { mapInstance.updateSize(); } catch (e) {}
          setTimeout(() => { try { mapInstance.updateSize(); } catch (e) {} }, 250);
        }
      });
    } else {
      setTimeout(() => CHARTS.forEach(fn => fn()), 60);
    }

    window.scrollTo({ top: 0, behavior: presMode ? 'auto' : 'smooth' });
  }

  /* =========================================================
     بناء شريط التنقل
     ========================================================= */
  function buildNav() {
    $('brandLogo').innerHTML = icon('radar');
    $('brandLogo2').innerHTML = icon('radar');

    $('navLinks').innerHTML = SECTIONS.map(s =>
      '<a href="#' + s.id + '" class="nav-link' + (s.id === 'dashboard' ? ' active' : '') +
      '" data-section="' + s.id + '">' + icon(s.icon) + '<span>' + s.name + '</span></a>'
    ).join('');

    $('sidebar').querySelector('.sidebar-group').innerHTML =
      '<span class="sidebar-label">أقسام المرصد</span>' + SECTIONS.map(s =>
        '<a href="#' + s.id + '" class="side-link' + (s.id === 'dashboard' ? ' active' : '') +
        '" data-section="' + s.id + '">' + icon(s.icon) + '<span>' + s.name + '</span></a>'
      ).join('');

    $('navToggle').innerHTML = icon('menu');
    function closeMenu() {
      $('navLinks').classList.remove('open');
      $('menuBackdrop').classList.remove('show');
      $('navToggle').setAttribute('aria-expanded', 'false');
      $('navToggle').innerHTML = icon('menu');
    }
    $('navToggle').addEventListener('click', () => {
      const open = $('navLinks').classList.toggle('open');
      $('menuBackdrop').classList.toggle('show', open);
      $('navToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
      $('navToggle').innerHTML = icon(open ? 'x' : 'menu');
    });
    // إغلاق القائمة عند الضغط على أي رابط داخلها
    document.querySelectorAll('#navLinks .nav-link').forEach(a => {
      a.addEventListener('click', closeMenu);
    });
    // إغلاق عند الضغط على الفراغ بين الروابط (القائمة تغطي الشاشة)
    $('navLinks').addEventListener('click', (e) => {
      if (e.target.id === 'navLinks') closeMenu();
    });
    // إغلاق عند الضغط على الخلفية المعتمة
    $('menuBackdrop').addEventListener('click', closeMenu);
    // إغلاق بمفتاح Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('navLinks').classList.contains('open')) closeMenu();
    });
    $('btnPresent').innerHTML = icon('play') + '<span class="hide-sm">عرض</span>';
    $('btnReset').innerHTML = icon('reset');

    $('sidebarNote').innerHTML =
      '<strong>' + icon('alert').replace('<svg', '<svg style="width:15px;height:15px;display:inline;vertical-align:-2px;color:#22d3ee"') +
      ' تنبيه مهم</strong>' +
      'الإحصائيات الرقمية مبنية على تقارير منشورة ومصادرها مذكورة. خريطة التهديدات <b>بيانات حقيقية مرصودة</b> من abuse.ch ThreatFox بتاريخ 2026-10-12. ' +
      'لا يجمع الموقع أي بيانات عن الزوار.';

    $('footNote').innerHTML = icon('radar').replace('<svg', '<svg style="width:15px;height:15px;display:inline;vertical-align:-2px;color:#22d3ee"') +
      ' <b>مرصد التهديدات السيبرانية</b> — منصة توعوية تعليمية، لا تُغني عن الجهات الرسمية.';
    $('footCredit').innerHTML = 'برمجة: <b>الأمين نايف دواغره</b> — شرح الطلاب: <b>فهد العتيبي، عمر السيد، محمد صفحي</b> — بإشراف <b>أستاذ عادل الزهراني</b>';
    $('footUpdate').innerHTML = 'آخر تحديث للمحتوى: <b>' + CONTENT_META.lastUpdated + '</b>';

    // أحداث النقر على روابط الأقسام
    document.querySelectorAll('[data-section]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(a.dataset.section);
      });
    });

    // (أزرار القائمة مُعرَّفة أعلاه — navToggle و menuBackdrop)
    document.querySelectorAll('[data-home]').forEach(el => {
      el.addEventListener('click', (e) => { e.preventDefault(); showSection('dashboard'); });
    });
  }

  /* =========================================================
     1. لوحة المعلومات
     ========================================================= */
  function buildDashboard() {
    $('dashUpdateBar').innerHTML =
      icon('clock') +
      '<span>آخر تحديث للمحتوى: <b>' + CONTENT_META.lastUpdated + '</b></span>' +
      '<span>' + CONTENT_META.dataStatus + '</span>' +
      '<span class="spacer"></span>' +
      '<span class="tag tag-real">مؤشرات موثقة بمصادرها</span>';

    // بطاقات المؤشرات
    $('kpiGrid').innerHTML = KPI_DATA.map(k => {
      const src = SOURCES[k.source];
      const trendIcon = k.trend === 'up' ? 'trendUp' : k.trend === 'down' ? 'trendDown' : 'trendSame';
      return '<div class="kpi">' +
        '<div class="kpi-label">' + icon(k.icon) + '<span>' + k.label + '</span></div>' +
        '<div class="kpi-value"><span class="kpi-num" data-target="' + k.value.replace(/,/g, '') + '">0</span><span class="unit">' + k.unit + '</span></div>' +
        '<div class="kpi-meta">' +
        '<span class="kpi-trend ' + k.trend + '">' + icon(trendIcon) + '<span style="font-weight:600">' + k.trendText + '</span></span>' +
        '</div>' +
        '<div class="kpi-meta"><span class="tag tag-src">' + src.name.split('—')[0].trim() + ' · ' + k.period + '</span></div>' +
        '</div>';
    }).join('');

    // عدّ الأرقام تصاعدياً (مرة واحدة فقط)
    if (!dashboardCounted) {
      dashboardCounted = true;
      document.querySelectorAll('#kpiGrid .kpi-num').forEach(el => {
        const t = parseFloat(el.dataset.target);
        if (!isNaN(t)) countUp(el, t, { duration: 1500 });
      });
    }

    // رسم أنواع التهديدات
    const tt = THREAT_TYPES, tsrc = SOURCES[tt.source];
    $('chartThreatTitle').innerHTML = icon('chart') + '<span>' + tt.title + '</span>';
    $('chartThreatDesc').innerHTML = 'المصدر: <b>' + tsrc.name + '</b> — ' + tt.period + '.';
    $('chartThreatLegend').innerHTML = tt.data.map(d =>
      '<span class="legend-item"><span class="legend-dot" style="background:' + d.color + '"></span>' + d.label + ' (' + d.value + '%)</span>'
    ).join('');

    regChart(() => drawBarChart($('chartThreats'), tt.data.map(d => ({
      label: d.label, value: d.value, color: d.color
    })), { horizontal: true, suffix: '%', max: 65 }));

    // رسم اتجاه التصيد
    const pt = PHISHING_TREND, psrc = SOURCES[pt.source];
    $('chartPhishTitle').innerHTML = icon('trendUp') + '<span>' + pt.title + '</span>';
    $('chartPhishDesc').innerHTML = 'المصدر: <b>' + psrc.name + '</b> — ' + pt.period + '.';
    regChart(() => drawLineChart($('chartPhishing'), pt.labels, pt.values, {}));

    // رسم الفدية (اتجاه)
    const rt = RANSOM_TREND, rsrc = SOURCES[rt.source];
    $('chartRansomTitle').innerHTML = icon('ransom') + '<span>' + rt.title + '</span>';
    $('chartRansomDesc').innerHTML = 'المصدر: <b>' + rsrc.name + '</b> — ' + rt.period + '. ' + rt.note;
    regChart(() => drawLineChart($('chartRansom'), rt.labels, rt.values, { suffix: '%', max: 100 }));
  }

  /* =========================================================
     2. خريطة الهجمات العالمية (بيانات حقيقية)
     ========================================================= */
  let mapInstance = null;
  let mapBuilt = false;
  let mapInitPending = false;

  function buildMap() {
    // نصوص وشارات القسم (لا تلمس الخريطة بعد)
    $('mapTitleIcon').innerHTML = icon('globe');
    $('mapRealTag').textContent = 'بيانات حقيقية مرصودة';
    $('mapHeadTitle').innerHTML = icon('radar') + '<span>' + REAL_MAP_META.metric + ' — توزيع فعلي حسب الدولة</span>';

    $('mapUpdateBar').innerHTML =
      icon('clock') +
      '<span>تاريخ سحب البيانات: <b>' + REAL_MAP_META.pulledAt + '</b></span>' +
      '<span>المصدر: <b>' + REAL_MAP_META.source + '</b></span>' +
      '<span class="spacer"></span>' +
      '<span class="tag tag-real">' + fmt(REAL_MAP_META.totalIOCs) + ' مؤشراً مرصوداً</span>';

    $('mapNotice').innerHTML = icon('check') +
      '<span><b>بيانات حقيقية:</b> الأرقام أعلاه هي عدد خوادم القيادة (C2) النشطة التي رصدها مجتمع abuse.ch فعلياً. وجود خوادم في دولة لا يعني أن المهاجمين منها — غالباً ما تكون مستضافة على خوادم سحابية مستأجرة.</span>';

    $('mapLegend').innerHTML =
      '<span><span class="dot" style="background:#22d3ee"></span>كثافة مرصودة عالية</span>' +
      '<span><span class="dot" style="background:#3b82f6"></span>كثافة متوسطة</span>' +
      '<span><span class="dot" style="background:#1e3a6f"></span>كثافة منخفضة</span>' +
      '<span class="spacer" style="margin-inline-start:auto;color:#8fa5c9">اضغط على أي دولة لعرض تفاصيلها · استخدم أزرار التكبير أو عجلة الفأرة</span>';

    renderMapPanelHint();
    renderMapInsights();
  }

  function renderMapPanelHint() {
    $('mapPanel').innerHTML =
      '<div class="panel-hint">' + icon('globe') +
      'اضغط على أي دولة في الخريطة<br>لعرض إحصائياتها الحقيقية هنا</div>';
  }

  function renderMapInsights() {
    const box = document.createElement('div');
    box.innerHTML = MAP_INSIGHTS.map(i =>
      '<div class="insight-card"><div class="insight-ico">' + icon(i.icon) + '</div>' +
      '<div><h4>' + i.title + '</h4><p>' + i.body + '</p></div></div>'
    ).join('');
    $('mapPanel').appendChild(box);
  }

  function showCountryPanel(code) {
    const c = FOCUS_COUNTRIES.find(x => x.code === code);
    const allCount = REAL_ALL_COUNTRIES[code] || 0;
    const panel = $('mapPanel');
    if (!panel) return;

    // تدفقات الهجمات المرتبطة بهذه الدولة
    const flows = ATTACK_FLOWS.filter(f => f.from === code || f.to === code).slice(0, 5);
    const maxMw = c && c.topMalware.length ? Math.max.apply(null, c.topMalware.map(m => m[1])) : 1;

    panel.innerHTML =
      '<div class="panel-card focus-country">' +
        '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
          '<span class="panel-flag">' + (c ? c.flag : '🌐') + '</span>' +
          '<div><div class="panel-country-name">' + (c ? c.name : code) + '</div>' +
          '<div class="panel-country-sub">بيانات رصد فعلية — ' + REAL_MAP_META.pulledAt + '</div></div>' +
        '</div>' +

        '<div class="panel-stat-grid">' +
          '<div class="panel-stat"><div class="v">' + fmt(allCount) + '</div><div class="l">مؤشرات C2 مرصودة</div></div>' +
          '<div class="panel-stat"><div class="v">' + (c ? fmt(c.uniqueIps) : '—') + '</div><div class="l">عناوين IP فريدة</div></div>' +
          '<div class="panel-stat"><div class="v">' + (c ? c.dailyAvg.toFixed(1) : '—') + '</div><div class="l">متوسط يومي (تقديري)</div></div>' +
          '<div class="panel-stat"><div class="v">' + (c ? fmt(c.c2_2026) : '—') + '</div><div class="l">رُصدت عام 2026</div></div>' +
        '</div>' +

        (c && c.topMalware.length ?
          '<div class="panel-section-title">' + icon('alert') + 'أخطر البرمجيات المستضافة فيها</div>' +
          '<div class="panel-malware">' + c.topMalware.map(m =>
            '<div class="panel-mw-row"><span class="panel-mw-name">' + m[0] + '</span>' +
            '<span class="panel-mw-bar"><span style="width:' + Math.round(m[1] / maxMw * 100) + '%"></span></span>' +
            '<span class="panel-mw-val">' + m[1] + '</span></div>'
          ).join('') + '</div>' : '') +

        (c ? '<div class="panel-note">' + c.note + '</div>' : '') +

        '<div class="panel-section-title">' + icon('book') + 'مصادر هذا البلد</div>' +
        '<div class="panel-sources">' +
          (c && c.sources ? c.sources : [{ name: REAL_MAP_META.source, url: REAL_MAP_META.sourceUrl }]).map(s =>
            '<a class="panel-source-link" href="' + s.url + '" target="_blank" rel="noopener noreferrer">' + icon('ext') + '<span>' + s.name + '</span></a>'
          ).join('') +
        '</div>' +

        (flows.length ?
          '<div class="panel-section-title">' + icon('arrowLeft') + 'تدفقات الهجمات المرتبطة</div>' +
          '<div class="panel-flows">' + flows.map(f =>
            '<div class="panel-flow"><span class="fr">' +
            (FOCUS_COUNTRIES.find(x => x.code === f.from) || {}).flag +
            '<span>' + (FOCUS_COUNTRIES.find(x => x.code === f.from) || { name: f.from }).name + '</span>' +
            '<span class="arrow">' + icon('arrowLeft') + '</span>' +
            '<span>' + (FOCUS_COUNTRIES.find(x => x.code === f.to) || { name: f.to }).name + '</span>' +
            (FOCUS_COUNTRIES.find(x => x.code === f.to) || {}).flag +
            '</span><span class="fv">' + fmt(f.value) + '</span>' +
            '<div class="ft">' + f.type + '</div></div>'
          ).join('') + '</div>' : '') +

        '<button class="btn" style="width:100%;margin-top:13px" id="panelBack">' + icon('arrowRight') + '<span>عرض كل الدول</span></button>' +
      '</div>';

    const back = $('panelBack');
    if (back) back.addEventListener('click', () => { renderMapPanelHint(); renderMapInsights(); });
  }

  /* تُنشئ الخريطة فعلياً — تُستدعى فقط عندما يكون قسم الخريطة مرئياً */
  function initMapInstance() {
    if (mapBuilt || mapInitPending) return;
    const el = $('map');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) { scheduleMapInit(); return; }
    mapInitPending = true;

    if (typeof jsVectorMap === 'undefined') {
      mapInitPending = false;
      el.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:#8fa5c9;text-align:center;padding:20px">تعذّر تحميل بيانات الخريطة التفاعلية.<br>لكن بقية أقسام الموقع تعمل بشكل كامل.</div>';
      return;
    }

    try {
      mapInstance = new jsVectorMap({
        selector: '#map',
        map: 'world',
        zoomButtons: true,
        zoomOnScroll: true,
        zoomMax: 12,
        zoomStep: 1.6,
        zoomAnimate: true,
        regionsSelectable: true,
        regionsSelectableOne: true,
        markersSelectable: false,
        backgroundColor: 'transparent',
        regionStyle: {
          initial: { fill: '#16264c', stroke: '#223a6e', strokeWidth: 0.6 },
          hover: { fill: '#2c56a8', cursor: 'pointer' },
          selected: { fill: '#22d3ee', cursor: 'pointer' }
        },
        series: {
          regions: [{
            attribute: 'fill',
            scale: { low: '#16264c', high: '#22d3ee' },
            values: REAL_ALL_COUNTRIES,
            legend: false
          }]
        },
        onRegionSelected: function (event, code, isSelected, selectedRegions) {
          if (isSelected && (REAL_ALL_COUNTRIES[code] || FOCUS_COUNTRIES.find(x => x.code === code))) {
            showCountryPanel(code);
          } else if (!selectedRegions || selectedRegions.length === 0) {
            renderMapPanelHint();
            renderMapInsights();
          }
        },
        onRegionTooltipShow: function (elTip, code) {
          const cnt = REAL_ALL_COUNTRIES[code];
          const c = FOCUS_COUNTRIES.find(x => x.code === code);
          if (!cnt && !c) { elTip.style.display = 'none'; return; }
          elTip.innerHTML =
            '<strong>' + (c ? c.flag + ' ' + c.name : code) + '</strong>' +
            '<div class="tt-row"><span>مؤشرات C2 مرصودة</span><span>' + fmt(cnt || 0) + '</span></div>' +
            (c ? '<div class="tt-row"><span>عناوين IP فريدة</span><span>' + fmt(c.uniqueIps) + '</span></div>' : '') +
            '<div class="tt-row"><span>المصدر</span><span style="font-size:0.7rem">abuse.ch</span></div>';
        },
        onRegionClick: function (event, code) {
          if (REAL_ALL_COUNTRIES[code] || FOCUS_COUNTRIES.find(x => x.code === code)) {
            showCountryPanel(code);
          }
        }
      });
      mapBuilt = true;
      mapInitPending = false;
    } catch (err) {
      mapInitPending = false;
      el.innerHTML = '<div style="display:grid;place-items:center;height:100%;color:#8fa5c9;text-align:center;padding:20px">تعذّر رسم الخريطة التفاعلية.<br>لكن بقية أقسام الموقع تعمل بشكل كامل.</div>';
    }
  }

  function scheduleMapInit() {
    if (mapInitPending || mapBuilt) return;
    mapInitPending = true;
    setTimeout(() => { mapInitPending = false; initMapInstance(); }, 120);
  }

  // إحداثيات تقريبية (غير مستخدمة حالياً — محفوظة للاستخدام المستقبلي)
  const COORDS = {
    SA: [24, 45], AE: [24, 54], EG: [27, 30], US: [39, -98], GB: [54, -2],
    DE: [51, 10], FR: [47, 2], CN: [35, 105], JP: [36, 138], IN: [22, 79],
    BR: [-10, -52], RU: [61, 90], AU: [-25, 134], CA: [56, -106], ZA: [-29, 24]
  };
  window.COORDS = COORDS;

  /* =========================================================
     3. الإحصائيات
     ========================================================= */
  function buildStats() {
    $('statsTitleIcon').innerHTML = icon('chart');
    $('statsUpdateBar').innerHTML =
      icon('clock') +
      '<span>آخر تحديث للمحتوى: <b>' + CONTENT_META.lastUpdated + '</b></span>' +
      '<span>' + CONTENT_META.dataStatus + '</span>' +
      '<span class="spacer"></span>' +
      '<span class="tag tag-real">كل رقم يحمل مصدره وفترته</span>';

    // القطاعات
    const ts = TARGETED_SECTORS, tssrc = SOURCES[ts.source];
    $('stSectorTitle').innerHTML = icon('phishing') + '<span>' + ts.title + '</span>';
    $('stSectorDesc').innerHTML = 'المصدر: <b>' + tssrc.name + '</b> — ' + ts.period + '. ' + ts.note;
    regChart(() => drawBarChart($('chartSectors'), ts.data.map((d, i) => ({
      label: d.label, value: d.value,
      color: ['#22d3ee', '#3b82f6', '#14b8a6', '#60a5fa', '#818cf8', '#1b2c52'][i] || '#22d3ee'
    })), { horizontal: true, suffix: '%', max: 38 }));

    // اتجاه الفدية
    const rtr = RANSOM_TREND, rtsrc = SOURCES[rtr.source];
    $('stRansomTrendTitle').innerHTML = icon('ransom') + '<span>' + rtr.title + '</span>';
    $('stRansomTrendDesc').innerHTML = 'المصدر: <b>' + rtsrc.name + '</b> — ' + rtr.period + '.';
    regChart(() => drawLineChart($('chartRansomTrend'), rtr.labels, rtr.values, { suffix: '%', max: 100 }));

    // مسارات الدخول
    const cd = CREDENTIAL_DATA, cdsrc = SOURCES[cd.source];
    $('stCredTitle').innerHTML = icon('credential') + '<span>' + cd.title + '</span>';
    $('stCredDesc').innerHTML = 'المصدر: <b>' + cdsrc.name + '</b> — ' + cd.period + '. ' + cd.note;
    regChart(() => drawBarChart($('chartCredential'), cd.data.map(d => ({
      label: d.label, value: d.value, color: d.color
    })), { horizontal: true, suffix: '%', max: 50 }));

    // تقسيم الفدية
    const rs = RANSOMWARE_SERIES, rssrc = SOURCES[rs.source];
    $('stRansomSplitTitle').innerHTML = icon('shield') + '<span>' + rs.title + '</span>';
    $('stRansomSplitDesc').innerHTML = 'المصدر: <b>' + rssrc.name + '</b> — ' + rs.period + '. ' + rs.note;
    regChart(() => drawBarChart($('chartRansomSplit'), rs.labels.map((l, i) => ({
      label: l, value: rs.values[i], color: rs.colors[i]
    })), { suffix: '%', max: 60 }));
  }

  /* =========================================================
     4. مكتبة التهديدات
     ========================================================= */
  function buildLibrary() {
    $('libTitleIcon').innerHTML = icon('book');

    const filterDefs = [{ id: 'all', name: 'كل التهديدات' }].concat(
      THREAT_LIBRARY.map(t => ({ id: t.id, name: t.name }))
    );

    $('threatFilter').innerHTML = filterDefs.map((f, i) =>
      '<button class="chip' + (i === 0 ? ' active' : '') + '" data-filter="' + f.id + '">' + f.name + '</button>'
    ).join('');

    function render(filter) {
      const items = filter === 'all' ? THREAT_LIBRARY : THREAT_LIBRARY.filter(t => t.id === filter);
      $('threatGrid').innerHTML = items.map(t =>
        '<div class="threat-card">' +
        '<div class="threat-head">' +
        '<div class="threat-icon">' + icon(t.icon) + '</div>' +
        '<div><h3>' + t.name + '</h3><span class="threat-cat">' + t.cat + '</span></div>' +
        '</div>' +
        '<div class="threat-section"><h4>' + icon('book') + 'التعريف</h4><p>' + t.def + '</p></div>' +
        '<div class="threat-section"><h4>' + icon('eye') + 'مثال توعوي</h4>' +
        '<div class="example-box">' + t.example + '</div></div>' +
        '<div class="threat-section warn-list"><h4>' + icon('alert') + 'علامات تحذيرية</h4><ul>' +
        t.signs.map(s => '<li>' + icon('alert') + '<span>' + s + '</span></li>').join('') + '</ul></div>' +
        '<div class="threat-section safe-list"><h4>' + icon('shield') + 'طرق الوقاية</h4><ul>' +
        t.prevent.map(s => '<li>' + icon('check') + '<span>' + s + '</span></li>').join('') + '</ul></div>' +
        '</div>'
      ).join('');
    }

    render('all');

    $('threatFilter').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#threatFilter .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      render(chip.dataset.filter);
    });
  }

  /* =========================================================
     5. مختبر التصيد التفاعلي
     ========================================================= */
  const labState = { answered: {}, score: 0 };

  function buildLab() {
    $('labTitleIcon').innerHTML = icon('lab');
    $('labIcon').innerHTML = icon('lab');
    $('labReset').innerHTML = icon('reset') + '<span>إعادة المختبر</span>';

    function render() {
      $('labGrid').innerHTML = PHISHING_LAB.map(item => {
        const st = labState.answered[item.id];
        const msgIcon = item.type.indexOf('بريد') !== -1 ? 'mail' : 'msg';
        return '<div class="lab-item">' +
          '<div style="display:flex;align-items:center;gap:8px;justify-content:space-between">' +
          '<span class="tag tag-src">' + icon(msgIcon) + ' ' + item.type + '</span>' +
          (st ? '<span class="lab-score">إجابتك: <b>' + (st === 'suspicious' ? 'مشبوهة' : 'سليمة') + '</b></span>' : '') +
          '</div>' +
          '<div class="msg-box">' +
          '<div class="msg-top">' +
          '<div class="msg-from">' + icon(msgIcon) + '<span>' + item.from + '</span></div>' +
          '<div class="msg-sub"><b>الموضوع:</b> ' + item.subject + '</div>' +
          '</div>' +
          '<div class="msg-body">' + item.body.replace(/\n/g, '<br>') + '</div>' +
          '</div>' +
          '<div class="lab-actions">' +
          '<button class="btn" data-answer="suspicious" data-id="' + item.id + '" ' + (st ? 'disabled' : '') + '>مشبوهة</button>' +
          '<button class="btn" data-answer="legit" data-id="' + item.id + '" ' + (st ? 'disabled' : '') + '>سليمة</button>' +
          '</div>' +
          '<div class="lab-verdict ' + (item.isSuspicious ? 'suspicious' : 'legit') + (st ? ' show' : '') + '" id="verdict-' + item.id + '">' +
          (st ? renderVerdict(item) : '') +
          '</div>' +
          '</div>';
      }).join('');

      $('labScore').textContent = labState.score;
      $('labTotal').textContent = PHISHING_LAB.length;
    }

    function renderVerdict(item) {
      const correctLabel = item.isSuspicious ? 'هذه رسالة مشبوهة (تصيد)' : 'هذه رسالة سليمة';
      const vIcon = item.isSuspicious ? 'alert' : 'check';
      return '<strong>' + icon(vIcon) + correctLabel + '</strong>' +
        '<div>' + item.reason + '</div>' +
        '<ul>' + item.signs.map(s => '<li>' + icon('eye') + '<span>' + s + '</span></li>').join('') + '</ul>';
    }

    render();

    $('labGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-answer]');
      if (!btn) return;
      const item = PHISHING_LAB.find(x => x.id === btn.dataset.id);
      const choice = btn.dataset.answer;
      if (labState.answered[item.id]) return;

      const wasRight = (choice === 'suspicious') === item.isSuspicious;
      labState.answered[item.id] = choice;
      if (wasRight) labState.score++;

      // أظهر التفسير
      const v = $('verdict-' + item.id);
      if (v) {
        v.innerHTML = renderVerdict(item);
        v.classList.add('show');
      }
      // حدّث البطاقات ونقطة النتيجة
      render();
      const vAfter = $('verdict-' + item.id);
      if (vAfter) vAfter.classList.add('show');
    });

    $('labReset').addEventListener('click', () => {
      labState.answered = {}; labState.score = 0;
      render();
    });
  }

  /* =========================================================
     5.5 الهندسة الاجتماعية — تعريف + دراسات حالة + تحدي
     ========================================================= */
  let dashboardCounted = false;

  function buildSocialEng() {
    $('seTitleIcon').innerHTML = icon('social');

    /* --- التعريف الشامل --- */
    $('seIntro').innerHTML =
      '<div class="se-intro-flag">' + icon('social') + '</div>' +
      '<div class="se-intro-body">' +
        '<h2>' + SE_INTRO.title + '</h2>' +
        '<p class="se-def">' + SE_INTRO.def + '</p>' +
        '<p class="se-why">' + SE_INTRO.why + '</p>' +
      '</div>';

    /* --- المبادئ --- */
    $('sePrinTitle').innerHTML = icon('bulb') + '<span>المبادئ الستة التي يعتمد عليها المهاجم</span>';
    $('sePrinDesc').textContent = 'كل عملية انتحال ناجحة تستغل واحداً أو أكثر من هذه المبادئ. تعلّمها لتتعرف عليها قبل أن تقع فيها.';
    $('sePrinciples').innerHTML = SE_INTRO.principles.map((p, i) =>
      '<div class="se-principle" style="animation-delay:' + (i * 0.07) + 's">' +
        '<div class="se-p-head"><span class="se-p-ico">' + icon(p.icon) + '</span>' +
        '<div><span class="se-p-num">المبدأ ' + (i + 1) + '</span><h4>' + p.name + '</h4></div></div>' +
        '<p class="se-p-desc">' + p.desc + '</p>' +
        '<div class="se-p-ex">' + icon('eye') + '<span>' + p.example + '</span></div>' +
      '</div>'
    ).join('');
    $('seChain').innerHTML = icon('radar') + '<span>' + SE_INTRO.chain + '</span>';

    /* --- دراسات الحالة --- */
    $('seCasesTitle').innerHTML = icon('eye') + '<span>التجربة العملية — تحليل صورتين</span>';
    $('seCasesDesc').textContent = 'قصة افتراضية لكل صورة، مع استخراج المعلومات التي يستطيع المهاجم جمعها عبر مبادئ الهندسة الاجتماعية.';

    // سالم (آمنة) = المقهى = حالة_3 | نورة (خطرة) = الجامعة = حالة_2 | أحمد (تحدي) = التخرج = حالة_1
    const imgMap = { safe: 'assets/صور/حالة_3.jpg', unsafe: 'assets/صور/حالة_2.jpg', challenge: 'assets/صور/حالة_1.jpg' };
    const twoCases = [CASE_STUDY_SAFE, CASE_STUDY_UNSAFE];

    $('seCases').innerHTML = twoCases.map(c =>
      '<div class="se-case ' + (c.verdict === 'safe' ? 'se-safe' : 'se-unsafe') + '">' +
        '<div class="se-case-img">' +
          '<img src="' + imgMap[c.id] + '" alt="' + c.title + '" loading="lazy" data-zoom="' + imgMap[c.id] + '">' +
          '<span class="se-case-badge ' + (c.verdict === 'safe' ? 'ok' : 'no') + '">' + c.verdictLabel + '</span>' +
          '<button class="se-zoom-btn" data-zoom="' + imgMap[c.id] + '" title="تكبير الصورة" aria-label="تكبير الصورة">' + icon('search') + '</button>' +
        '</div>' +
        '<div class="se-case-body">' +
          '<h3>' + c.title + '</h3>' +
          '<div class="se-case-profile">' + icon('human') + '<span>' + c.profile + '</span></div>' +
          '<p class="se-story">' + c.story + '</p>' +
          '<div class="se-findings">' +
            c.findings.map(f =>
              '<div class="se-finding ' + (f.ok ? 'ok' : 'no') + '">' +
              icon(f.ok ? 'check' : 'x') + '<span>' + f.text + '</span></div>'
            ).join('') +
          '</div>' +
          '<div class="se-extracted">' +
            '<span class="se-ext-tag">' + icon('radar') + 'ما يستخرجه المهاجم</span>' +
            '<p>' + c.extracted + '</p>' +
          '</div>' +
          '<div class="se-risk">' +
            '<span>مستوى الخطورة</span>' +
            '<div class="se-risk-bar"><span style="width:' + c.riskScore + '%"></span></div>' +
            '<b>' + c.riskScore + '%</b>' +
          '</div>' +
        '</div>' +
      '</div>'
    ).join('');

    /* --- التحدي التفاعلي --- */
    buildChallenge();

    /* --- مكبّر الصور (lightbox) --- */
    initZoomLightbox();
  }

  /* نافذة تكبير الصور — تعمل مع أي عنصر يحمل data-zoom */
  function initZoomLightbox() {
    if (document.getElementById('zoomLightbox')) return;

    const lb = document.createElement('div');
    lb.id = 'zoomLightbox';
    lb.className = 'zoom-lightbox hidden';
    lb.innerHTML =
      '<div class="zoom-backdrop"></div>' +
      '<div class="zoom-frame">' +
        '<img class="zoom-img" alt="صورة مكبّرة">' +
        '<button class="zoom-close" aria-label="إغلاق" title="إغلاق">✕</button>' +
        '<div class="zoom-hint">اضغط Esc أو ✕ للإغلاق</div>' +
      '</div>';
    document.body.appendChild(lb);

    const img = lb.querySelector('.zoom-img');

    function openZoom(src) {
      img.src = src;
      lb.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      pulseRouteBar();
    }
    function closeZoom() {
      lb.classList.add('hidden');
      img.src = '';
      document.body.style.overflow = '';
    }

    // ربط كل الأزرار الحالية
    document.querySelectorAll('[data-zoom]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openZoom(el.dataset.zoom);
      });
    });

    lb.querySelector('.zoom-backdrop').addEventListener('click', closeZoom);
    lb.querySelector('.zoom-close').addEventListener('click', closeZoom);
    img.addEventListener('click', closeZoom);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lb.classList.contains('hidden')) closeZoom();
    });

    // إعادة الربط للعناصر الجديدة (لو بُني المحتوى لاحقاً)
    const observer = new MutationObserver(() => {
      document.querySelectorAll('[data-zoom]:not([data-zoom-bound])').forEach(el => {
        el.setAttribute('data-zoom-bound', '1');
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openZoom(el.dataset.zoom);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function buildChallenge() {
    const c = CHALLENGE_CASE;
    $('seChallenge').innerHTML =
      '<div class="se-ch-head">' +
        '<div class="card-title">' + icon('quiz') + '<span>' + c.title + '</span></div>' +
        '<span class="tag tag-src">تحدٍّ تفاعلي</span>' +
      '</div>' +
      '<div class="se-ch-body">' +
        '<div class="se-ch-img"><img src="assets/صور/حالة_1.jpg" alt="صورة التحدي" loading="lazy" data-zoom="assets/صور/حالة_1.jpg">' +
        '<button class="se-zoom-btn" data-zoom="assets/صور/حالة_1.jpg" title="تكبير الصورة" aria-label="تكبير الصورة">' + icon('search') + '</button></div>' +
        '<div class="se-ch-side">' +
          '<p class="se-ch-prompt">' + c.prompt + '</p>' +
          '<div class="se-ch-scenario">' + icon('eye') + '<p>' + c.scenario + '</p></div>' +
          '<div class="se-ch-actions">' +
            '<button class="btn" id="chSafe">آمنة ✓</button>' +
            '<button class="btn btn-danger" id="chUnsafe">غير آمنة ✗</button>' +
          '</div>' +
          '<div class="se-ch-result" id="chResult"></div>' +
        '</div>' +
      '</div>';

    $('chSafe').addEventListener('click', () => revealChallenge('safe'));
    $('chUnsafe').addEventListener('click', () => revealChallenge('unsafe'));
  }

  function revealChallenge(choice) {
    const c = CHALLENGE_CASE;
    const right = choice === c.verdict;
    const box = $('chResult');
    if (!box) return;

    box.className = 'se-ch-result show ' + (right ? 'ok' : 'no');
    box.innerHTML =
      '<div class="se-ch-verdict ' + (right ? 'ok' : 'no') + '">' +
        icon(right ? 'check' : 'x') +
        '<span>' + (right ? 'إجابة صحيحة! ' : 'إجابة غير دقيقة. ') + 'الصحيح: ' + c.verdictLabel + '</span>' +
      '</div>' +
      '<p class="se-ch-explain">' + c.answerExplain + '</p>' +
      '<div class="se-ch-leaks">' +
        '<span class="se-ch-leaks-tag">' + icon('alert') + 'الثغرات المكتشفة</span>' +
        c.leaks.map(l =>
          '<div class="se-ch-leak">' + icon('x') +
          '<span>' + l.text + '</span>' +
          (l.must ? '<b class="must">جوهرية</b>' : '<b class="minor">ثانوية</b>') +
          '</div>'
        ).join('') +
      '</div>' +
      '<div class="se-risk">' +
        '<span>مستوى الخطورة الكلي</span>' +
        '<div class="se-risk-bar"><span style="width:' + c.riskScore + '%"></span></div>' +
        '<b>' + c.riskScore + '%</b>' +
      '</div>' +
      '<button class="btn" style="margin-top:12px;width:100%" id="chAgain">' + icon('reset') + '<span>أعد التحدي</span></button>';

    $('chSafe').disabled = true;
    $('chUnsafe').disabled = true;
    $('chAgain').addEventListener('click', () => buildChallenge());
  }

  /* =========================================================
     6. الاختبارات والتحديات
     ========================================================= */
  const quizState = { idx: 0, score: 0, locked: false, results: [] };

  function buildQuiz() {
    $('quizTitleIcon').innerHTML = icon('quiz');
    $('quizNext').innerHTML = 'السؤال التالي ' + icon('arrowLeft');
    $('quizRestart').innerHTML = icon('reset') + '<span>إعادة الاختبار</span>';

    function start() {
      quizState.idx = 0; quizState.score = 0; quizState.locked = false; quizState.results = [];
      $('quizResult').classList.add('hidden');
      $('quizPlay').classList.remove('hidden');
      renderQ();
    }

    function renderQ() {
      const q = QUIZ_QUESTIONS[quizState.idx];
      quizState.locked = false;

      $('quizQ').innerHTML = '<span class="qnum">' + (quizState.idx + 1) + '.</span>' + q.q;
      $('quizCount').innerHTML = 'السؤال <b>' + (quizState.idx + 1) + '</b> من <b>' + QUIZ_QUESTIONS.length + '</b>';
      $('quizScoreLive').innerHTML = 'النقاط: <b>' + quizState.score + '</b> / ' + QUIZ_QUESTIONS.length;
      $('quizFill').style.width = ((quizState.idx) / QUIZ_QUESTIONS.length * 100) + '%';

      $('quizOptions').innerHTML = q.options.map((o, i) =>
        '<button class="quiz-opt" data-i="' + i + '">' +
        '<span class="opt-key">' + 'ABCD'[i] + '</span><span>' + o + '</span></button>'
      ).join('');

      $('quizExplain').className = 'quiz-explain';
      $('quizExplain').innerHTML = '';
      $('quizNext').classList.add('hidden');
    }

    function answer(i) {
      if (quizState.locked) return;
      quizState.locked = true;

      const q = QUIZ_QUESTIONS[quizState.idx];
      const right = i === q.correct;
      if (right) quizState.score++;

      // تلوين الخيارات
      document.querySelectorAll('#quizOptions .quiz-opt').forEach((btn, bi) => {
        btn.disabled = true;
        if (bi === q.correct) btn.classList.add('correct');
        else if (bi === i) btn.classList.add('wrong');
      });

      // التفسير
      const src = SOURCES[q.source];
      $('quizExplain').className = 'quiz-explain show ' + (right ? 'right' : 'wrong');
      $('quizExplain').innerHTML =
        '<span class="exp-tag">' + icon(right ? 'check' : 'x') + (right ? 'إجابة صحيحة' : 'إجابة غير صحيحة') + '</span>' +
        '<div>' + q.explain + '</div>' +
        '<div class="src">' + icon('book') + 'المصدر: ' + src.name + '</div>';

      $('quizScoreLive').innerHTML = 'النقاط: <b>' + quizState.score + '</b> / ' + QUIZ_QUESTIONS.length;
      $('quizFill').style.width = ((quizState.idx + 1) / QUIZ_QUESTIONS.length * 100) + '%';

      quizState.results.push({ q: q.q, right: right, correct: q.options[q.correct], chosen: q.options[i] });

      $('quizNext').classList.remove('hidden');
      $('quizNext').innerHTML = (quizState.idx === QUIZ_QUESTIONS.length - 1 ? 'إظهار النتيجة ' : 'السؤال التالي ') + icon('arrowLeft');
    }

    function finish() {
      $('quizPlay').classList.add('hidden');
      $('quizResult').classList.remove('hidden');

      const total = QUIZ_QUESTIONS.length;
      const pct = Math.round(quizState.score / total * 100);
      $('scoreCircle').style.setProperty('--pct', pct);
      $('scoreNum').innerHTML = quizState.score + '<small> / ' + total + '</small>';

      let title, msg;
      if (pct === 100) { title = 'ممتاز! وعي كامل'; msg = 'أجبت على كل الأسئلة بشكل صحيح. شارك هذه المعرفة مع من حولك — التوعية تبدأ منك.'; }
      else if (pct >= 70) { title = 'جيد جداً'; msg = 'مستواك جيد. راجع التفسيرات التي أخطأت بها لتثبيت المعلومة.'; }
      else if (pct >= 50) { title = 'مقبول'; msg = 'لديك أساس جيد. راجع مكتبة التهديدات ومختبر التصيد لرفع مستواك.'; }
      else { title = 'يحتاج مراجعة'; msg = 'لا بأس — ابدأ بمكتبة التهديدات وركن التوعية، ثم أعد الاختبار.'; }

      $('resultTitle').textContent = title;
      $('resultMsg').textContent = msg;

      $('quizReview').innerHTML = quizState.results.map((r, i) =>
        '<div class="quiz-review-item ' + (r.right ? 'ok' : 'no') + '">' +
        icon(r.right ? 'check' : 'x') +
        '<span><b>س' + (i + 1) + ':</b> ' + r.q + '<br>' +
        (r.right ? '' : '<span style="color:#f87171">إجابتك: ' + r.chosen + ' — </span>') +
        '<span style="color:#8fa5c9">الصحيحة: ' + r.correct + '</span></span></div>'
      ).join('');
    }

    $('quizOptions').addEventListener('click', (e) => {
      const btn = e.target.closest('.quiz-opt');
      if (btn) answer(parseInt(btn.dataset.i, 10));
    });

    $('quizNext').addEventListener('click', () => {
      if (quizState.idx < QUIZ_QUESTIONS.length - 1) { quizState.idx++; renderQ(); }
      else finish();
    });

    $('quizRestart').addEventListener('click', start);

    start();
  }

  /* =========================================================
     7. ركن التوعية
     ========================================================= */
  function buildAwareness() {
    $('awTitleIcon').innerHTML = icon('bulb');
    $('slideTitle').innerHTML = icon('play') + '<span>رسائل توعوية للعرض على الشاشة</span>';
    $('slideDesc').textContent = 'رسائل قصيرة قابلة للعرض أمام الجمهور — تنقل بينها بالأسهم أو الأزرار.';
    $('slidePrev').innerHTML = icon('arrowRight');
    $('slideNext').innerHTML = icon('arrowLeft');

    let slideIdx = 0;

    function renderSlide() {
      const s = SLIDE_MESSAGES[slideIdx];
      $('slideMsg').innerHTML =
        '<div class="slide-icon">' + icon(s.icon) + '</div>' +
        '<h2>' + s.title + '</h2>' +
        '<p>' + s.body + '</p>';
      $('slideDots').innerHTML = SLIDE_MESSAGES.map((_, i) =>
        '<span class="slide-dot' + (i === slideIdx ? ' active' : '') + '" data-slide="' + i + '"></span>'
      ).join('');
    }

    $('slideDots').addEventListener('click', (e) => {
      const d = e.target.closest('.slide-dot');
      if (!d) return;
      slideIdx = parseInt(d.dataset.slide, 10);
      renderSlide();
    });

    $('slidePrev').addEventListener('click', () => {
      slideIdx = (slideIdx - 1 + SLIDE_MESSAGES.length) % SLIDE_MESSAGES.length;
      renderSlide();
    });

    $('slideNext').addEventListener('click', () => {
      slideIdx = (slideIdx + 1) % SLIDE_MESSAGES.length;
      renderSlide();
    });

    renderSlide();

    $('awarenessGrid').innerHTML = AWARENESS_TIPS.map((t, i) =>
      '<div class="tip-card">' +
      '<span class="tip-num">TIP ' + String(i + 1).padStart(2, '0') + '</span>' +
      '<h3>' + icon(t.icon) + '<span>' + t.title + '</span></h3>' +
      '<p>' + t.body + '</p>' +
      '</div>'
    ).join('');
  }

  /* =========================================================
     8.5. جرّب بنفسك — فحص الروابط + قوة كلمة المرور + تخصيص التهديدات
     ========================================================= */
  function buildTry() {
    $('tryTitleIcon').innerHTML = icon('tools');
    $('linkToolIcon').innerHTML = icon('link');
    $('passToolIcon').innerHTML = icon('key');
    $('whoToolIcon').innerHTML = icon('user');

    /* ---------- تبويبات ---------- */
    $('tryTabs').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      document.querySelectorAll('#tryTabs .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const tool = chip.dataset.tool;
      document.querySelectorAll('.try-panel').forEach(p => p.classList.add('hidden'));
      const panel = $('tryPanel-' + tool);
      if (panel) panel.classList.remove('hidden');
      pulseRouteBar();
    });

    /* ============ أداة 1: فحص الروابط ============ */
    const SHORTENERS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'cutt.ly', 'rebrand.ly', 'shorturl.at'];
    const SUSPICIOUS_WORDS = ['verify', 'account', 'login', 'secure', 'update', 'confirm', 'banking', 'wallet', 'suspended', 'locked', 'urgent', 'prize', 'winner', 'free', 'gift', 'bonus', 'refund'];
    const POPULAR = ['google', 'facebook', 'apple', 'microsoft', 'amazon', 'netflix', 'paypal', 'instagram', 'whatsapp', 'twitter', 'linkedin', 'binance', 'stc', 'alahli', 'alrajhi', 'samba', 'riyadbank', 'nca', 'sama', 'absher', 'madad', 'tawakkalna', 'gov.sa'];

    function analyzeUrl(raw) {
      const findings = [];
      let score = 0;
      const text = raw.trim();
      if (!text) return null;
      if (!/^https?:\/\//i.test(text)) {
        findings.push({ level: 'info', title: 'لم يبدأ الرابط بـ http', text: 'أكملته لك ليكون صالحاً للتحليل. الروابط الحقيقية تبدأ دائماً بـ http:// أو https://.' });
      }
      let url;
      try { url = new URL(/^https?:\/\//i.test(text) ? text : 'http://' + text); } catch (e) {
        return { url: text, score: 0, level: 'danger', verdict: 'رابط غير صالح', findings: [{ level: 'danger', title: 'تعذّر تحليل الرابط', text: 'تأكد من نسخ الرابط كاملاً بشكل صحيح.' }] };
      }
      const host = url.hostname.toLowerCase();
      const isHttps = url.protocol === 'https:';

      if (!isHttps) { score += 25; findings.push({ level: 'danger', title: 'اتصال غير مشفّر (http)', text: 'المواقع الحقيقية — خصوصاً البنوك والجهات الحكومية — تستخدم https:// دائماً. أي بيانات تُدخلها عبر http يمكن اعتراضها.' }); }

      for (const s of SHORTENERS) {
        if (host === s || host.endsWith('.' + s)) { score += 30; findings.push({ level: 'danger', title: 'رابط مُختصر يخفي وجهته', text: 'خدمات الاختصار (مثل ' + s + ') تُستخدم بكثرة في التصيّد لأنها تخفي العنوان الحقيقي. لا تضغط عليه قبل التحقق.' }); break; }
      }

      if (host.match(/^\d{1,3}(\.\d{1,3}){3}$/)) { score += 25; findings.push({ level: 'danger', title: 'العنوان أرقام بدل اسم', text: 'المواقع الرسمية تستخدم أسماء نطاقات مفهومة. عنوان من أرقام فقط (IP) علامة تصيّد شائعة.' }); }

      const hostNoWww = host.replace(/^www\./, '');
      const brandHit = POPULAR.find(b => hostNoWww.indexOf(b) !== -1);
      const brandIdx = brandHit ? hostNoWww.indexOf(brandHit) : -1;
      // النطاق الحقيقي = آخر جزئين (أو ثلاثة للنطاقات المركّبة مثل gov.sa)
      const hostParts = hostNoWww.split('.');
      const realDomain = hostParts.length > 2 && ['gov.sa', 'com.sa', 'edu.sa', 'gov.uk', 'co.uk'].indexOf(hostParts.slice(-2).join('.')) !== -1
        ? hostParts.slice(-3).join('.')
        : hostParts.slice(-2).join('.');
      // مشبوه فقط إذا كانت العلامة التجارية جزءاً من نطاق فرعي (قبل النطاق الحقيقي)
      const brandInSubdomain = brandHit && brandIdx !== -1 && realDomain.toLowerCase().indexOf(brandHit) === -1;
      if (brandHit && brandInSubdomain) {
        score += 40;
        findings.push({ level: 'danger', title: 'اسم جهة معروفة داخل نطاق غريب', text: 'النطاق الفعلي هو «' + realDomain + '» وليس "' + brandHit + '". كل ما قبل النطاق الحقيقي اسم فرعي يمكن لأي شخص إنشاؤه.' });
      } else if (brandHit && realDomain.toLowerCase().indexOf(brandHit) === -1 && hostNoWww.indexOf('-' + brandHit) !== -1) {
        score += 40;
        findings.push({ level: 'danger', title: 'اسم جهة معروفة داخل نطاق غريب', text: 'النطاق الفعلي هو «' + realDomain + '». وجود "' + brandHit + '" بعد شرطة داخل اسم فرعي محاولة للتمويه.' });
      }

      if (/\d{4,}/.test(host) && !/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) { score += 15; findings.push({ level: 'warn', title: 'أرقام مضمّنة في اسم النطاق', text: 'أرقام مثل "verify-9921" أو "account-2026" شائعة في نطاقات التصيّد لأنها تبدو عشوية.' }); }

      // انتحال الحروف بالأرقام: 0↔o، 1↔l، 3↔e، 5↔s، 4↔a
      const normalize = (s) => s.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/4/g, 'a');
      // الاسم المسجَّل = أول جزء من النطاق الحقيقي (nca.gov.sa → nca)
      const registrable = realDomain.split('.')[0];
      const normalizedReg = normalize(registrable);
      const brandHitNorm = POPULAR.find(b => normalizedReg.indexOf(b) !== -1);
      // انتحال فقط إذا: الاسم يبدأ بعلامة تجارية ثم تضاف كلمة تمويه مفصولة بشرطة
      // (مثل sama-support أو amaz0n-account-verify) — أما الأسماء الرسمية
      // مثل alrajhibank أو stcpay فتبقى سليمة
      const impersonationWords = ['support', 'verify', 'account', 'secure', 'login', 'update', 'confirm', 'help', 'service', 'billing', 'payment', 'wallet', 'official'];
      const hyphenParts = registrable.split('-');
      const hasImpersonationWord = brandHitNorm && hyphenParts.length > 1 &&
        hyphenParts.some((part, i) => i > 0 && impersonationWords.indexOf(normalize(part)) !== -1);
      const hasDigitImpersonation = brandHitNorm && /\d/.test(registrable) && registrable.toLowerCase().indexOf(brandHitNorm) === -1 && normalizedReg.indexOf(brandHitNorm) !== -1;
      if (brandHitNorm && (hasImpersonationWord || hasDigitImpersonation)) {
        score += 40;
        findings.push({ level: 'danger', title: 'انتحال اسم جهة للتمويه', text: 'النطاق المسجَّل «' + registrable + '» يجمع اسم "' + brandHitNorm + '" مع كلمات مثل الدعم أو التحقق مفصولة بشرطة — نمط معروف في التصيّد. الجهات الرسمية لا تستخدم مثل هذه الأسماء.' });
      }

      const hyphenCount = (host.match(/-/g) || []).length;
      if (hyphenCount >= 2) { score += 12; findings.push({ level: 'warn', title: 'شرطات كثيرة في النطاق', text: 'النطاق يحتوي ' + hyphenCount + ' شرطات. المواقع الرسمية نادراً ما تستخدم أكثر من شرطة واحدة.' }); }

      if (host.split('.').length > 4) { score += 10; findings.push({ level: 'warn', title: 'نطاقات فرعية متعددة', text: 'الرابط يحتوي ' + host.split('.').length + ' مستويات. التصيّد غالباً يستخدم مسارات طويلة لإيهام الضحية بالرسمية.' }); }

      const suspiciousWords = SUSPICIOUS_WORDS.filter(w => (url.pathname + url.search).toLowerCase().indexOf(w) !== -1);
      if (suspiciousWords.length) { score += 10; findings.push({ level: 'warn', title: 'كلمات إلحاح في المسار', text: 'المسار يحتوي كلمات مثل: ' + suspiciousWords.slice(0, 4).join('، ') + ' — تستخدم لدفعك للنقر بسرعة.' }); }

      if (url.username || url.password) { score += 30; findings.push({ level: 'danger', title: 'اسم مستخدم داخل الرابط', text: 'الجزء قبل @ هو اسم النطاق الحقيقي فقط! ما بعد @ هو الهدف الظاهر — أي رابط فيه @ مشبوه.' }); }

      const tld = host.split('.').pop();
      if (['zip', 'mov', 'xyz', 'top', 'gq', 'tk', 'ml', 'cf', 'click', 'country'].indexOf(tld) !== -1) { score += 15; findings.push({ level: 'warn', title: 'امتداد نطاق غير معتاد', text: 'الامتداد .' + tld + ' مستخدم بكثرة في مواقع التصيّد لأنه رخيص وسهل التسجيل.' }); }

      if (score === 0) findings.unshift({ level: 'ok', title: 'لا توجد علامات خطر واضحة', text: 'بنية الرابط تبدو سليمة. لكن ابقَ حذراً دائماً: الرابط السليم قد يقود صفحة مزيّفة — تحقق من قفل https ومن اسم النطاق بنفسك قبل إدخال أي بيانات.' });

      score = Math.min(100, score);
      const level = score >= 60 ? 'danger' : score >= 30 ? 'warn' : score > 0 ? 'warn' : 'ok';
      const verdict = score >= 60 ? 'خطر — لا تضغط' : score >= 30 ? 'مشبوه — تحقق قبل الضغط' : 'يبدو آمناً — مع الحذر المعتاد';
      return { url: host + url.pathname, score: score, level: level, verdict: verdict, findings: findings };
    }

    function renderLinkResult(r) {
      const box = $('linkResult');
      if (!r) { box.classList.add('hidden'); return; }
      const icons = { danger: 'x', warn: 'alert', ok: 'check', info: 'alert' };
      box.className = 'try-result try-result-' + r.level;
      box.innerHTML =
        '<div class="try-verdict">' + icon(r.level === 'ok' ? 'check' : r.level === 'warn' ? 'alert' : 'x') +
        '<div><div class="try-verdict-title">' + r.verdict + '</div>' +
        '<div class="try-verdict-url" dir="ltr">' + r.url + '</div></div>' +
        '<div class="try-score try-score-' + r.level + '">' + r.score + '<small>/100</small></div></div>' +
        '<div class="try-findings">' + r.findings.map(f =>
          '<div class="try-finding try-finding-' + f.level + '">' +
          '<span class="try-finding-ico">' + icon(icons[f.level] || 'alert') + '</span>' +
          '<div><b>' + f.title + '</b><p>' + f.text + '</p></div></div>'
        ).join('') + '</div>';
      box.classList.remove('hidden');
    }

    function runLinkCheck() {
      const val = $('linkInput').value;
      if (!val.trim()) { $('linkInput').focus(); return; }
      renderLinkResult(analyzeUrl(val));
    }
    $('linkCheckBtn').addEventListener('click', runLinkCheck);
    $('linkInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') runLinkCheck(); });
    document.querySelectorAll('[data-sample]').forEach(btn => {
      btn.addEventListener('click', () => { $('linkInput').value = btn.dataset.sample; runLinkCheck(); });
    });

    /* ============ أداة 2: قوة كلمة المرور ============ */
    const COMMON_WORDS = ['password', 'passwd', '123456', 'qwerty', 'admin', 'welcome', 'iloveyou', 'monkey', 'dragon', 'sunshine', 'princess', 'football', 'abc123', '111111', '000000', 'letmein', 'login', 'passw0rd', 'saudi', 'saudi123', 'riyadh', 'jeddah', 'ameen', 'love', 'karma', 'mypc', '12345678', '123456789', '1234567890', '123123', 'qwerty123', '1q2w3e4r', 'zaq12wsx', 'password1', 'password123', 'admin123', 'root', 'toor', 'test', 'guest', 'changeme', 'secret', 'master', 'super', 'computer', 'internet', 'samsung', 'apple', 'google', 'facebook', 'instagram', 'snapchat', 'tiktok', 'whatsapp', 'youtube', 'twitter', 'microsoft', 'windows', 'linux', 'dragon123', 'baseball', 'superman', 'batman', 'spiderman', 'naruto', 'pokemon', 'minecraft', 'fortnite', 'pubg', 'freefire', 'roblox', 'hello', 'freedom', 'whatever', 'trustno1', 'jordan', 'amman', 'kuwait', 'dubai', 'qatar', 'bahrain', 'oman', 'egypt', 'cairo', 'riyadh123', 'jeddah123', 'makkah', 'madinah', 'abha', 'dammam', 'khobar', 'taif', 'tabuk'];
    const passRulesDef = [
      { test: (v) => v.length >= 12, ok: 'الطول 12 حرفاً على الأقل', bad: 'الطول أقل من 12 حرفاً — أهم عامل بالقوة' },
      { test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v), ok: 'يخلط بين الأحرف الكبيرة والصغيرة', bad: 'لا يخلط الأحرف الكبيرة والصغيرة' },
      { test: (v) => /\d/.test(v), ok: 'يحتوي أرقاماً', bad: 'لا يحتوي أرقاماً' },
      { test: (v) => /[^a-zA-Z0-9]/.test(v), ok: 'يحتوي رموزاً', bad: 'لا يحتوي رموزاً' },
      { test: (v) => !COMMON_WORDS.some(w => v.toLowerCase().indexOf(w) !== -1), ok: 'لا يحتوي كلمات شائعة', bad: 'يحتوي كلمة شائعة يخمّنها المخترق فوراً' },
      { test: (v) => !/(.)\1{2,}/.test(v), ok: 'لا يحتوي أحرفاً مكرّرة متتالية', bad: 'يحتوي أحرفاً مكرّرة متتالية (aaa أو 111)' },
      { test: (v) => !/(012|123|234|345|456|567|678|789|abc|bcd|qwe|wer|asd)/i.test(v), ok: 'لا يحتوي أنماطاً متسلسلة', bad: 'يحتوي نمطاً متسلسلاً يخمّن بسهولة' },
      { test: (v) => !/^(19|20)\d{2}$/.test(v) && !/(19|20)\d{2}$/.test(v), ok: 'لا يحتوي سنة ميلاد', bad: 'يحتوي سنة ميلاد — أول ما يجرّبه المخترق' }
    ];

    /* ---------- تقدير واقعي لزمن التخمين ----------
       النموذج الواقعي: المهاجم الحقيقي لا يجرّب كل الاحتمالات (brute force)
       بل يستخدم: 1) قوائم كلمات مسروقة 2) هجمات GPU على التجزئة
       3) قواعد التحويل الشائعة (Capitalize + رقم + رمز في النهاية).
       لذلك: كلمة مرور مبنية على كلمة معروفة = تُخمَّن فوراً تقريباً
       مهما كانت طويلة، لأن الهجوم يبدأ من القاموس لا من الأبجدية. */
    function estimateCrackTime(v) {
      if (!v) return '';
      const lower = v.toLowerCase();

      // 1) هل هي كلمة شائعة بحتة أو تحتويها؟
      const isCommon = COMMON_WORDS.some(w => lower === w || (w.length >= 4 && lower.indexOf(w) !== -1));
      // 2.5) تحويلات شائعة: كلمة + رقم/سنة/رمز في النهاية
      const leet = lower.replace(/@/g, 'a').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/\$/g, 's').replace(/!/g, 'i');
      const isCommonLeet = COMMON_WORDS.some(w => leet === w || (w.length >= 4 && leet.indexOf(w) !== -1));

      // 2) نمط شائع: كلمة + سنة / كلمة + أرقام متتالية / أحرف متكررة
      const hasYear = /(19|20)\d{2}/.test(v);
      const hasSeq = /(012|123|234|345|456|567|678|789|abc|bcd|cde|qwe|wer|asd)/i.test(v);
      const hasRepeat = /(.)\1{2,}/.test(v);

      // 3) الكلمة الأساسية المستخرجة (أطول مقطع أبجدي)
      const stem = (v.match(/[a-zA-Z]+/g) || ['']).sort((a, b) => b.length - a.length)[0].toLowerCase();
      // «معروفة» = الكلمة نفسها في القاموس، أو تطابق تام مع جزء من كلمة أطول (اسم/مكان حقيقي)
      const stemIsKnown = stem.length >= 3 && COMMON_WORDS.some(w => stem === w || w.indexOf(stem) !== -1);

      // الحالات الحاسمة (تُخمَّن بثوانٍ–دقائق على GPU حقيقي)
      if (isCommon || isCommonLeet) return 'ثوانٍ — ضمن قوائم التسريبات المعروفة';
      if (stemIsKnown && (hasYear || hasSeq || hasRepeat)) return 'دقائق — نمط «كلمة + رقم» يجرّبه المهاجم أولاً';
      if (stemIsKnown && v.length < 14) return 'ساعات — الكلمة الأساسية معروفة وقواعد التحويل محدودة';
      if (hasSeq && v.length < 10) return 'ثوانٍ — النمط المتسلسل من أوائل ما يُجرَّب';
      // سنة ميلاد ملحقة بكلمة غير معروفة: تُخمَّن بقواعد «الكلمة + السنة»
      if (hasYear && v.length <= 14 && /[a-zA-Z]/.test(v)) return 'ساعات — نمط «كلمة + سنة» من أشهر قواعد التخمين';

      // 4) كلمة مرور تبدو عشوائية فعلاً — هنا نستخدم حساب القوة الغاشمة
      let pool = 0;
      if (/[a-z]/.test(v)) pool += 26;
      if (/[A-Z]/.test(v)) pool += 26;
      if (/\d/.test(v)) pool += 10;
      if (/[^a-zA-Z0-9]/.test(v)) pool += 33;
      if (!pool) pool = 1;
      // تقليل الفعالية: الكلمات العربية/الإنجليزية المتوقعة تخفض العشوائية
      const effective = Math.pow(pool, v.length);
      // هجوم GPU قوي على تجزئة سريعة: ~100 مليار محاولة/ثانية
      const gps = 1e11;
      const seconds = effective / gps / 2;
      if (seconds < 1) return 'فوري — أقل من ثانية';
      if (seconds < 60) return Math.round(seconds) + ' ثانية';
      if (seconds < 3600) return Math.round(seconds / 60) + ' دقيقة';
      if (seconds < 86400) return Math.round(seconds / 3600) + ' ساعة';
      if (seconds < 2592000) return Math.round(seconds / 86400) + ' يوم';
      if (seconds < 31536000) return Math.round(seconds / 2592000) + ' شهر';
      const years = seconds / 31536000;
      if (years < 1000) return Math.round(years) + ' سنة';
      if (years < 1e6) return Math.round(years / 1000) + ' ألف سنة';
      if (years < 1e9) return Math.round(years / 1e6) + ' مليون سنة';
      if (years < 1e12) return Math.round(years / 1e9) + ' مليار سنة';
      if (years < 1e15) return Math.round(years / 1e12) + ' تريليون سنة';
      return 'أكثر من عمر الكون — ممتازة';
    }

    function renderPass(v) {
      const rulesBox = $('passRules');
      if (!v) {
        rulesBox.innerHTML = passRulesDef.map(r => '<li class="pass-rule"><span class="pass-rule-ico">○</span><span>' + r.ok + '</span></li>').join('');
        $('passMeterFill').style.width = '0%';
        $('passMeterFill').className = 'pass-meter-fill';
        $('passMeterLabel').textContent = '—';
        $('passEstimate').textContent = '';
        return;
      }
      let passed = 0;
      const html = passRulesDef.map(r => {
        const ok = r.test(v);
        if (ok) passed++;
        return '<li class="pass-rule ' + (ok ? 'ok' : 'no') + '"><span class="pass-rule-ico">' + icon(ok ? 'check' : 'x') + '</span><span>' + (ok ? r.ok : r.bad) + '</span></li>';
      }).join('');
      rulesBox.innerHTML = html;
      // نقاط مرجّحة واقعية: الطول والتنوّع أهم من مجرد عدد القواعد
      let weighted = 0;
      if (v.length >= 8) weighted += 10;
      if (v.length >= 12) weighted += 15;
      if (v.length >= 16) weighted += 10;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) weighted += 15;
      if (/\d/.test(v)) weighted += 10;
      if (/[^a-zA-Z0-9]/.test(v)) weighted += 15;
      if (!COMMON_WORDS.some(w => v.toLowerCase().indexOf(w) !== -1)) weighted += 15;
      if (!/(.)\1{2,}/.test(v) && !/(012|123|234|345|456|567|678|789|abc|bcd|qwe|wer|asd)/i.test(v)) weighted += 10;
      // خصم قاسٍ: أي كلمة شائعة (مع تحويلاتها) = سقف 20 نقطة
      const lowerV = v.toLowerCase();
      const leetV = lowerV.replace(/@/g, 'a').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/5/g, 's').replace(/\$/g, 's').replace(/!/g, 'i');
      const containsCommon = COMMON_WORDS.some(w => (w.length >= 4 && (lowerV.indexOf(w) !== -1 || leetV.indexOf(w) !== -1)));
      if (containsCommon) weighted = Math.min(weighted, 20);
      // خصم سنة الميلاد لو كانت جزءاً من كلمة معروفة
      const stemV = (v.match(/[a-zA-Z]+/g) || ['']).sort((a, b) => b.length - a.length)[0].toLowerCase();
      const stemKnown = stemV.length >= 3 && COMMON_WORDS.some(w => stemV === w || w.indexOf(stemV) !== -1);
      if (stemKnown && /(19|20)\d{2}/.test(v)) weighted = Math.min(weighted, 25);
      // نمط «كلمة + سنة» عموماً: خصم متوسط (أشهر قاعدة تخمين)
      if (/(19|20)\d{2}/.test(v) && /[a-zA-Z]/.test(v) && v.length <= 14) weighted = Math.min(weighted, 55);
      const pct = Math.max(0, Math.min(100, weighted));
      const level = pct >= 85 ? 'strong' : pct >= 60 ? 'good' : pct >= 35 ? 'fair' : 'weak';
      $('passMeterFill').style.width = pct + '%';
      $('passMeterFill').className = 'pass-meter-fill pass-meter-' + level;
      const labelText = { strong: 'قوية جداً', good: 'جيدة', fair: 'متوسطة', weak: 'ضعيفة جداً' }[level];
      $('passMeterLabel').textContent = labelText;
      $('passEstimate').innerHTML = icon('clock') + '<span>زمن التخمين التقريبي: <b>' + estimateCrackTime(v) + '</b> <small>(حساب واقعي: هجوم قاموس + GPU على تجزئة سريعة)</small></span>';
    }

    $('passInput').addEventListener('input', (e) => renderPass(e.target.value));
    $('passToggleBtn').addEventListener('click', () => {
      const inp = $('passInput');
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    renderPass('');

    /* ============ أداة 3: أخطر التهديدات عليك ============ */
    const WHO_PROFILES = {
      student: { title: 'طالب ومهتم بالتقنية', top: ['phishing', 'credentials', 'links'], tip: 'أنت من أكثر الفئات تعاملاً مع الروابط والمنصات الجديدة — مرّب حسابك بمصادقة ثنائية، ولا تستخدم كلمة مرور واحدة للمتاجر والمنصات المجهولة.' },
      bank: { title: 'موظف في القطاع المالي', top: ['social', 'phishing', 'credentials'], tip: 'القطاع المالي هو الهدف الأول للتصيّد والهندسة الاجتماعية. لا تنفّذ أي تحويل بناءً على رسالة أو اتصال — تحقق هاتفياً من جهة رسمية.' },
      shop: { title: 'صاحب متجر إلكتروني', top: ['phishing', 'credentials', 'links'], tip: 'بيانات عملائك ولوحة تحكم متجرك هدف مغري. فعّل المصادقة الثنائية على لوحة التحكم والبريد، ولا تحفظ كلمات المرور في المتصفح على جهاز مشترك.' },
      employee: { title: 'موظف في شركة', top: ['phishing', 'ransomware', 'credentials'], tip: 'أغلب الاختراقات تبدأ بموظف نقر رابطاً. إذا وصلتك رسالة من «الدعم الفني» تطلب بياناتك — بلّغ قسم الأمن فوراً ولا تستجب.' }
    };

    function renderWho(key) {
      const profile = WHO_PROFILES[key];
      if (!profile) return;
      document.querySelectorAll('#whoChoices .chip').forEach(c => c.classList.toggle('active', c.dataset.who === key));
      const ordered = profile.top.map(id => THREAT_LIBRARY.find(t => t.id === id)).filter(Boolean);
      const rest = THREAT_LIBRARY.filter(t => profile.top.indexOf(t.id) === -1);
      const all = ordered.concat(rest).slice(0, 5);
      $('whoResult').className = '';
      $('whoResult').innerHTML =
        '<div class="who-summary"><h3>' + icon('alert') + '<span>أخطر 3 تهديدات لك كـ' + profile.title + '</span></h3><p>' + profile.tip + '</p></div>' +
        '<div class="who-list">' + all.map((t, i) =>
          '<a href="#library" class="who-item' + (i < 3 ? ' who-item-top' : '') + '" data-section="library">' +
          '<span class="who-rank">' + (i + 1) + '</span>' +
          '<span class="who-ico">' + icon(t.icon) + '</span>' +
          '<span class="who-name">' + t.name + '</span>' +
          '<span class="who-cat">' + t.cat.split('—')[0].trim() + '</span>' +
          (i < 3 ? '<span class="who-badge">أولوية عليك</span>' : '') +
          '</a>'
        ).join('') + '</div>';
      $('whoResult').querySelectorAll('[data-section]').forEach(a => {
        a.addEventListener('click', (e) => { e.preventDefault(); showSection('library'); });
      });
    }

    $('whoChoices').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) renderWho(chip.dataset.who);
    });
  }

  /* =========================================================
     9. اركان — مساعد الأمن السيبراني (Ollama محلي)
     ========================================================= */
  const OLLAMA_URL = '';  // فارغ = نفس الأصل (السيرفر يمرّر الطلبات لـ Ollama)
  const AI_MODEL = 'qwen2.5:3b';
  // keep_alive: -1 = خلّي النموذج محمّل بالذاكرة دائماً → أول رد يصير ~2 ثانية بدل 15
  const AI_KEEP_ALIVE = -1;
  let aiHistory = [];
  let aiBusy = false;

  const AI_SYSTEM = 'أنت «اركان»، مساعد في الأمن السيبراني. قواعد: ' +
    '1) اكتب بالعربية الفصحى فقط، بلا أي كلمة أجنبية. ' +
    '2) أجب بجملة أو جملتين فقط — قصير جداً بلا مقدمات. ' +
    '3) مجالك: التصيّد، الهندسة الاجتماعية، الفدية، حماية الحسابات والأجهزة. لا تشرح الاختراق — الوقاية فقط. ' +
    '4) المصادر: nca.gov.sa، Kaspersky، abuse.ch. ' +
    '5) إن سُئلت من برمج الموقع أو المساعد: أجب «برمج عن طريق الطالب الأمين نايف دواغره».';

  function buildAI() {
    $('aiTitleIcon').innerHTML = icon('robot');

    /* فحص حالة Ollama */
    function checkOllama() {
      const dot = $('aiDot');
      const txt = $('aiStatusText');
      if (!dot || !txt) return;
      dot.className = 'ai-dot checking';
      txt.textContent = 'جارٍ التحقق من الاتصال بـ Ollama…';
      // إذا فُتح الموقع مباشرة (file://) بدون السيرفر، نبّه المستخدم
      if (location.protocol === 'file:') {
        dot.className = 'ai-dot offline';
        txt.innerHTML = 'افتح الموقع عبر السيرفر: <code>python server.py</code> ثم <code>http://localhost:8080</code> — المتصفح يمنع الاتصال المباشر عند فتح الملف.';
        return;
      }
      fetch('/api/tags')
        .then(r => r.ok ? r.json() : Promise.reject(new Error('offline')))
        .then(data => {
          const has = (data.models || []).some(m => m.name.indexOf(AI_MODEL) === 0);
          if (has) {
            dot.className = 'ai-dot online';
            txt.innerHTML = 'متصل — النموذج: <b>' + AI_MODEL + '</b> (محلي على جهازك)';
          } else {
            dot.className = 'ai-dot warning';
            txt.innerHTML = 'Ollama يعمل لكن النموذج <b>' + AI_MODEL + '</b> غير محمّل. شغّل: <code>ollama run ' + AI_MODEL + '</code>';
          }
        })
        .catch(() => {
          dot.className = 'ai-dot offline';
          txt.innerHTML = 'غير متصل بـ Ollama. شغّل التطبيق ثم أعد تحميل الصفحة. (المساعد يحتاج Ollama على <code>localhost:11434</code>)';
        });
    }

    function addMsg(role, text) {
      const box = $('aiMessages');
      const div = document.createElement('div');
      div.className = 'ai-msg ' + (role === 'user' ? 'user' : 'ai');
      div.innerHTML = '<div class="ai-msg-head"><span class="ai-avatar">' + (role === 'user' ? '👤' : '🤖') + '</span><b>' + (role === 'user' ? 'أنت' : 'اركان') + '</b></div>' +
        '<div class="ai-msg-body"></div>';
      div.querySelector('.ai-msg-body').textContent = text;
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
      return div.querySelector('.ai-msg-body');
    }

    function addTyping() {
      const box = $('aiMessages');
      const div = document.createElement('div');
      div.className = 'ai-msg ai typing-msg';
      div.innerHTML = '<div class="ai-msg-head"><span class="ai-avatar">🤖</span><b>اركان</b> <span class="ai-typing">يكتب…</span></div>';
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
      return div;
    }

    function addMsgBody(role) {
      const box = $('aiMessages');
      const div = document.createElement('div');
      div.className = 'ai-msg ' + role;
      div.innerHTML = '<div class="ai-msg-head">' + (role === 'user' ? '<b>أنت</b> <span class="ai-avatar">👤</span>' : '<span class="ai-avatar">🤖</span> <b>اركان</b>') + '</div>' +
        '<div class="ai-msg-body"></div>';
      box.appendChild(div);
      box.scrollTop = box.scrollHeight;
      return div.querySelector('.ai-msg-body');
    }

    function send(text) {
      const q = (text || '').trim();
      if (!q || aiBusy) return;
      aiBusy = true;
      $('aiSendBtn').disabled = true;

      addMsgBody('user').textContent = q;
      aiHistory.push({ role: 'user', content: q });
      const bodyEl = addMsgBody('ai');
      bodyEl.classList.add('ai-streaming');
      let full = '';

      const recent = aiHistory.slice(-4);
      const payload = {
        model: AI_MODEL,
        messages: [{ role: 'system', content: AI_SYSTEM }].concat(recent),
        stream: true,
        keep_alive: AI_KEEP_ALIVE,
        options: { temperature: 0.5, num_predict: 200, num_ctx: 2048, top_p: 0.85, repeat_penalty: 1.15 }
      };

      let done = false;
      function finish() {
        if (done) return;
        done = true;
        bodyEl.classList.remove('ai-streaming');
        if (!full.trim()) bodyEl.textContent = 'لم أستطع توليد رد.';
        aiHistory.push({ role: 'assistant', content: full || 'لم أستطع توليد رد.' });
        aiBusy = false;
        $('aiSendBtn').disabled = false;
        $('aiInput').focus();
      }

      const timer = setTimeout(() => {
        if (!done) {
          if (!full.trim()) bodyEl.textContent = 'النموذج يأخذ وقتاً طويلاً. تأكد أن Ollama مشغّل.';
          finish();
        }
      }, 90000);

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then((r) => {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const reader = r.body.getReader();
          const decoder = new TextDecoder();
          let buf = '';
          (function pump() {
            return reader.read().then((res) => {
              if (res.done) { clearTimeout(timer); finish(); return; }
              buf += decoder.decode(res.value, { stream: true });
              const lines = buf.split('\n');
              buf = lines.pop();
              for (const line of lines) {
                const t = line.trim();
                if (!t) continue;
                try {
                  const obj = JSON.parse(t);
                  if (obj.message && obj.message.content) {
                    full += obj.message.content;
                    bodyEl.textContent = full;
                    const box = $('aiMessages');
                    box.scrollTop = box.scrollHeight;
                  }
                } catch (e) {}
              }
              return pump();
            });
          })();
        })
        .catch((err) => {
          clearTimeout(timer);
          if (!full.trim()) {
            const hint = location.protocol === 'file:'
              ? 'افتح الموقع عبر السيرفر: python server.py ثم http://localhost:8080'
              : 'تأكد أن Ollama يعمل والنموذج محمّل (ollama run qwen2.5:3b)، ثم أعد المحاولة.';
            bodyEl.textContent = 'تعذّر الاتصال بالنموذج (' + err.message + '). ' + hint;
          }
          finish();
        });
    }

    $('aiSendBtn').addEventListener('click', () => { send($('aiInput').value); $('aiInput').value = ''; });
    $('aiInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send($('aiInput').value);
        $('aiInput').value = '';
      }
    });
    $('aiSuggestions').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (chip) { send(chip.dataset.q); }
    });
    $('aiClearBtn').addEventListener('click', () => {
      aiHistory = [];
      $('aiMessages').innerHTML =
        '<div class="ai-msg ai"><div class="ai-msg-head"><span class="ai-avatar">🤖</span><b>اركان</b></div>' +
        '<div class="ai-msg-body">أهلاً! أنا اركان، مساعدك السيبراني. اسألني عن التصيّد، برمجيات الفدية، الهندسة الاجتماعية، أو أي مصطلح في هذا الموقع — وسأشرح لك بأسلوب مبسّط.</div></div>';
    });

    checkOllama();
  }

  /* =========================================================
     10. عن الموقع (محتوى قابل للتعديل + صور)
     ========================================================= */
  function buildSiteAbout() {
    $('aboutTitleIcon').innerHTML = icon('user');
    $('aboutBodyIcon').innerHTML = icon('book');
    $('aboutTeamIcon').innerHTML = icon('human');
    $('aboutImgsIcon').innerHTML = icon('sources');

    var DEFAULT_BODY = 'مرصد التهديدات السيبرانية — منصة توعوية تفاعلية تعرض مشهد التهديدات الرقمية بأرقام موثقة بمصادرها.\n' +
      'يحتوي الموقع على: لوحة مؤشرات، خريطة توزيع خوادم C2 العالمية (بيانات abuse.ch الحقيقية)، إحصائيات موثقة، مكتبة تهديدات، ' +
      'مختبر تصيد تفاعلي، مختبر هندسة اجتماعية، اختبارات توعية، أدوات تفاعلية (فحص روابط + قوة كلمات مرور)، ' +
      'ومساعد ذكاء اصطناعي محلي (اركان) يعمل عبر Ollama على جهاز المضيف بدون إنترنت.';

    var DEFAULT_TEAM = 'إعداد وتصميم وبرمجة: أمين نايف دواغرة\nشرح الطلاب: فهد العتيبي، عمر السيد، محمد صفحي\nإشراف: أستاذ عادل الزهراني';

    var bodyEl = $('aboutSiteBody');
    var teamEl = $('aboutSiteTeam');
    var editBtn = $('siteAboutEditBtn');
    var saveBtn = $('siteAboutSaveBtn');
    var cancelBtn = $('siteAboutCancelBtn');
    var imgsBox = $('siteAboutImages');
    var imgAdd = $('siteAboutImgAdd');
    var imgInput = $('siteAboutImgInput');

    function load() {
      try { return JSON.parse(localStorage.getItem('cto-about') || '{}'); }
      catch (e) { return {}; }
    }
    function save(data) {
      try { localStorage.setItem('cto-about', JSON.stringify(data)); } catch (e) {
        alert('تعذّر الحفظ — المساحة ممتلئة (الصور كبيرة).');
      }
    }

    var store = load();
    bodyEl.textContent = store.body || DEFAULT_BODY;
    teamEl.textContent = store.team || DEFAULT_TEAM;
    var images = store.images || [];

    function renderImgs() {
      imgsBox.innerHTML = '';
      images.forEach(function (src, idx) {
        var wrap = document.createElement('div');
        wrap.className = 'about-img-wrap';
        var img = document.createElement('img');
        img.src = src;
        var del = document.createElement('button');
        del.className = 'about-img-del';
        del.textContent = '✕';
        del.addEventListener('click', function () {
          images.splice(idx, 1);
          store.images = images;
          save(store);
          renderImgs();
        });
        wrap.appendChild(img);
        wrap.appendChild(del);
        imgsBox.appendChild(wrap);
      });
    }
    renderImgs();

    var editing = false;
    function enterEdit() {
      editing = true;
      bodyEl.setAttribute('contenteditable', 'true');
      teamEl.setAttribute('contenteditable', 'true');
      bodyEl.style.border = '1px dashed var(--border-bright)';
      bodyEl.style.padding = '10px';
      bodyEl.style.borderRadius = '8px';
      bodyEl.focus();
      editBtn.classList.add('hidden');
      saveBtn.classList.remove('hidden');
      cancelBtn.classList.remove('hidden');
    }
    function exitEdit() {
      editing = false;
      bodyEl.setAttribute('contenteditable', 'false');
      teamEl.setAttribute('contenteditable', 'false');
      bodyEl.style.border = '';
      bodyEl.style.padding = '';
      editBtn.classList.remove('hidden');
      saveBtn.classList.add('hidden');
      cancelBtn.classList.add('hidden');
    }

    editBtn.addEventListener('click', enterEdit);
    saveBtn.addEventListener('click', function () {
      store.body = bodyEl.textContent.trim() || DEFAULT_BODY;
      store.team = teamEl.textContent.trim() || DEFAULT_TEAM;
      save(store);
      exitEdit();
    });
    cancelBtn.addEventListener('click', function () {
      bodyEl.textContent = store.body || DEFAULT_BODY;
      teamEl.textContent = store.team || DEFAULT_TEAM;
      exitEdit();
    });

    imgAdd.addEventListener('click', function () { imgInput.click(); });
    imgInput.addEventListener('change', function (e) {
      Array.prototype.slice.call(e.target.files || []).forEach(function (f) {
        if (!f.type.match(/^image\//)) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          images.push(ev.target.result);
          store.images = images;
          save(store);
          renderImgs();
        };
        reader.readAsDataURL(f);
      });
      imgInput.value = '';
    });
  }

  /* =========================================================
     8. المصادر
     ========================================================= */
  function buildSources() {
    $('srcTitleIcon').innerHTML = icon('sources');
    $('srcUpdateBar').innerHTML =
      icon('clock') +
      '<span>تاريخ تحديث المحتوى: <b>' + CONTENT_META.lastUpdated + '</b></span>' +
      '<span class="spacer"></span>' +
      '<span class="tag tag-real">مصادر رسمية وموثوقة</span>';

    $('discTitle').innerHTML = icon('alert') + '<span>إفصاح وحدود الاستخدام</span>';
    $('discBody').textContent = CONTENT_META.disclaimer;

    $('sourceList').innerHTML = SOURCE_LIST.map(s =>
      '<div class="source-item">' +
      '<div class="source-ico">' + icon('sources') + '</div>' +
      '<div class="source-info">' +
      '<h3>' + s.name + '</h3>' +
      '<p>' + s.desc + '</p>' +
      '<a href="' + s.url + '" target="_blank" rel="noopener noreferrer">' + s.url + ' ' + icon('ext') + '</a>' +
      '<div class="source-meta">' + s.tags.map(t => '<span class="tag tag-src">' + t + '</span>').join('') + '</div>' +
      '</div></div>'
    ).join('');
  }

  /* =========================================================
     وضع العرض التقديمي
     ========================================================= */
  function togglePresent(force) {
    presMode = (typeof force === 'boolean') ? force : !presMode;

    document.body.classList.toggle('presentation-mode', presMode);
    $('presHud').classList.toggle('hidden', !presMode);

    if (presMode) {
      // اطلب ملء الشاشة
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      showSection(currentSection, false);
      $('presLabel') && ($('presLabel').textContent = 'وضع العرض');
      $('presUp').innerHTML = icon('arrowUp');
      $('presPrev').innerHTML = icon('arrowRight');
      $('presHome').innerHTML = icon('home');
      $('presNext').innerHTML = icon('arrowLeft');
      $('presDown').innerHTML = icon('arrowDown');
      $('presExit').innerHTML = icon('exit') + '<span>خروج</span>';
    } else {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    }

    setTimeout(() => CHARTS.forEach(fn => fn()), 120);
  }

  function presNav(dir) {
    const i = PRES_ORDER.indexOf(currentSection);
    let next = i + dir;
    if (next < 0) next = PRES_ORDER.length - 1;
    if (next >= PRES_ORDER.length) next = 0;
    showSection(PRES_ORDER[next]);
  }

  /* تمرير الصفحة صعوداً/نزولاً في وضع العرض */
  function presScroll(dir) {
    const step = Math.round(window.innerHeight * 0.85);
    window.scrollBy({ top: dir * step, behavior: 'smooth' });
  }

  /* =========================================================
     إعادة ضبط العرض
     ========================================================= */
  function resetView() {
    if (presMode) togglePresent(false);
    showSection('dashboard');
    quizState.idx = 0; quizState.score = 0;
    labState.answered = {}; labState.score = 0;
    if (typeof buildLab === 'function') { /* lab rerender handled internally */ }
    location.hash = '';
    // إعادة بناء المختبر من جديد
    if ($('labGrid')) {
      $('labGrid').innerHTML = '';
      buildLab();
    }
    if ($('quizOptions')) buildQuiz();
  }

  /* =========================================================
     التهيئة العامة
     ========================================================= */
  function init() {
    try {
    buildRouteBar();
    buildParticles();
    bindPointerGlow();
    initTheme();
    buildNav();
    buildDashboard();
    buildMap();
    buildStats();
    buildLibrary();
    buildLab();
    buildSocialEng();
    buildQuiz();
    buildAwareness();
    buildTry();
    buildAI();
    buildSiteAbout();
    buildSources();
    } catch (err) {
      console.error('INIT_ERROR at some build step: ' + (err && err.stack ? err.stack : err));
      alert('خطأ في تهيئة الموقع: ' + err.message);
    }

    // أزرار الشريط العلوي
    $('btnPresent').addEventListener('click', () => togglePresent());
    $('btnReset').addEventListener('click', resetView);

    // شريط وضع العرض
    $('presPrev').addEventListener('click', () => presNav(-1));
    $('presNext').addEventListener('click', () => presNav(1));
    $('presHome').addEventListener('click', () => showSection('dashboard'));
    $('presUp').addEventListener('click', () => presScroll(-1));
    $('presDown').addEventListener('click', () => presScroll(1));
    $('presExit').addEventListener('click', () => togglePresent(false));

    // اختصارات لوحة المفاتيح
    document.addEventListener('keydown', (e) => {
      if (!presMode) return;
      // الأسهم الأفقية: تنقل بين الأقسام (RTL: يسار = التالي)
      if (e.key === 'ArrowLeft') { e.preventDefault(); presNav(1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); presNav(-1); }
      // الأسهم الرأسية + مسافة/PgUp/PgDn: تمرير الصفحة
      else if (e.key === 'ArrowDown') { e.preventDefault(); presScroll(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); presScroll(-1); }
      else if (e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); presScroll(1); }
      else if (e.key === 'PageUp') { e.preventDefault(); presScroll(-1); }
      else if (e.key === 'Home') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      else if (e.key === 'End') { e.preventDefault(); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); }
      else if (e.key === 'Escape') togglePresent(false);
    });

    // التهيئة من الـ hash
    const hash = location.hash.replace('#', '');
    if (hash && $('section-' + hash)) showSection(hash, false);

    // إعادة رسم عند تغيير الحجم
    let rAF = null;
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (rAF) cancelAnimationFrame(rAF);
      rAF = requestAnimationFrame(() => {
        CHARTS.forEach(fn => fn());
        // الخريطة: حدّث الحجم فقط إذا كانت مرئية (لتجنّب أخطاء القياس على أبعاد مخفية)
        if (mapBuilt && mapInstance && typeof mapInstance.updateSize === 'function') {
          const el = $('map');
          const vis = el && el.getBoundingClientRect().width > 20;
          if (vis) {
            try { mapInstance.updateSize(); } catch (e) {}
          }
        }
      });
      // تحديث مؤجّل أخير بعد استقرار الأبعاد
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (mapBuilt && mapInstance && typeof mapInstance.updateSize === 'function') {
          const el = $('map');
          if (el && el.getBoundingClientRect().width > 20) {
            try { mapInstance.updateSize(); } catch (e) {}
          }
        }
      }, 300);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

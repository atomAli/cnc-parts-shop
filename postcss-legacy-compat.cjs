/**
 * سازگاری با مرورگرهای قدیمی (Chrome 109 / Firefox 115 ESR)
 * ---------------------------------------------------------------------------
 * این پلاگین قبل از postcss-lightningcss اجرا می‌شود و سه مشکل واقعی را
 * حل می‌کند که بدون آن بخش‌هایی از سایت در این مرورگرها نامرئی می‌شوند:
 *
 * 1) @layer
 *    هر چیزی داخل @layer در مرورگرهای قدیمی کاملاً نادیده گرفته می‌شود.
 *
 * 2) @supports دورِ مقادیر اولیهٔ --tw-*
 *    Tailwind این مقادیر را پشت یک @supports پیچیده می‌نویسد تا مرورگرهای
 *    بدون @property هم مقدار پیش‌فرض داشته باشند. آن @supports در Firefox 115
 *    برقرار نیست، پس var(--tw-*,) خالی می‌شود و قوانینی مثل
 *    linear-gradient(var(--tw-gradient-stops)) یا filter:var(--tw-blur,)
 *    نامعتبر می‌شوند — یعنی پس‌زمینهٔ گرادیانی دکمه‌ها و focus فرم‌ها
 *    از کار می‌افتند. اینجا همان مقادیر مستقیم (بدون @supports)
 *    نوشته می‌شوند.
 *
 * 3) :is(a) / :where(a) تک‌گزینه‌ای
 *    در مرورگرهای پشتیبان‌نشده کل قانون دور ریخته می‌شود. حالت
 *    چندگزینه‌ای دست‌نخورده می‌ماند چون هر دو مرورگر هدف آن را پشتیبانی
 *    می‌کنند و بازکردنش آبشار را به‌هم می‌ریزد.
 *
 * روی مرورگرهای مدرن هیچ اثری ندارد.
 */

/** مقدار امن برای متغیرهایی که Tailwind مقدار اولیه نمی‌دهد */
const FALLBACKS = {
  "--tw-gradient-position": "100%",
  "--tw-gradient-stops": "",
  "--tw-gradient-via-stops": "",
  "--tw-leading": "1",
  "--tw-font-weight": "",
  "--tw-tracking": "0",
  "--tw-shadow-color": "#0000",
  "--tw-inset-shadow-color": "#0000",
  "--tw-ring-color": "#0000",
  "--tw-inset-ring-color": "#0000",
  "--tw-ring-inset": "",
  "--tw-blur": "",
  "--tw-brightness": "",
  "--tw-contrast": "",
  "--tw-grayscale": "",
  "--tw-hue-rotate": "",
  "--tw-invert": "",
  "--tw-opacity": "1",
  "--tw-saturate": "",
  "--tw-sepia": "",
  "--tw-drop-shadow": "",
  "--tw-drop-shadow-color": "#0000",
  "--tw-drop-shadow-size": "0",
  "--tw-duration": "0s",
  "--tw-ease": "",
};

/**
 * اندیس پرانتز بستهٔ متناظر با پرانتز باز در openIndex.
 * رشته‌ها و کامنت‌ها نادیده گرفته می‌شوند.
 */
function matchParen(css, openIndex) {
  let depth = 0;
  let i = openIndex;
  while (i < css.length) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") {
      const close = css.indexOf("*/", i + 2);
      if (close < 0) return null;
      i = close + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === "\\") i++;
        i++;
      }
    } else if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return null;
}

/**
 * محتوای بلوک {…} به‌همراه اندیس } بسته‌کننده.
 */
function matchBrace(css, openIndex) {
  let depth = 0;
  let i = openIndex;
  while (i < css.length) {
    const ch = css[i];
    if (ch === "/" && css[i + 1] === "*") {
      const close = css.indexOf("*/", i + 2);
      if (close < 0) return null;
      i = close + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      i++;
      while (i < css.length && css[i] !== quote) {
        if (css[i] === "\\") i++;
        i++;
      }
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return { body: css.slice(openIndex + 1, i), end: i };
    }
    i++;
  }
  return null;
}

/** @layer name{…} → محتوای داخل */
function flattenLayers(css) {
  let out = css;

  for (let guard = 0; guard < 100; guard++) {
    const m = /@layer\s+([\w-]+)\s*\{/.exec(out);
    if (!m) break;

    const block = matchBrace(out, m.index + m[0].length - 1);
    if (!block) break;

    out = out.slice(0, m.index) + block.body + out.slice(block.end + 1);
  }

  // اعلان لایه‌های بی‌نام: @layer a,b,c;
  return out.replace(/@layer\s+[^;{]+;/g, "");
}

/**
 * مقادیر اولیهٔ --tw-* را از بلوک @supports مربوط به * بیرون می‌کشد.
 * @returns {string | null} قانون آمادهٔ درج
 */
function liftTwInitialValues(css) {
  const map = new Map();

  const supportsRe = /@supports[^{]*\{/g;
  let m;
  while ((m = supportsRe.exec(css))) {
    const block = matchBrace(css, m.index + m[0].length - 1);
    if (!block) break;

    // فقط بلوک‌هایی که selector عمومی * دارند
    if (!/(^|[,{}])\s*\*\s*[,{]/.test(block.body)) continue;

    const declRe = /(--tw-[\w-]+)\s*:\s*([^;{}]+)/g;
    let d;
    while ((d = declRe.exec(block.body))) {
      if (!map.has(d[1])) map.set(d[1], d[2].trim());
    }
  }

  if (map.size === 0) return null;

  Object.keys(FALLBACKS).forEach((k) => {
    if (!map.has(k)) map.set(k, FALLBACKS[k]);
  });

  const decls = [];
  map.forEach((v, k) => decls.push(k + ":" + v));

  return "*,::before,::after{" + decls.join(";") + "}";
}

/** تقسیم بر اساس کاماهای عمق صفر */
function splitTopLevel(str) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of str) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * :is(a) و :where(a) تک‌گزینه‌ای را باز می‌کند.
 * حالت چندگزینه‌ای (دارای کاما در عمق صفر) دست‌نخورده می‌ماند.
 */
function simplifySelectors(css) {
  const parts = [];
  let i = 0;

  while (i < css.length) {
    const m = /:(?:is|where)\(/.exec(css.slice(i));
    if (!m) {
      parts.push(css.slice(i));
      break;
    }

    const start = i + m.index;
    parts.push(css.slice(i, start));

    const openAt = start + m[0].length - 1;
    const closeAt = matchParen(css, openAt);

    if (closeAt === null) {
      parts.push(css.slice(start));
      break;
    }

    const inner = css.slice(openAt + 1, closeAt);

    if (splitTopLevel(inner).length > 1) {
      // چندگزینه‌ای → دست‌نخورده
      parts.push(css.slice(start, closeAt + 1));
    } else {
      parts.push(inner);
    }

    i = closeAt + 1;
  }

  return parts.join("");
}

function legacyCompat() {
  return {
    postcssPlugin: "postcss-legacy-compat",

    OnceExit(root, helpers) {
      const postcss = helpers && helpers.postcss;
      if (!postcss) return;

      let out = root.toString();

      out = flattenLayers(out);

      const lifted = liftTwInitialValues(out);
      if (lifted) out = lifted + out;

      out = simplifySelectors(out);

      const parsed = postcss.parse(out);
      root.removeAll();
      root.append.apply(root, parsed.nodes);
    },
  };
}

legacyCompat.postcss = true;
legacyCompat.FALLBACKS = FALLBACKS;
legacyCompat.flattenLayers = flattenLayers;
legacyCompat.liftTwInitialValues = liftTwInitialValues;
legacyCompat.simplifySelectors = simplifySelectors;
legacyCompat.matchParen = matchParen;
legacyCompat.matchBrace = matchBrace;
legacyCompat.splitTopLevel = splitTopLevel;

module.exports = legacyCompat;
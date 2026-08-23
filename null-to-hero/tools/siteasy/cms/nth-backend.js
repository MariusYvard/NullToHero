// nth-backend.js — the browser half of the CMS. `/siteasy entrust` copies this
// file to the client project as `admin/nth-backend.js`, where it loads after the
// vendored Decap bundle.
//
// It does three things: registers a backend under a name of our own, speaks the
// bridge's protocol with a CSRF header the stock proxy backend cannot send, and
// replaces the login screen with one that asks for an email and a password.
//
// WHY A NEW BACKEND NAME
// ----------------------
// `registerBackend` keeps the first registration and only logs on a second one
// (registry.js:199-212), and `proxy` is registered by the bundle itself. So this
// registers `nth`, and the generated config.yml names it.
//
// WHY THE LOGIN SCREEN DOES ITS OWN NETWORK CALL
// ----------------------------------------------
// Decap's `loginUser` dispatches AUTH_REQUEST but never dispatches
// AUTH_REQUEST_DONE on failure (actions/auth.ts:79-107), so `inProgress` stays
// true forever after one wrong password and the button would spin for good. The
// screen therefore owns its own busy and error state, calls the session route
// itself, and only tells Decap once there is a session.
//
// It also shrinks images on their way out. Decap's media library already accepts
// a drag and drop (MediaLibrary.js:195 reads `event.dataTransfer`), so the part
// that was missing is what happens to the twelve-megapixel photograph a client
// drops on it: it went to GitHub whole, blew past the bridge's size cap, and left
// the site serving four megabytes above the fold. The browser can re-encode it
// with no dependency and no server work, so it does.
//
// `window.createClass` and `window.h` are set by the decap-cms bundle
// (packages/decap-cms/src/index.js:20-21), which is why no bundler is needed here.

(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.CMS) {
    root.CMS.registerBackend("nth", api.NthBackend);
    // The bundle skips its own init when this flag is set, which is what gives
    // this file a chance to register before the app reads the config.
    if (root.CMS_MANUAL_INIT) root.CMS.init();
  }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";

  var CSRF_COOKIE = "__Host-nth_cms_csrf";
  var CSRF_HEADER = "X-NTH-CSRF";

  function readCookie(name, jar) {
    var parts = String(jar || "").split(";");
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf("=");
      if (eq < 1) continue;
      if (parts[i].slice(0, eq).trim() === name) return parts[i].slice(eq + 1).trim();
    }
    return "";
  }

  // The bridge answers JSON with an `error` string on every refusal. A body that
  // is not JSON means something in front of the function answered instead, and
  // saying so is more useful than showing the parse error.
  // A 401 on the session route means the password is wrong; a 401 anywhere else
  // means the session died under someone who was already signed in. Reading the
  // status without the route tells a client who mistyped a password to reload a
  // page they were never signed in on.
  // The bridge already answers in the site's language, so its `error` string is
  // passed through untouched. What is written here is what the browser says on
  // its own, and it follows the same declared locale.
  //
  // ponytail: two locales in one object. A third one, or a client who wants
  // their own wording, is when this deserves a file of its own.
  var WORDS = {
    en: {
      title: "Sign in to edit this site",
      email: "Email", password: "Password",
      signIn: "Sign in", signingIn: "Signing in…",
      quotaLeft: function (n, when) { return n + (n > 1 ? " changes left " : " change left ") + when; },
      quotaNone: function (when) { return "Change limit reached " + when + ", try again later."; },
      thisHour: "this hour", today: "today", thisMonth: "this month",
      overHours: function (h) { return "over " + h + " h"; },
      preview: "Preview of the page",
      desktop: "Desktop", phone: "Phone",
      changes: function (n) { return n > 1 ? "See my " + n + " changes" : "See my change"; },
      noChanges: "Nothing changed yet",
      backToPreview: "Back to the preview",
      wasEmpty: "(was empty)", nowEmpty: "(now empty)",
      find: "Search the content", findOpen: "Search", findNone: "Nothing found",
      findMore: "first results only", findClose: "Close",
      fixed: "This passage holds a link or formatting inside its text, so it is changed in the site's code rather than here.",
      revert: function (when) { return "Go back to the version of " + when; },
      revertConfirm: "Confirm going back",
      revertBusy: "Going back…",
      revertFailed: "Going back did not work.",
      chars: function (n) { return n + (n > 1 ? " characters" : " character"); },
      words: function (n) { return n + (n > 1 ? " words" : " word"); },
      advised: function (min, max) { return min + " to " + max + " advised"; },
      pending: function (n) { return n + (n > 1 ? " changes waiting" : " change waiting"); },
      publish: "Put online", publishBusy: "Sending…",
      published: "Sent. The site updates within a minute.",
      publishFailed: "The site refused to publish.",
      noPreview: "No preview for this page.",
      loadingPreview: "Loading the preview…",
      ended: "Your session has ended. Reload this page and sign in again.",
      wrong: "Wrong email or password.",
      odd: "The site did not answer as expected",
    },
    fr: {
      title: "Connectez-vous pour modifier ce site",
      email: "Adresse e-mail", password: "Mot de passe",
      signIn: "Se connecter", signingIn: "Connexion…",
      quotaLeft: function (n, when) { return "Il reste " + n + (n > 1 ? " modifications " : " modification ") + when + "."; },
      quotaNone: function (when) { return "Limite de modifications atteinte " + when + ", réessayez plus tard."; },
      thisHour: "cette heure", today: "aujourd'hui", thisMonth: "ce mois",
      overHours: function (h) { return "sur " + h + " h"; },
      preview: "Aperçu de la page",
      desktop: "Ordinateur", phone: "Téléphone",
      changes: function (n) { return n > 1 ? "Voir mes " + n + " modifications" : "Voir ma modification"; },
      noChanges: "Rien de modifié pour l'instant",
      backToPreview: "Revenir à l'aperçu",
      wasEmpty: "(était vide)", nowEmpty: "(maintenant vide)",
      find: "Chercher dans le contenu", findOpen: "Chercher", findNone: "Rien trouvé",
      findMore: "premiers résultats seulement", findClose: "Fermer",
      fixed: "Ce passage contient un lien ou une mise en forme à l'intérieur de son texte, il se modifie dans le code du site et non ici.",
      revert: function (when) { return "Revenir à la version du " + when; },
      revertConfirm: "Confirmer le retour",
      revertBusy: "Retour en cours…",
      revertFailed: "Le retour en arrière n'a pas abouti.",
      chars: function (n) { return n + (n > 1 ? " caractères" : " caractère"); },
      words: function (n) { return n + (n > 1 ? " mots" : " mot"); },
      advised: function (min, max) { return min + " à " + max + " conseillés"; },
      pending: function (n) { return n + (n > 1 ? " modifications en attente" : " modification en attente"); },
      publish: "Mettre en ligne", publishBusy: "Envoi…",
      published: "Envoyé. Le site se met à jour dans la minute.",
      publishFailed: "La mise en ligne a été refusée.",
      noPreview: "Pas d'aperçu pour cette page.",
      loadingPreview: "Chargement de l'aperçu…",
      ended: "Votre session a expiré. Rechargez la page et reconnectez-vous.",
      wrong: "Adresse ou mot de passe incorrect.",
      odd: "Le site n'a pas répondu comme prévu",
    },
  };
  function words(locale) { return WORDS[locale] || WORDS.en; }

  function explain(status, body, onSessionRoute, locale) {
    var w = words(locale);
    if (status === 401 && !onSessionRoute) return w.ended;
    if (body && typeof body.error === "string" && body.error) return body.error;
    if (status === 401) return w.wrong;
    return w.odd + " (" + status + ").";
  }

  /* ── the wire ───────────────────────────────────────────────────────────── */

  function Transport(proxyUrl, deps, locale) {
    this.proxyUrl = proxyUrl;
    this.locale = locale;
    // Bound to the window on purpose. `this.fetch(url)` calls fetch with this
    // object as its receiver, and a browser brand-checks that receiver: Chrome
    // answers "Illegal invocation", Firefox "'fetch' called on an object that
    // does not implement interface Window", and the login screen shows the
    // message with no request ever leaving the page. Node does not brand-check,
    // so this only ever failed in a browser.
    this.fetch = (deps && deps.fetch)
      || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    this.cookies = (deps && deps.cookies) || function () {
      return typeof document !== "undefined" ? document.cookie : "";
    };
  }

  Transport.prototype.post = function (url, payload) {
    var locale = this.locale;
    var headers = { "Content-Type": "application/json; charset=utf-8" };
    var csrf = readCookie(CSRF_COOKIE, this.cookies());
    // The stock proxy backend sends no custom header, which is why the bridge
    // needs a backend of our own rather than a configuration of that one.
    if (csrf) headers[CSRF_HEADER] = csrf;
    return this.fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: headers,
      body: JSON.stringify(payload),
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (body) {
        if (res.ok) return body;
        var err = new Error(explain(res.status, body, /\/session$/.test(url), locale));
        err.status = res.status;
        throw err;
      });
    });
  };

  /* ── images on their way out ────────────────────────────────────────────── */

  var IMAGE_DEFAULTS = { convert: "webp", maxWidth: 2000, quality: 0.82 };

  // Two formats are never re-encoded. A canvas reads one frame of an animation,
  // so a GIF would come back as a still, and an SVG is text that a raster pass
  // would destroy outright. Both are refusals, not omissions.
  var NEVER = { ".gif": "an animation would come back as one frame", ".svg": "a vector is not a raster" };

  function extensionOf(name) {
    var dot = String(name).lastIndexOf(".");
    var slash = String(name).lastIndexOf("/");
    return dot > slash ? String(name).slice(dot).toLowerCase() : "";
  }

  // Pure, so the decision is readable without a canvas in the room.
  function imagePlan(path, options) {
    var settings = {
      convert: (options && options.convert) || IMAGE_DEFAULTS.convert,
      maxWidth: (options && options.maxWidth) || IMAGE_DEFAULTS.maxWidth,
      quality: (options && options.quality) || IMAGE_DEFAULTS.quality,
    };
    var ext = extensionOf(path);
    if (settings.convert === "off") return { convert: false, why: "turned off in the config" };
    if (NEVER[ext]) return { convert: false, why: NEVER[ext] };
    if ([".jpg", ".jpeg", ".png", ".webp", ".avif", ".bmp", ".tif", ".tiff"].indexOf(ext) < 0) {
      return { convert: false, why: "not a raster image" };
    }
    return {
      convert: true,
      type: "image/" + settings.convert,
      quality: settings.quality,
      maxWidth: settings.maxWidth,
      targetPath: path.slice(0, path.length - ext.length) + "." + settings.convert,
    };
  }

  // Only ever smaller. Enlarging a photograph to fill a cap invents pixels and
  // costs bytes for nothing.
  function fitWithin(width, height, maxWidth) {
    if (!width || !height || width <= maxWidth) return { width: width, height: height };
    return { width: maxWidth, height: Math.max(1, Math.round(height * maxWidth / width)) };
  }

  // An already-optimised PNG or a small icon usually comes back bigger. Keeping
  // the larger of the two would be a pipeline that quietly makes sites heavier.
  function chooseResult(originalSize, encoded, wantedType) {
    if (!encoded) return { keep: "original", why: "the browser could not re-encode it" };
    if (encoded.type !== wantedType) return { keep: "original", why: "the browser ignored the requested format" };
    if (encoded.size >= originalSize) return { keep: "original", why: "re-encoding made it larger" };
    return { keep: "encoded" };
  }

  // `imageOrientation: "from-image"` is what stops a portrait photograph from
  // being published on its side: the EXIF rotation lives outside the pixels and a
  // canvas drops it.
  async function transcode(blob, want) {
    if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas !== "function") return null;
    var bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
    var size = fitWithin(bitmap.width, bitmap.height, want.maxWidth);
    var canvas = new OffscreenCanvas(size.width, size.height);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close && bitmap.close();
    return canvas.convertToBlob({ type: want.type, quality: want.quality });
  }

  function toBase64(bytes) {
    var out = "";
    for (var i = 0; i < bytes.length; i += 0x8000) {
      out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(out);
  }

  async function optimizeImage(fileObj, path, options, deps) {
    var plan = imagePlan(path, options);
    if (!plan.convert || !fileObj) return { path: path, changed: false, why: plan.why };
    var encoded = null;
    try {
      encoded = await ((deps && deps.transcode) || transcode)(fileObj, plan);
    } catch (e) {
      encoded = null;
    }
    var choice = chooseResult(fileObj.size, encoded, plan.type);
    if (choice.keep === "original") return { path: path, changed: false, why: choice.why };
    var bytes = new Uint8Array(await encoded.arrayBuffer());
    return {
      path: plan.targetPath,
      changed: true,
      content: toBase64(bytes),
      from: fileObj.size,
      to: bytes.length,
    };
  }

  /* ── media ──────────────────────────────────────────────────────────────── */

  // Decap's proxy backend logs and then builds an empty file when the encoding is
  // not base64 (implementation.ts:59-63), which turns a server bug into a silently
  // blank image. This refuses instead.
  function decodeAsset(file) {
    if (!file || typeof file.path !== "string") throw new Error("The site returned a media file with no path.");
    if (file.encoding !== "base64") {
      throw new Error("The site returned '" + file.path + "' as " + file.encoding + " instead of base64.");
    }
    var binary = atob(file.content || "");
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return {
      id: file.id,
      path: file.path,
      name: file.name || file.path.slice(file.path.lastIndexOf("/") + 1),
      bytes: bytes,
    };
  }

  function toMediaObject(file) {
    var decoded = decodeAsset(file);
    var blob = new Blob([decoded.bytes]);
    var asFile = new File([blob], decoded.name);
    var url = URL.createObjectURL(asFile);
    return {
      id: decoded.id, name: decoded.name, path: decoded.path,
      file: asFile, size: asFile.size, url: url, displayURL: url,
    };
  }

  /* ── the preview of the page itself ─────────────────────────────────────── */

  // Decap's own preview lists the fields it was handed. On a site whose pages
  // are built by filling tokens, that reads as a column of labels and values
  // next to a form of labels and values: the same thing twice, and neither of
  // them is the page.
  //
  // When the site publishes a tokenised copy of each page under
  // `admin/preview/`, the editor can show the page. The copy is fetched once,
  // the tokens are filled from the form, and the result is rendered in an
  // iframe of its own. Assets are root-absolute, so the site's stylesheet, its
  // fonts and its images resolve against the same origin as the editor.
  //
  // `admin/preview/index.json` is what says the copies exist. Without it
  // nothing is registered and Decap keeps its own preview, so a site that does
  // not render tokens is left exactly as it was.
  //
  // ponytail: the inline scripts of a page do not run, the admin's own
  // content-security-policy forbids them. A preview shows content, not
  // behaviour. Serve the copies outside /admin/ if that ever matters.
  var PREVIEW_ROOT = "/admin/preview/";
  var PREVIEW_TOKEN = /\{\{\s*([a-z0-9_]+(?:\.[a-z0-9_]+)+)\s*\}\}/gi;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // The same rule the site's build follows: a path of two segments or more, the
  // first naming the file. A token left unfilled stays visible rather than
  // becoming an empty space that reads as deleted text.
  function fillTokens(html, namespace, data) {
    return String(html).replace(PREVIEW_TOKEN, function (whole, path) {
      var parts = path.split(".");
      if (parts.shift() !== namespace) return whole;
      var node = data;
      for (var i = 0; i < parts.length; i++) {
        if (!node || typeof node !== "object") return whole;
        node = node[parts[i]];
      }
      return typeof node === "string" || typeof node === "number" ? escapeHtml(node) : whole;
    });
  }

  function plain(value) {
    if (!value) return value;
    return typeof value.toJS === "function" ? value.toJS() : value;
  }
  function read(node, key) {
    if (!node) return undefined;
    return typeof node.get === "function" ? node.get(key) : node[key];
  }

  // Decap names a preview template after the entry for a file collection and
  // after the collection for a folder one (`selectTemplateName`). Registering
  // under the collection name in both cases looks right and silently does
  // nothing on the collection that is a list of files, which is ours.
  //
  // Only what has a copy is registered. The shop details have no page of their
  // own, and Decap's list of fields is the right thing to show for them.
  // Le chemin du fichier d'une entrée est dans la configuration, pas dans ce que
  // Decap passe au gabarit d'aperçu.
  function filesOf(config) {
    var collections = plain(read(config, "collections")) || [];
    var out = {};
    for (var i = 0; i < collections.length; i++) {
      var list = collections[i].files || [];
      for (var j = 0; j < list.length; j++) {
        if (list[j].name && list[j].file) out[list[j].name] = list[j].file;
      }
    }
    return out;
  }

  function previewNames(config, slugs) {
    var collections = plain(read(config, "collections")) || [];
    var out = [];
    for (var i = 0; i < collections.length; i++) {
      var c = collections[i];
      if (c.folder) {
        if (slugs.indexOf(c.name) >= 0) out.push(c.name);
        continue;
      }
      var files = c.files || [];
      for (var j = 0; j < files.length; j++) {
        if (slugs.indexOf(files[j].name) >= 0) out.push(files[j].name);
      }
    }
    return out;
  }

  // Un client qui s'est trompé veut défaire, pas comprendre git. Le bouton
  // n'apparaît que si une version précédente existe, et il demande une
  // confirmation avant d'écrire : revenir en arrière est une écriture comme une
  // autre, elle compte dans le quota et elle déclenche une construction.
  function whenText(iso, locale) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    try {
      return d.toLocaleString(locale === "fr" ? "fr-FR" : locale || "en", {
        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      });
    } catch (e) { return d.toISOString().slice(0, 16).replace("T", " "); }
  }

  // La plupart des visites d'un site de quartier viennent d'un téléphone, et
  // celui qui écrit ne voit que le rendu large. La bascule pose l'aperçu dans un
  // cadre de téléphone dont l'écran fait exactement 390 px de large : ce sont
  // les pixels que voient les règles de style du site, pas une image réduite.
  //
  // Le choix vit dans une variable du module, pas dans le stockage du
  // navigateur : il suit d'une page à l'autre pendant la séance et repart à
  // zéro au rechargement, ce qui suffit et ne laisse rien derrière.
  var VIEW = "desktop";

  // Trois pastilles, une adresse : le chrome d'un navigateur, réduit à ce qui
  // le rend reconnaissable.
  var DOTS = ["#ff5f57", "#febc2e", "#28c840"];

  function dot(color) {
    return window.h("span", { style: {
      width: "12px", height: "12px", borderRadius: "50%", background: color,
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,.10)", flex: "0 0 auto",
    } });
  }

  // Un volet d'aperçu fait rarement 1280 px de large. À sa largeur réelle, le
  // site répond avec sa mise en page étroite (menu replié), ce qui n'est pas ce
  // que voit un visiteur sur ordinateur. L'écran garde donc une largeur de
  // 1280 px, celle que lisent les règles de style, et c'est le rendu entier qui
  // est réduit pour tenir dans le volet.
  var DESK_W = 1280;

  function fitDesktop(node) {
    if (!node || !node.parentNode) return;
    var stage = node.parentNode;
    var apply = function () {
      var k = stage.clientWidth / DESK_W;
      if (!isFinite(k) || k <= 0) k = 1;
      k = Math.min(1, k);
      node.style.width = DESK_W + "px";
      node.style.height = Math.round(stage.clientHeight / k) + "px";
      node.style.transform = "scale(" + k + ")";
    };
    apply();
    if (node.nthDesk === stage) return;
    node.nthDesk = stage;
    if (typeof window !== "undefined" && window.ResizeObserver) {
      new window.ResizeObserver(apply).observe(stage);
    }
  }

  function desktopFrame(url, screen) {
    var h = window.h;
    return h("div", { style: {
      flex: "1 1 auto", display: "flex", flexDirection: "column", margin: "14px",
      minHeight: 0, borderRadius: "14px", overflow: "hidden", background: "#fff",
      boxShadow: "0 24px 48px -28px rgba(15,23,42,.45), 0 0 0 1px rgba(15,23,42,.09)",
    } },
      h("div", { style: {
        position: "relative", display: "flex", alignItems: "center", gap: "8px",
        height: "42px", padding: "0 14px", flex: "0 0 auto",
        background: "linear-gradient(#fcfcfd, #eff1f5)",
        borderBottom: "1px solid rgba(15,23,42,.08)",
      } },
        dot(DOTS[0]), dot(DOTS[1]), dot(DOTS[2]),
        h("div", { style: {
          position: "absolute", left: "50%", transform: "translateX(-50%)",
          maxWidth: "58%", padding: "4px 16px", borderRadius: "999px",
          background: "#fff", boxShadow: "0 0 0 1px rgba(15,23,42,.09)",
          font: "400 .75rem/1.45 system-ui, sans-serif", color: "#64748b",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        } }, url)),
      h("div", { style: {
        position: "relative", flex: "1 1 0", minHeight: 0,
        overflow: "hidden", background: "#fff",
      } }, screen));
  }

  // L'écran garde ses 390 px de large : ce sont les pixels que lisent les
  // règles de style du site, et une image réduite mentirait sur le rendu. Pour
  // que l'appareil tienne quand même dans le volet sans le faire défiler, c'est
  // le cadre entier qui est mis à l'échelle, la mesure venant de la place
  // libre. Le site continue de se croire sur un téléphone.
  var PHONE_W = 390, PHONE_H = 844, PHONE_BEZEL = 14, PHONE_RADIUS = 44;

  function fitDevice(node) {
    if (!node || node.nthFitted) return;
    node.nthFitted = true;
    var stage = node.parentNode;
    var apply = function () {
      var room = Math.min(
        (stage.clientHeight - 28) / node.offsetHeight,
        (stage.clientWidth - 28) / node.offsetWidth);
      if (!isFinite(room) || room <= 0) room = 1;
      node.style.transform = "translate(-50%, -50%) scale(" + Math.min(1, room) + ")";
    };
    apply();
    // ponytail: l'observateur vit aussi longtemps que le volet et disparaît
    // avec la page ; il y en a un seul, on ne le débranche pas.
    if (typeof window !== "undefined" && window.ResizeObserver) {
      new window.ResizeObserver(apply).observe(stage);
    }
  }

  // Decap pose l'aperçu sous sa propre barre : une hauteur de 100vh descend
  // alors plus bas que ce qu'on voit et c'est le volet entier qui se met à
  // défiler. La hauteur est donc mesurée, du haut réel du bloc au bas de la
  // fenêtre, et refaite quand la fenêtre change.
  function fitPane(node) {
    if (!node || node.nthPane) return;
    node.nthPane = true;
    // Decap rend l'aperçu dans une iframe alors que le code, lui, tourne dans
    // la page parente : `window` n'est pas la fenêtre où le bloc est posé. La
    // hauteur se mesure donc dans la vue du document du bloc, jamais dans
    // celle du script, sans quoi on lit la hauteur de l'éditeur entier.
    var view = (node.ownerDocument && node.ownerDocument.defaultView) || window;
    var apply = function () {
      var body = node.ownerDocument && node.ownerDocument.body;
      if (body) body.style.margin = "0";
      node.style.height = Math.max(240, view.innerHeight - node.getBoundingClientRect().top) + "px";
    };
    apply();
    view.addEventListener("resize", apply);
  }

  function sideButton(side, top, height) {
    return window.h("span", { style: {
      position: "absolute", top: top + "px", width: "3px", height: height + "px",
      background: "linear-gradient(90deg, #14171b, #3d434c)",
      left: side === "left" ? "-3px" : "auto",
      right: side === "right" ? "-3px" : "auto",
      borderRadius: side === "left" ? "2px 0 0 2px" : "0 2px 2px 0",
    } });
  }

  function phoneFrame(screen) {
    var h = window.h;
    return h("div", { style: {
      flex: "1 1 auto", position: "relative", overflow: "hidden", minHeight: 0,
    } },
      h("div", { ref: fitDevice, style: {
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", transformOrigin: "50% 50%",
        boxSizing: "border-box", padding: PHONE_BEZEL + "px",
        width: (PHONE_W + PHONE_BEZEL * 2) + "px",
        height: (PHONE_H + PHONE_BEZEL * 2) + "px",
        background: "linear-gradient(155deg, #343941 0%, #0e1013 46%, #262a31 100%)",
        borderRadius: (PHONE_RADIUS + PHONE_BEZEL) + "px",
        boxShadow: "0 40px 70px -26px rgba(15,23,42,.55), 0 10px 22px -12px rgba(15,23,42,.4),"
          + " inset 0 0 0 1.5px rgba(255,255,255,.16)",
      } },
        sideButton("left", 148, 30),
        sideButton("left", 196, 56),
        sideButton("left", 262, 56),
        sideButton("right", 208, 92),
        h("div", { style: {
          position: "relative", width: PHONE_W + "px", height: PHONE_H + "px",
          borderRadius: PHONE_RADIUS + "px", overflow: "hidden", background: "#fff",
          boxShadow: "0 0 0 1px rgba(0,0,0,.55)",
        } }, screen),
        h("span", { style: {
          position: "absolute", top: "3px", left: "50%", marginLeft: "-4px",
          width: "8px", height: "8px", borderRadius: "50%",
          background: "#0b0d10", boxShadow: "0 0 0 1px rgba(255,255,255,.10)",
        } })));
  }

  // Enregistrer envoie tout d'un coup. Quelqu'un qui a modifié huit champs dans
  // six sections repliées n'a aucun moyen de se relire avant que cela parte.
  //
  // La comparaison se fait contre les valeurs vues au chargement de l'entrée,
  // avant la première frappe : c'est ce que le site publie aujourd'hui.
  var BASELINE = {};
  function clearBaseline() { BASELINE = {}; }

  function flatten(node, prefix, out) {
    var into = out || {};
    if (!node || typeof node !== "object") return into;
    Object.keys(node).forEach(function (key) {
      var value = node[key];
      var path = prefix ? prefix + "." + key : key;
      if (value && typeof value === "object") flatten(value, path, into);
      else into[path] = value == null ? "" : String(value);
    });
    return into;
  }

  function changesBetween(before, after) {
    var was = flatten(before, "");
    var now = flatten(after, "");
    var paths = Object.keys(was).concat(Object.keys(now)).filter(function (p, i, all) {
      return all.indexOf(p) === i;
    });
    var out = [];
    paths.forEach(function (path) {
      var a = was[path] === undefined ? "" : was[path];
      var b = now[path] === undefined ? "" : now[path];
      if (a !== b) out.push({ path: path, before: a, after: b });
    });
    return out;
  }

  // Le chemin d'un champ ne dit rien à un commerçant. Les intitulés de la
  // configuration, eux, sont ceux qu'il a sous les yeux dans le formulaire.
  function labelsOf(fields, prefix, out) {
    var into = out || {};
    (fields || []).forEach(function (field) {
      var path = prefix ? prefix + "." + field.name : field.name;
      into[path] = (prefix ? into[prefix] + " › " : "") + (field.label || field.name);
      if (field.fields) labelsOf(field.fields, path, into);
    });
    return into;
  }

  function labelMaps(config) {
    var collections = plain(read(config, "collections")) || [];
    var out = {};
    collections.forEach(function (c) {
      (c.files || []).forEach(function (f) { out[f.name] = labelsOf(f.fields, "", {}); });
    });
    return out;
  }

  function previewComponent(fetchImpl, slugs, locale, files, backend, siteUrl, labels) {
    var cache = {};
    return window.createClass({
      getInitialState: function () {
        return { html: null, slug: null, missing: false, filled: null, view: VIEW,
                 previous: null, arming: false, busy: false, failed: false, reviewing: false };
      },
      componentDidMount: function () { this.load(); this.schedule(0); },
      componentDidUpdate: function () { this.load(); this.schedule(250); },
      componentWillUnmount: function () { clearTimeout(this.timer); },
      slugOf: function () { return read(this.props.entry, "slug"); },

      // L'adresse affichée est celle du site quand elle est déclarée, faute de
      // quoi celle d'où l'éditeur est servi : c'est le même hôte.
      address: function () {
        if (siteUrl) return String(siteUrl).replace(/^https?:\/\//, "").replace(/\/$/, "");
        return typeof location !== "undefined" ? location.host : "";
      },
      load: function () {
        var slug = this.slugOf();
        if (!slug || slug === this.state.slug) return;
        var self = this;
        if (cache[slug]) { this.setState({ html: cache[slug], slug: slug, missing: false, filled: null }); return; }
        if (slugs.indexOf(slug) < 0) { this.setState({ html: null, slug: slug, missing: true, filled: null }); return; }
        this.askPrevious(slug);
        this.remember(slug);
        fetchImpl(PREVIEW_ROOT + encodeURIComponent(slug) + ".html", { credentials: "same-origin" })
          .then(function (res) { return res.ok ? res.text() : null; })
          .then(function (html) {
            if (html) cache[slug] = html;
            self.setState({ html: html, slug: slug, missing: !html, filled: null });
          })
          .catch(function () { self.setState({ html: null, slug: slug, missing: true }); });
      },
      // Every keystroke is a render, and a new srcdoc reloads the frame. Filling
      // the page again on each letter would make the preview blink all the way
      // through a sentence, so the frame is rebuilt once the typing stops.
      schedule: function (delay) {
        var self = this;
        clearTimeout(this.timer);
        this.timer = setTimeout(function () {
          // Refaire la page pendant qu'on y écrit détruirait l'élément en cours
          // d'édition et le curseur avec. Ce qui est tapé est déjà à l'écran,
          // c'est le DOM de la personne qui tape.
          if (!self.state.html || self.editing) return;
          var next = fillEditable(self.state.html, self.slugOf(), plain(read(self.props.entry, "data")) || {});
          if (next !== self.state.filled) self.setState({ filled: next });
        }, delay);
      },

      // La frappe dans la page va au champ du formulaire. Sans champ monté, la
      // section est fermée : on l'ouvre, puis on recommence.
      push: function (el) {
        var slug = this.slugOf();
        var path = el.getAttribute("data-nth");
        var change = LEAVES[keyOf(slug, path)];
        if (change) { change(el.textContent); return; }
        var self = this;
        expandTo(slug, path, function () {
          var late = LEAVES[keyOf(slug, path)];
          if (late) late(el.textContent);
        });
      },

      // La première fois qu'une entrée passe ici, ce qu'elle porte est ce qui est
      // publié : c'est la référence contre laquelle tout le reste se compare.
      dataNow: function () { return plain(read(this.props.entry, "data")) || {}; },

      remember: function (slug) {
        if (slug && BASELINE[slug] === undefined) BASELINE[slug] = this.dataNow();
      },

      changes: function () {
        var slug = this.slugOf();
        if (!slug || BASELINE[slug] === undefined) return [];
        return changesBetween(BASELINE[slug], this.dataNow());
      },

      labelFor: function (path) {
        var map = (labels && labels[this.slugOf()]) || {};
        return map[path] || path;
      },

      review: function (w) {
        var h = window.h;
        var list = this.changes();
        var line = { padding: "10px 14px", borderBottom: "1px solid #eef0f2" };
        return h("div", { style: {
          flex: "1 1 auto", overflow: "auto", background: "#fff", margin: "10px",
          borderRadius: "12px", border: "1px solid #d8dce1",
          font: "400 .8125rem/1.45 system-ui, sans-serif", color: "#374151", minHeight: 0,
        } },
          list.length ? list.map(function (change, i) {
            return h("div", { key: String(i), style: line },
              h("div", { style: { fontWeight: 600, marginBottom: "4px" } }, this.labelFor(change.path)),
              h("div", { style: { color: "#b45309", textDecoration: "line-through" } },
                change.before || w.wasEmpty),
              h("div", { style: { color: "#166534" } }, change.after || w.nowEmpty));
          }, this) : h("p", { style: { margin: 0, padding: "14px" } }, w.noChanges));
      },

      askPrevious: function (slug) {
        var self = this;
        var path = files && files[slug];
        if (!backend || !path) return;
        backend.request({ action: "previousEntry", params: { path: path } })
          .then(function (out) {
            if (self.slugOf() === slug) self.setState({ previous: out && out.found ? out : null });
          })
          .catch(function () { /* pas d'historique lisible, pas de bouton */ });
      },

      revert: function () {
        var self = this;
        if (!this.state.arming) { this.setState({ arming: true, failed: false }); return; }
        var slug = this.slugOf();
        this.setState({ busy: true });
        backend.request({
          action: "restoreEntry",
          params: { path: files[slug], sha: this.state.previous.sha },
        }).then(function () {
          // L'éditeur tient un brouillon en mémoire ; le rechargement est ce
          // qui garantit qu'on voit le contenu revenu et non l'ancien brouillon.
          window.location.reload();
        }).catch(function () {
          self.setState({ busy: false, arming: false, failed: true });
        });
      },

      choose: function (mode) {
        var self = this;
        return function () { VIEW = mode; self.setState({ view: mode }); };
      },

      segment: function (mode, label) {
        var on = VIEW === mode;
        return window.h("button", {
          type: "button", onClick: this.choose(mode),
          style: {
            padding: "4px 10px", cursor: "pointer", font: "inherit",
            border: "1px solid " + (on ? "#1f3a5f" : "#d1d5db"),
            background: on ? "#1f3a5f" : "#fff", color: on ? "#fff" : "#374151",
            borderRadius: mode === "desktop" ? "6px 0 0 6px" : "0 6px 6px 0",
            marginLeft: mode === "desktop" ? 0 : "-1px",
          },
        }, label);
      },

      reviewButton: function (w) {
        var self = this;
        var count = this.changes().length;
        if (!count && !this.state.reviewing) return null;
        return window.h("button", {
          type: "button",
          onClick: function () { self.setState({ reviewing: !self.state.reviewing }); },
          style: {
            padding: "4px 10px", borderRadius: "6px", cursor: "pointer", font: "inherit",
            border: "1px solid " + (this.state.reviewing ? "#1f3a5f" : "#d1d5db"),
            background: this.state.reviewing ? "#eef2f7" : "#fff", color: "#374151",
          },
        }, this.state.reviewing ? w.backToPreview : w.changes(count));
      },

      bar: function (w) {
        var h = window.h;
        var previous = this.state.previous;
        var canRevert = previous && backend && files && files[this.slugOf()];
        var label = this.state.busy ? w.revertBusy
          : this.state.arming ? w.revertConfirm
          : previous ? w.revert(whenText(previous.at, locale)) : "";
        return h("div", { style: {
          display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px",
          borderBottom: "1px solid #e5e7eb", background: "#fafafa", flex: "0 0 auto",
          font: "400 .8125rem/1.3 system-ui, sans-serif",
        } },
          h("div", { style: { display: "flex" } },
            this.segment("desktop", w.desktop), this.segment("phone", w.phone)),
          this.reviewButton(w),
          canRevert ? h("button", {
            type: "button", onClick: this.revert, disabled: this.state.busy,
            style: {
              padding: "4px 10px", borderRadius: "6px", cursor: "pointer",
              border: "1px solid " + (this.state.arming ? "#b45309" : "#d1d5db"),
              background: this.state.arming ? "#fffbeb" : "#fff",
              color: this.state.arming ? "#92400e" : "#374151", font: "inherit",
            },
          }, label) : null,
          this.state.failed ? h("span", { style: { color: "#b00020" } }, w.revertFailed) : null);
      },

      wire: function (frame) {
        var self = this;
        var doc = frame.contentDocument;
        if (!doc || doc.nthWired) return;
        doc.nthWired = true;
        var target = function (event) {
          var node = event.target;
          return node && node.closest ? node.closest("[data-nth]") : null;
        };
        doc.addEventListener("focusin", function (event) {
          var el = target(event);
          if (!el) return;
          self.editing = true;
          // Ouvrir le chemin dès le clic, pour que le champ existe avant la
          // première lettre.
          expandTo(self.slugOf(), el.getAttribute("data-nth"), function () {});
        });
        doc.addEventListener("click", function (event) {
          var node = event.target;
          var picture = node && node.closest ? node.closest("[data-nth-img]") : null;
          if (!picture) return;
          var slug = self.slugOf();
          var path = picture.getAttribute("data-nth-img");
          var open = function () {
            var opener = IMAGES[keyOf(slug, path)];
            if (opener) opener();
          };
          // La section peut être fermée : le champ n'existe pas encore.
          if (IMAGES[keyOf(slug, path)]) open();
          else expandTo(slug, path, open);
        }, true);
        doc.addEventListener("input", function (event) {
          var el = target(event);
          if (el) self.push(el);
        });
        doc.addEventListener("focusout", function (event) {
          var el = target(event);
          if (!el) return;
          self.push(el);
          self.editing = false;
          self.schedule(250);
        });
        // Le site marque les passages qu'il n'a pas pu sortir en champ ; c'est
        // l'éditeur qui les explique, dans la langue déclarée.
        var fixedHint = words(locale).fixed;
        var fixedNodes = doc.querySelectorAll ? doc.querySelectorAll("[data-nth-fixed]") : [];
        for (var i = 0; i < fixedNodes.length; i++) fixedNodes[i].setAttribute("title", fixedHint);

        // Un aperçu montre une page, il ne s'y promène pas. Sans cela un clic
        // sur un lien ou sur un bouton remplace l'aperçu par la vraie page,
        // et la frappe n'a plus rien à quoi s'accrocher. Le curseur, lui, se
        // pose au `mousedown`, donc annuler le clic ne l'empêche pas.
        doc.addEventListener("click", function (event) {
          var node = event.target;
          var control = node && node.closest
            ? node.closest("a[href], button, input[type=submit], input[type=image], [role=button]")
            : null;
          if (control) event.preventDefault();
        }, true);
        doc.addEventListener("submit", function (event) { event.preventDefault(); }, true);

        // Un champ de texte simple n'a pas de ligne suivante, et un collage
        // apporterait la mise en forme de son origine.
        doc.addEventListener("keydown", function (event) {
          if (event.key === "Enter" && target(event)) { event.preventDefault(); event.target.blur(); }
        });
        doc.addEventListener("paste", function (event) {
          if (!target(event)) return;
          event.preventDefault();
          var clip = event.clipboardData || frame.contentWindow.clipboardData;
          var text = clip ? clip.getData("text/plain") : "";
          doc.execCommand("insertText", false, String(text).replace(/\s+/g, " "));
        });
      },

      // Setting srcdoc reloads the frame, which sends it back to the top. The
      // person editing the last section of a long page would be thrown to the
      // header on every keystroke.
      // Un téléphone n'a pas de barre de défilement permanente. Celle du
      // navigateur en prend quinze des trois cent quatre-vingt-dix pixels et
      // se voit sur le côté de l'écran, ce qui ne ressemble à rien de réel.
      // Sur la vue ordinateur elle reste : un visiteur sur ordinateur l'a.
      bars: function (frame) {
        var doc = frame && frame.contentDocument;
        if (!doc || !doc.documentElement) return;
        var el = doc.getElementById("nth-bars");
        if (VIEW !== "phone") {
          if (el && el.parentNode) el.parentNode.removeChild(el);
          return;
        }
        if (el) return;
        el = doc.createElement("style");
        el.id = "nth-bars";
        el.textContent = "html{scrollbar-width:none}html::-webkit-scrollbar{width:0;height:0}";
        (doc.head || doc.documentElement).appendChild(el);
      },
      keepScroll: function (frame) {
        if (!frame) return;
        if (VIEW === "desktop") fitDesktop(frame);
        this.bars(frame);
        if (frame.dataset.nthScroll) return;
        frame.dataset.nthScroll = "1";
        var self = this;
        var at = 0;
        frame.addEventListener("load", function () {
          try {
            if (at) frame.contentWindow.scrollTo(0, at);
            frame.contentWindow.addEventListener("scroll", function () {
              at = frame.contentWindow.scrollY;
            });
            self.bars(frame);
            self.wire(frame);
          } catch (e) { /* a frame that refused to load has nothing to restore */ }
        });
      },
      render: function () {
        var h = window.h;
        // Decap does not hand the configuration to a preview template, so the
        // language is captured when the template is registered.
        var w = words(locale);
        // The preview renders inside Decap's own frame, which the admin
        // stylesheet does not reach. One inline style is shorter than
        // registering a stylesheet for two sentences.
        var note = { margin: "2rem", font: "400 .95rem/1.5 system-ui, sans-serif", color: "#666" };
        if (this.state.missing) return h("p", { style: note }, w.noPreview);
        if (!this.state.filled) return h("p", { style: note }, w.loadingPreview);
        var screen = h("iframe", {
          ref: this.keepScroll,
          title: w.preview,
          srcDoc: this.state.filled,
          style: VIEW === "phone"
            ? { display: "block", width: "390px", height: "844px", border: 0 }
            : { display: "block", position: "absolute", top: 0, left: 0,
                border: 0, transformOrigin: "0 0" },
        });
        return h("div", { ref: fitPane, style: {
          display: "flex", flexDirection: "column", height: "100vh",
          background: "radial-gradient(120% 90% at 50% 0%, #f8f9fb 0%, #e7eaef 100%)",
        } },
          this.bar(w),
          this.state.reviewing ? this.review(w)
            : VIEW === "phone" ? phoneFrame(screen) : desktopFrame(this.address(), screen));
      },
    });
  }

  // Une section pliable porte son intitulé deux fois : au-dessus de la boîte
  // (le libellé du champ) et dans l'en-tête de la boîte quand elle est fermée.
  // Et cet en-tête devient vide dès qu'on l'ouvre, si bien qu'on perd le fil
  // dans les niveaux imbriqués. Le libellé du dessus, lui, est toujours là :
  // c'est celui qu'on garde, et l'autre qu'on efface.
  //
  // Les noms de classes d'Emotion portent le nom du composant qui les a émises
  // (`css-1265b6l-TopBarContainer`). Le suffixe est stable d'une version de
  // correctif à l'autre ; s'il changeait, plus rien ne s'appliquerait et
  // l'éditeur reprendrait l'apparence que Decap lui donne.
  var EDITOR_STYLE = [
    /* l'intitulé répété dans l'en-tête de la boîte, sans toucher au bouton */
    '[class*="ExpandButtonContainer"]{font-size:0}',
    '[class*="ExpandButtonContainer"] button{font-size:1rem}',
    /* le libellé qui reste devient le titre de la section */
    '[class*="ControlContainer"]:has([class*="TopBarContainer"])>[class*="ControlTopbar"]>label{',
    'font-size:.9375rem;font-weight:600;text-transform:none;letter-spacing:0;',
    'color:var(--nth-admin-ink,#1b1b1b)}',
    /* ce qu'il reste avant la limite d'écritures */
    '#nth-quota{position:fixed;left:12px;bottom:12px;z-index:9999;padding:6px 12px;',
    'border-radius:999px;font:400 .8125rem/1.2 system-ui,sans-serif;color:#4b5563;',
    'background:#fff;border:1px solid #e5e7eb;box-shadow:0 1px 2px rgba(0,0,0,.08);',
    'pointer-events:none}',
    '#nth-quota[data-low="1"]{color:#92400e;background:#fffbeb;border-color:#fde68a}',
    /* le compteur d'un champ, montré quand on écrit dedans ou hors fourchette */
    '.nth-count{color:#6b7280;opacity:0;transition:opacity .12s}',
    '[class*="ControlContainer"]:focus-within .nth-count{opacity:1}',
    '.nth-count--off{color:#92400e;opacity:1}',
    /* ce qui attend la mise en ligne, et le bouton qui l'envoie */
    '#nth-pending{position:fixed;left:12px;bottom:52px;z-index:9999;display:flex;',
    'align-items:center;gap:10px;padding:6px 8px 6px 12px;border-radius:999px;',
    'font:400 .8125rem/1.2 system-ui,sans-serif;color:#374151;background:#fff;',
    'border:1px solid #e5e7eb;box-shadow:0 1px 2px rgba(0,0,0,.08)}',
    '#nth-pending button{padding:4px 12px;border-radius:999px;border:0;cursor:pointer;',
    'background:#1f3a5f;color:#fff;font:inherit}',
    '#nth-pending button[disabled]{opacity:.6;cursor:default}',
    /* la recherche dans le contenu */
    /* La recherche est globale : elle vit dans la barre du haut, au centre,
       et non sur le formulaire dont elle couvrait les champs. */
    '#nth-find{position:fixed;top:15px;left:50%;transform:translateX(-50%);z-index:9999;',
    'width:320px;display:flex;flex-direction:column;align-items:center;',
    'font:400 .8125rem/1.35 system-ui,sans-serif}',
    /* Le champ reste étroit tant qu'on ne s'en sert pas : il flotte au-dessus
       du formulaire et ne doit pas en couvrir plus que nécessaire. */
    '#nth-find input{width:180px;padding:7px 12px;border-radius:999px;border:1px solid #e5e7eb;',
    'background:#fff;font:inherit;box-shadow:0 1px 2px rgba(0,0,0,.08);',
    'transition:width .15s ease}',
    '#nth-find input:focus,#nth-find input:not(:placeholder-shown){width:320px}',
    '.nth-find-list{width:100%}',
    '.nth-find-list:not(:empty){margin-top:6px;max-height:280px;overflow:auto;background:#fff;',
    'border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,.1);padding:4px}',
    '.nth-find-row{display:block;width:100%;text-align:left;padding:7px 9px;border:0;border-radius:6px;',
    'background:none;cursor:pointer;font:inherit;color:#374151}',
    '.nth-find-row:hover{background:#eef2f7}',
    '.nth-find-where{display:block;font-size:.75rem;color:#6b7280}',
    '.nth-find-note{margin:4px 9px;color:#6b7280;font-size:.75rem}',
  ].join("");

  function injectEditorStyle(doc) {
    if (!doc || doc.getElementById("nth-editor-style")) return;
    var el = doc.createElement("style");
    el.id = "nth-editor-style";
    el.textContent = EDITOR_STYLE;
    doc.head.appendChild(el);
  }

  /* ── écrire dans la page plutôt que dans le formulaire ──────────────────── */

  // Decap ne donne au gabarit d'aperçu qu'une lecture de l'entrée. Pour qu'une
  // frappe dans la page atteigne le formulaire, il faut attraper le `onChange`
  // de chaque champ là où Decap le distribue : dans le contrôle du widget.
  //
  // Le chemin d'un champ n'est pas dans ses propriétés. Ce qu'il y a, c'est la
  // liste des identifiants de ses ancêtres. Chaque objet qui se rend inscrit son
  // identifiant et son nom, si bien que cette liste se relit en chemin.
  //
  // Un identifiant est frappé à la naissance du composant et React réutilise ses
  // instances d'une entrée à l'autre : le préfixe d'un identifiant peut donc
  // nommer le champ d'une autre page. Seule la table tenue à jour dit la vérité,
  // le préfixe n'est qu'un dernier recours.
  var NAMES = {};    // identifiant d'un objet -> nom de son champ
  var LEAVES = {};   // entrée + chemin -> onChange du champ
  var IMAGES = {};   // entrée + chemin -> ouvrir la médiathèque sur ce champ
  var BOXES = {};    // entrée + chemin -> déplier la section

  function nameOf(field) {
    if (!field) return "";
    return typeof field.get === "function" ? field.get("name") : field.name;
  }
  function listOf(value) {
    if (!value) return [];
    return typeof value.toJS === "function" ? value.toJS() : value;
  }
  function pathOf(props) {
    var parents = listOf(props.parentIds).map(function (id) {
      return NAMES[id] || String(id).replace(/-field-\d+$/, "");
    });
    return parents.concat(nameOf(props.field)).join(".");
  }
  function keyOf(slug, path) { return String(slug) + "\u0000" + path; }
  function keyOfProps(props) {
    var entry = props.entry;
    var slug = entry && (typeof entry.get === "function" ? entry.get("slug") : entry.slug);
    return keyOf(slug, pathOf(props));
  }

  // Le registre des widgets rend le même objet à chaque appel, donc remplacer
  // son contrôle sur place garde son aperçu, son schéma et le reste.
  // `registerWidget` à deux arguments les perdrait.
  // Un compteur sous chaque champ de texte. Il ne se montre qu'au moment où on
  // écrit dedans, sinon un formulaire de sept cents champs porterait sept cents
  // lignes de plus.
  //
  // Une fourchette n'est affichée que là où il en existe une qui soit vraie.
  // Google tronque un titre de résultat autour de 50 à 60 signes et une
  // description autour de 150 à 160 ; un H1, lui, n'a pas de longueur
  // recommandée, alors le compteur s'y tait sur la question et se contente de
  // dire ce qu'il y a. Inventer un seuil serait pire que ne rien dire.
  var SEO_TARGETS = {
    "seo.titre": { min: 50, max: 60 },
    "seo.title": { min: 50, max: 60 },
    "seo.description": { min: 150, max: 160 },
  };

  function targetFor(path) {
    var parts = String(path).split(".");
    return SEO_TARGETS[parts.slice(-2).join(".")] || null;
  }

  function countWords(text) {
    var trimmed = String(text == null ? "" : text).trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }

  function counterText(value, target, long, w) {
    var text = String(value == null ? "" : value);
    var out = w.chars(text.length);
    if (long) out += ", " + w.words(countWords(text));
    if (target) out += " (" + w.advised(target.min, target.max) + ")";
    return out;
  }

  function counterNode(props, path, locale) {
    var h = window.h;
    var target = targetFor(path);
    var widget = props.field && (props.field.get ? props.field.get("widget") : props.field.widget);
    var value = props.value == null ? "" : String(props.value);
    var off = target && (value.length < target.min || value.length > target.max);
    return h("p", {
      className: off ? "nth-count nth-count--off" : "nth-count",
      style: { margin: "2px 0 0", font: "400 .75rem/1.3 system-ui, sans-serif" },
    }, counterText(value, target, widget === "text", words(locale)));
  }

  function bindWidgets(cms, locale) {
    if (!cms || typeof cms.getWidget !== "function") return [];
    var bound = [];
    ["string", "text"].forEach(function (name) {
      var widget = cms.getWidget(name);
      if (!widget || !widget.control || widget.control.nthBound) return;
      var Base = widget.control;
      var Leaf = class extends Base {
        render() {
          var path = pathOf(this.props);
          LEAVES[keyOfProps(this.props)] = this.props.onChange;
          // `display: contents` laisse la mise en page de Decap intacte : le
          // contrôle reste là où son conteneur l'attend, le compteur se glisse
          // juste après.
          return window.h("div", { className: "nth-field", style: { display: "contents" } },
            super.render(), counterNode(this.props, path, locale));
        }
      };
      Leaf.nthBound = true;
      widget.control = Leaf;
      bound.push(name);
    });
    // Une photo de monture est ce qu'un opticien change le plus souvent, et une
    // image vit dans un attribut, donc elle n'est pas modifiable au clavier dans
    // la page. Ce qu'on peut faire, c'est ouvrir la médiathèque du bon champ.
    var picture = cms.getWidget("image");
    if (picture && picture.control && !picture.control.nthBound) {
      var BasePicture = picture.control;
      var Picture = class extends BasePicture {
        render() {
          var self = this;
          IMAGES[keyOfProps(this.props)] = function () {
            self.props.onOpenMediaLibrary({
              controlID: self.props.forID,
              forImage: true,
              privateUpload: false,
              value: self.props.value,
              allowMultiple: false,
              config: self.props.field && (self.props.field.get
                ? self.props.field.get("options") : self.props.field.options),
              field: self.props.field,
            });
          };
          return super.render();
        }
      };
      Picture.nthBound = true;
      picture.control = Picture;
      bound.push("image");
    }

    var box = cms.getWidget("object");
    if (box && box.control && !box.control.nthBound) {
      var BaseBox = box.control;
      var Box = class extends BaseBox {
        render() {
          NAMES[this.props.forID] = nameOf(this.props.field);
          var self = this;
          BOXES[keyOfProps(this.props)] = function () { self.setState({ collapsed: false }); };
          return super.render();
        }
      };
      Box.nthBound = true;
      box.control = Box;
      bound.push("object");
    }
    return bound;
  }

  // Une section fermée ne rend pas ses champs, donc leur `onChange` n'existe
  // pas encore. Cliquer dans la page ouvre le chemin, section par section, en
  // laissant à chacune le temps de se rendre.
  function expandTo(slug, path, done, wait) {
    var parts = path.split(".");
    var prefix = [];
    var delay = wait === undefined ? 40 : wait;
    var step = function (i) {
      if (i >= parts.length - 1) return done();
      prefix.push(parts[i]);
      var open = BOXES[keyOf(slug, prefix.join("."))];
      if (open) open();
      setTimeout(function () { step(i + 1); }, delay);
    };
    step(0);
  }

  // Un jeton n'est modifiable dans la page que s'il est tout le contenu de son
  // élément. Dans un attribut (`alt`, `src`) ou dans l'en-tête du document, il
  // n'y a rien à cliquer, et l'extraction a de toute façon mis chaque texte
  // seul dans sa balise.
  var EDITABLE = /(<([a-z][a-z0-9]*)\b[^<>]*>)(\s*)\{\{\s*([a-z0-9_]+(?:\.[a-z0-9_]+)+)\s*\}\}(\s*)(<\/\2>)/gi;

  var EDIT_STYLE = "<style>"
    + "[data-nth]{outline:1px dashed rgba(0,0,0,.16);outline-offset:3px;cursor:text}"
    + "[data-nth]:hover{outline-color:rgba(0,0,0,.4)}"
    + "[data-nth]:focus{outline:2px solid #2f6fed;outline-offset:3px}"
    // Un passage figé ne se signale qu'au survol : le liseré permanent est
    // réservé à ce qui se modifie, sinon la page en serait couverte.
    + "[data-nth-img]{cursor:pointer}"
    + "[data-nth-img]:hover{outline:2px solid #2f6fed;outline-offset:2px}"
    + "[data-nth-fixed]{cursor:not-allowed}"
    + "[data-nth-fixed]:hover{outline:1px dotted rgba(146,64,14,.55);outline-offset:3px}"
    + "</style>";

  function valueAt(data, parts) {
    var node = data;
    for (var i = 0; i < parts.length; i++) {
      if (!node || typeof node !== "object") return null;
      node = node[parts[i]];
    }
    return typeof node === "string" || typeof node === "number" ? node : null;
  }

  // Une image porte son jeton dans `src`, donc rien à cliquer dans du texte : la
  // balise elle-même reçoit la marque, et le clic ouvrira la médiathèque.
  function markImages(html, namespace) {
    return String(html).replace(/<img\b[^<>]*>/gi, function (tag) {
      var found = /src="\{\{\s*([a-z0-9_]+(?:\.[a-z0-9_]+)+)\s*\}\}"/i.exec(tag);
      if (!found) return tag;
      var parts = found[1].split(".");
      if (parts.shift() !== namespace) return tag;
      return tag.replace(/^<img\b/i, '<img data-nth-img="' + parts.join(".") + '"');
    });
  }

  function fillEditable(html, namespace, data) {
    var text = markImages(html, namespace);
    var head = text.toLowerCase().indexOf("</head>");
    var cut = head < 0 ? 0 : head + 7;
    var body = text.slice(cut).replace(EDITABLE, function (whole, open, tag, before, path, after, close) {
      var parts = path.split(".");
      if (parts.shift() !== namespace) return whole;
      var value = valueAt(data, parts);
      if (value === null) return whole;
      return open.replace(/>$/, ' data-nth="' + parts.join(".") + '" contenteditable="true">')
        + before + escapeHtml(value) + after + close;
    });
    var filled = fillTokens(text.slice(0, cut), namespace, data) + fillTokens(body, namespace, data);
    return filled.replace(/<\/body>/i, EDIT_STYLE + "</body>");
  }

  /* ── ce qu'il reste avant la limite ─────────────────────────────────────── */

  // Le pont refuse une écriture au-delà du quota, parce qu'une agence paie les
  // constructions que ses clients déclenchent. Apprendre la limite au moment du
  // refus, c'est l'apprendre une fois le texte écrit.
  //
  // La fenêtre montrée est la plus serrée des deux, celle qui refusera la
  // première. Le bandeau vit hors de l'arbre de React, dans le corps du
  // document, si bien qu'aucun rendu ne l'efface.
  function whenOf(w, words_) {
    if (w.hours === 1) return words_.thisHour;
    if (w.hours === 24) return words_.today;
    if (w.hours >= 672 && w.hours <= 744) return words_.thisMonth;
    return words_.overHours(w.hours);
  }

  function quotaText(locale, w) {
    var words_ = words(locale);
    var when = whenOf(w, words_);
    return w.left > 0 ? words_.quotaLeft(w.left, when) : words_.quotaNone(when);
  }

  function tightest(windows) {
    var out = null;
    (windows || []).forEach(function (w) {
      if (!w || typeof w.left !== "number") return;
      if (!out || w.left < out.left) out = w;
    });
    return out;
  }

  // En publication manuelle, enregistrer ne met pas en ligne. Le bandeau du bas
  // porte alors ce qui attend et le bouton qui l'envoie. Il vit hors de l'arbre
  // de React, comme le compteur du quota, pour qu'aucun rendu ne l'efface.
  function showPending(count, locale, backend, doc) {
    var page = doc || (typeof document !== "undefined" ? document : null);
    if (!page || !page.body) return null;
    var el = page.getElementById("nth-pending");
    if (!count) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      return null;
    }
    var w = words(locale);
    if (!el) {
      el = page.createElement("div");
      el.id = "nth-pending";
      page.body.appendChild(el);
      el.count = page.createElement("span");
      el.button = page.createElement("button");
      el.button.setAttribute("type", "button");
      el.button.onclick = function () {
        el.button.disabled = true;
        el.button.textContent = w.publishBusy;
        backend.request({ action: "publishSite", params: {} })
          .then(function () {
            el.count.textContent = w.published;
            if (el.button.parentNode) el.button.parentNode.removeChild(el.button);
          })
          .catch(function () {
            el.button.disabled = false;
            el.button.textContent = w.publish;
            el.count.textContent = w.publishFailed;
          });
      };
      el.appendChild(el.count);
      el.appendChild(el.button);
    }
    el.count.textContent = w.pending(count);
    el.button.textContent = w.publish;
    return el;
  }

  // Sept cents champs sur trente-trois pages : la question de celui qui écrit
  // est "où est cette phrase", pas "quelle page". Le pont rend le fichier, le
  // chemin et un extrait ; le clic ouvre l'entrée puis déplie jusqu'au champ.
  function showFinder(config, backend, locale, doc) {
    var page = doc || (typeof document !== "undefined" ? document : null);
    if (!page || !page.body || page.getElementById("nth-find")) return null;
    var w = words(locale);
    var files = filesOf(config);
    var slugOfFile = {};
    Object.keys(files).forEach(function (slug) { slugOfFile[files[slug]] = slug; });
    var collectionOf = {};
    (plain(read(config, "collections")) || []).forEach(function (c) {
      (c.files || []).forEach(function (f) { collectionOf[f.name] = c.name; });
    });
    var maps = labelMaps(config);

    var box = page.createElement("div");
    box.id = "nth-find";
    var field = page.createElement("input");
    field.type = "search";
    field.placeholder = w.find;
    var list = page.createElement("div");
    list.className = "nth-find-list";
    box.appendChild(field);
    box.appendChild(list);
    page.body.appendChild(box);

    var timer = null;
    var run = function () {
      var query = field.value.trim();
      if (query.length < 2) { list.textContent = ""; return; }
      backend.request({ action: "searchContent", params: { query: query } })
        .then(function (out) {
          list.textContent = "";
          var found = (out && out.matches) || [];
          if (!found.length) {
            list.appendChild(page.createTextNode(w.findNone));
            return;
          }
          found.forEach(function (match) {
            var slug = slugOfFile[match.file];
            if (!slug) return;
            var row = page.createElement("button");
            row.type = "button";
            row.className = "nth-find-row";
            var where = page.createElement("span");
            where.className = "nth-find-where";
            where.textContent = ((maps[slug] || {})[match.field]) || match.field;
            var what = page.createElement("span");
            what.textContent = match.value;
            row.appendChild(where);
            row.appendChild(what);
            row.onclick = function () {
              var collection = collectionOf[slug];
              if (!collection) return;
              // Les résultats couvrent le formulaire : une fois qu'on a choisi,
              // ce qu'il faut voir est le champ, pas la liste.
              list.textContent = "";
              field.value = "";
              location.hash = "#/collections/" + collection + "/entries/" + slug;
              // Le rendu de l'entrée doit avoir eu lieu avant qu'une section
              // puisse s'ouvrir : le champ n'existe pas avant.
              setTimeout(function () { expandTo(slug, match.field, function () {}); }, 400);
            };
            list.appendChild(row);
          });
          if (out && out.truncated) {
            var note = page.createElement("p");
            note.className = "nth-find-note";
            note.textContent = w.findMore;
            list.appendChild(note);
          }
        })
        .catch(function () { list.textContent = w.findNone; });
    };
    field.oninput = function () { clearTimeout(timer); timer = setTimeout(run, 250); };
    return box;
  }

  function showQuota(windows, locale, doc) {
    var page = doc || (typeof document !== "undefined" ? document : null);
    if (!page || !page.body) return null;
    var el = page.getElementById("nth-quota");
    var w = tightest(windows);
    if (!w) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      return null;
    }
    if (!el) {
      el = page.createElement("div");
      el.id = "nth-quota";
      el.setAttribute("role", "status");
      page.body.appendChild(el);
    }
    el.textContent = quotaText(locale, w);
    el.setAttribute("data-low", w.left <= 1 ? "1" : "0");
    return el;
  }

  function registerPreviews(cms, config, deps, backend) {
    var fetchImpl = (deps && deps.fetch)
      || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    if (!cms || typeof cms.registerPreviewTemplate !== "function" || !fetchImpl) {
      return Promise.resolve([]);
    }
    return fetchImpl(PREVIEW_ROOT + "index.json", { credentials: "same-origin" })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (slugs) {
        if (!Array.isArray(slugs) || !slugs.length) return [];
        var names = previewNames(config, slugs);
        if (!names.length) return [];
        bindWidgets(cms, read(config, "locale"));
        var Component = previewComponent(fetchImpl, slugs, read(config, "locale"),
          filesOf(config), backend, read(config, "site_url"), labelMaps(config));
        for (var i = 0; i < names.length; i++) cms.registerPreviewTemplate(names[i], Component);
        return names;
      })
      .catch(function () { return []; });
  }

  /* ── the backend ────────────────────────────────────────────────────────── */

  function NthBackend(config, options) {
    var backend = (config && config.backend) || {};
    this.proxyUrl = backend.proxy_url || "/api/cms";
    // Decap's proxy backend defaults to `master`. The bridge reads the branch from
    // its own policy and ignores whatever arrives in the body, so this value is
    // what the client says rather than what the server does; the default matches
    // the shipped policy so the two never describe different things.
    this.branch = backend.branch || "content";
    this.mediaFolder = config && config.media_folder;
    this.options = options || {};
    this.deps = this.options.deps;
    this.image = {
      convert: backend.image_convert,
      maxWidth: backend.image_max_width,
      quality: backend.image_quality,
    };
    this.config = config;
    this.locale = (config && config.locale) || "en";
    this.transport = new Transport(this.proxyUrl, this.deps, this.locale);
    // The constructor is the first moment the whole configuration is readable,
    // and it is still before the editor renders anything.
    injectEditorStyle(typeof document !== "undefined" ? document : null);
    this.previews = registerPreviews(
      (this.options.cms) || (typeof window !== "undefined" ? window.CMS : null),
      config, this.deps, this);
  }

  NthBackend.prototype.isGitBackend = function () { return false; };

  NthBackend.prototype.status = function () {
    return Promise.resolve({ auth: { status: true }, api: { status: true, statusPage: "" } });
  };

  NthBackend.prototype.getToken = function () { return Promise.resolve(""); };

  // Decap calls this inside `render()` (App.js:126) and re-renders on every auth
  // dispatch. A fresh class each time is a fresh element type, so React unmounts
  // the form and the client watches their half-typed email disappear. One class
  // per proxy url, built once.
  var screens = {};
  NthBackend.prototype.authComponent = function () {
    var url = this.proxyUrl;
    if (!screens[url]) screens[url] = loginScreen(url, this.options.deps);
    return screens[url];
  };

  NthBackend.prototype.sessionUrl = function () { return this.proxyUrl + "/session"; };

  // Called with a password when something other than our screen drives the login,
  // and without one when the screen has already opened the session.
  NthBackend.prototype.authenticate = function (credentials) {
    var self = this;
    var creds = credentials || {};
    if (!creds.password) return this.restoreUser({ email: creds.email });
    return this.transport.post(this.sessionUrl(), { email: creds.email, password: creds.password })
      .then(function (user) { return self.asUser(user); });
  };

  // Decap keeps the user object in localStorage and hands it back on reload. It
  // proves nothing, so the session is checked against the bridge before the
  // editor is shown; a dead session lands on the login screen instead of on an
  // editor whose every action fails.
  NthBackend.prototype.restoreUser = function (stored) {
    var self = this;
    return this.request({ action: "info", params: {} }).then(function (info) {
      showQuota(info && info.quota, self.locale);
      self.pending = (info && info.pending) || 0;
      showPending(self.pending, self.locale, self);
      showFinder(self.config, self, self.locale);
      return self.asUser(stored || {});
    });
  };

  // Une écriture rend ce qui reste avec sa réponse : le pont a déjà lu
  // l'historique pour décider, redemander coûterait une lecture de plus à
  // GitHub pour un nombre qu'il connaît.
  NthBackend.prototype.counted = function (promise) {
    var self = this;
    return promise.then(function (out) {
      // Ce qui vient d'être enregistré est la nouvelle référence : la relecture
      // repart de là plutôt que de continuer à montrer ce qui est déjà parti.
      clearBaseline();
      if (out && out.quota) showQuota(out.quota, self.locale);
      // Une écriture de plus en attente : le pont a déjà répondu, redemander
      // coûterait un appel pour un nombre qu'on sait incrémenter.
      if (typeof self.pending === "number") {
        self.pending += 1;
        showPending(self.pending, self.locale, self);
      }
      return out;
    });
  };

  NthBackend.prototype.asUser = function (user) {
    var email = user.email || "";
    return { name: email, login: email, email: email, roles: user.roles || [] };
  };

  NthBackend.prototype.logout = function () {
    return this.transport.post(this.sessionUrl(), { action: "logout" }).catch(function () { return null; });
  };

  NthBackend.prototype.request = function (payload) {
    var body = { branch: this.branch };
    for (var key in payload) if (Object.prototype.hasOwnProperty.call(payload, key)) body[key] = payload[key];
    return this.transport.post(this.proxyUrl, body);
  };

  NthBackend.prototype.entriesByFolder = function (folder, extension, depth) {
    return this.request({
      action: "entriesByFolder",
      params: { branch: this.branch, folder: folder, extension: extension, depth: depth },
    });
  };

  NthBackend.prototype.entriesByFiles = function (files) {
    return this.request({ action: "entriesByFiles", params: { branch: this.branch, files: files } });
  };

  NthBackend.prototype.getEntry = function (path) {
    return this.request({ action: "getEntry", params: { branch: this.branch, path: path } });
  };

  NthBackend.prototype.getMedia = function (mediaFolder) {
    return this.request({
      action: "getMedia",
      params: { branch: this.branch, mediaFolder: mediaFolder || this.mediaFolder },
    }).then(function (files) { return (files || []).map(toMediaObject); });
  };

  NthBackend.prototype.getMediaFile = function (path) {
    return this.request({ action: "getMediaFile", params: { branch: this.branch, path: path } })
      .then(toMediaObject);
  };

  NthBackend.prototype.persistEntry = function (entry, options) {
    var self = this;
    return this.counted(Promise.all((entry.assets || []).map(serializeAsset)).then(function (assets) {
      return self.request({
        action: "persistEntry",
        params: {
          branch: self.branch,
          dataFiles: entry.dataFiles,
          assets: assets,
          options: options || {},
        },
      });
    }));
  };

  NthBackend.prototype.persistMedia = function (asset, options) {
    var self = this;
    return optimizeImage(asset.fileObj, asset.path, this.image, this.deps)
      .then(function (result) {
        if (!result.changed) {
          return serializeAsset(asset).then(function (s) { return { asset: s, note: result.why }; });
        }
        // Renaming is what makes the extension honest, and Decap's duplicate
        // check ran against the name the client dropped, not this one, so it
        // cannot see a collision here. Asking costs one request and saves
        // someone else's photograph.
        return self.freeName(result.path).then(function (path) {
          return {
            asset: { path: path, content: result.content, encoding: "base64" },
            note: "re-encoded " + Math.round(result.from / 1024) + " kB to " + Math.round(result.to / 1024) + " kB",
          };
        });
      })
      .then(function (out) {
        if (out.note) console.log("[nth] " + asset.path + ": " + out.note);
        return self.request({
          action: "persistMedia",
          params: {
            branch: self.branch,
            asset: out.asset,
            options: { commitMessage: options && options.commitMessage },
          },
        });
      })
      .then(toMediaObject);
  };

  // Walks -2, -3 … until the bridge answers 404. Ten is far past any real case
  // and stopping loudly beats overwriting on the eleventh.
  NthBackend.prototype.freeName = function (path) {
    var self = this;
    var ext = extensionOf(path);
    var stem = path.slice(0, path.length - ext.length);
    var attempt = function (n) {
      var candidate = n === 1 ? path : stem + "-" + n + ext;
      return self.request({ action: "getMediaFile", params: { branch: self.branch, path: candidate } })
        .then(function () {
          if (n >= 10) throw new Error("Too many files are already named like " + path + ".");
          return attempt(n + 1);
        })
        .catch(function (error) {
          if (error && error.status === 404) return candidate;
          throw error;
        });
    };
    return attempt(1);
  };

  NthBackend.prototype.deleteFiles = function (paths, commitMessage) {
    return this.counted(this.request({
      action: "deleteFiles",
      params: { branch: this.branch, paths: paths, options: { commitMessage: commitMessage } },
    }));
  };

  NthBackend.prototype.getDeployPreview = function () { return Promise.resolve(null); };

  // The editorial workflow is off, so nothing here should ever be called. Answering
  // empty is what keeps a stray call from becoming a blank screen.
  NthBackend.prototype.getNotes = function () { return Promise.resolve([]); };
  NthBackend.prototype.getPRMetadata = function () { return Promise.resolve(null); };

  function serializeAsset(asset) {
    return Promise.resolve(asset.toBase64()).then(function (content) {
      return { path: asset.path, content: content, encoding: "base64" };
    });
  }

  /* ── the login screen ───────────────────────────────────────────────────── */

  var STYLE_ID = "nth-login-style";
  var STYLE = [
    '#nth-login{min-height:100vh;display:grid;place-items:center;',
    'background:var(--nth-admin-paper,#f6f6f4);color:var(--nth-admin-ink,#1b1b1b);',
    'font-family:var(--nth-admin-font,system-ui,sans-serif)}',
    '#nth-login form{width:min(22rem,90vw);display:grid;gap:1rem;padding:2rem;',
    'background:var(--nth-admin-surface,#fff);border-radius:var(--nth-admin-radius,10px);',
    'box-shadow:0 1px 3px rgba(0,0,0,.12)}',
    '#nth-login h1{margin:0;font-size:1.25rem;font-weight:600}',
    '#nth-login label{display:grid;gap:.35rem;font-size:.875rem}',
    '#nth-login input{font:inherit;padding:.6rem .7rem;border:1px solid var(--nth-admin-line,#c9c9c4);',
    'border-radius:calc(var(--nth-admin-radius,10px) / 2);background:#fff;color:inherit}',
    '#nth-login input:focus-visible{outline:2px solid var(--nth-admin-accent,#0b6);outline-offset:2px}',
    '#nth-login button{font:inherit;font-weight:600;padding:.7rem 1rem;border:0;cursor:pointer;',
    'border-radius:calc(var(--nth-admin-radius,10px) / 2);',
    'background:var(--nth-admin-accent,#0b6);color:var(--nth-admin-on-accent,#fff)}',
    '#nth-login button[disabled]{cursor:progress;opacity:.7}',
    '#nth-login .nth-error{margin:0;font-size:.875rem;color:var(--nth-admin-danger,#b00020)}',
    '#nth-login .nth-logo{max-width:9rem;justify-self:start}',
  ].join("");

  function injectStyle() {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    var el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = STYLE;
    document.head.appendChild(el);
  }

  function loginScreen(proxyUrl, deps) {
    var h = window.h;
    injectStyle();
    return window.createClass({
      getInitialState: function () {
        return { email: "", password: "", busy: false, error: "" };
      },
      field: function (name) {
        var self = this;
        return function (event) {
          var patch = {};
          patch[name] = event.target.value;
          self.setState(patch);
        };
      },
      submit: function (event) {
        event.preventDefault();
        if (this.state.busy) return;
        var self = this;
        this.setState({ busy: true, error: "" });
        var transport = new Transport(proxyUrl, deps, this.locale());
        transport.post(proxyUrl + "/session", { email: this.state.email, password: this.state.password })
          .then(function (user) {
            // Decap owns the session from here; it is told who signed in, never how.
            self.props.onLogin({ email: (user && user.email) || self.state.email });
          })
          .catch(function (error) {
            self.setState({ busy: false, error: String(error.message || error) });
          });
      },
      locale: function () {
        var config = this.props.config;
        // Decap hands the config as an Immutable map here and as a plain object
        // in a test; `get` is the one both answer to when it is there.
        if (!config) return "en";
        if (typeof config.get === "function") return config.get("locale") || "en";
        return config.locale || "en";
      },
      value: function (key) {
        var config = this.props.config;
        if (!config) return null;
        return typeof config.get === "function" ? config.get(key) : config[key];
      },
      render: function () {
        var w = words(this.locale());
        var logo = this.value("logo_url");
        var title = (this.value("site_url") && this.value("name")) || w.title;
        return h("section", { id: "nth-login" },
          h("form", { onSubmit: this.submit, noValidate: true },
            logo ? h("img", { className: "nth-logo", src: logo, alt: "" }) : null,
            h("h1", null, title),
            h("label", null,
              w.email,
              h("input", {
                type: "email", name: "email", autoComplete: "username", required: true,
                autoFocus: true, value: this.state.email, onChange: this.field("email"),
              })),
            h("label", null,
              w.password,
              h("input", {
                type: "password", name: "password", autoComplete: "current-password",
                required: true, value: this.state.password, onChange: this.field("password"),
              })),
            this.state.error
              ? h("p", { className: "nth-error", role: "alert" }, this.state.error)
              : null,
            h("button", { type: "submit", disabled: this.state.busy, "aria-busy": this.state.busy },
              this.state.busy ? w.signingIn : w.signIn)));
      },
    });
  }

  return {
    NthBackend: NthBackend,
    loginScreen: loginScreen,
    words: words,
    showQuota: showQuota,
    showPending: showPending,
    showFinder: showFinder,
    quotaText: quotaText,
    tightest: tightest,
    EDITOR_STYLE: EDITOR_STYLE,
    injectEditorStyle: injectEditorStyle,
    fillTokens: fillTokens,
    fillEditable: fillEditable,
    changesBetween: changesBetween,
    labelsOf: labelsOf,
    flatten: flatten,
    bindWidgets: bindWidgets,
    targetFor: targetFor,
    counterText: counterText,
    countWords: countWords,
    fitDevice: fitDevice,
    fitDesktop: fitDesktop,
    fitPane: fitPane,
    phoneFrame: phoneFrame,
    desktopFrame: desktopFrame,
    expandTo: expandTo,
    registries: function () { return { NAMES: NAMES, LEAVES: LEAVES, BOXES: BOXES, IMAGES: IMAGES }; },
    markImages: markImages,
    pathOf: pathOf,
    previewNames: previewNames,
    filesOf: filesOf,
    whenText: whenText,
    registerPreviews: registerPreviews,
    Transport: Transport,
    readCookie: readCookie,
    imagePlan: imagePlan,
    fitWithin: fitWithin,
    chooseResult: chooseResult,
    optimizeImage: optimizeImage,
    decodeAsset: decodeAsset,
    explain: explain,
    STYLE: STYLE,
  };
});

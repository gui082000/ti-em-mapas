(function () {
  // Preços reais exibidos na própria página (Plano Essencial / Plano Completo / oferta de
  // downsell do Plano Completo) — usados só pro value/currency do InitiateCheckout, pra não
  // mandar valor nenhum ou um valor inventado pro Meta/GA4. O downsell do básico reusa o mesmo
  // link e preço do básico (sem desconto nesse plano).
  var CONTENT_NAMES = {
    "checkout-basico": "plano_essencial",
    "checkout-basico-downsell": "plano_essencial_downsell",
    "checkout-premium": "plano_completo",
    "checkout-premium-downsell": "plano_completo_downsell",
  };
  var VALUES = {
    "checkout-basico": 14.9,
    "checkout-basico-downsell": 14.9,
    "checkout-premium": 37.0,
    "checkout-premium-downsell": 27.9,
  };

  // Protege contra duplo clique (comum quando a navegação não é instantânea e
  // a pessoa clica de novo) disparando o mesmo evento 2x com event_id
  // diferente — o Meta não deduplica isso. Debounce por id do botão: o mesmo
  // botão não dispara de novo dentro da janela, mas um botão diferente
  // dispara normalmente mesmo que seja quase ao mesmo tempo.
  var recentFires = new Map();
  var DEBOUNCE_MS = 1500;

  function applyPixel(id) {
    if (!id || typeof window.fbq !== "function") return;
    window.fbq("init", id);
    window.fbq("track", "PageView");
    // trackEvent só existe depois que o bloco do <head> (tracker.js + boilerplate) roda —
    // dispara aqui, não no <head>, porque é só agora que fbq('init', ...) já aconteceu (ver
    // comentário em index.html).
    if (window.trackEvent) {
      window.trackEvent("PageView", undefined, {}, { skipGa4: true });
    }
  }

  // Acrescenta utm_term=<trck_user_id> (pro webhook da Lowify casar a compra com o visitante,
  // mesmo padrão de lib/useTrackedCheckoutHref.ts na lp-analise) preservando os UTMs reais da
  // própria página.
  function trackedHref(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
      var url = new URL(rawUrl, window.location.href);
      var pageParams = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (key) {
        var value = pageParams.get(key);
        if (value) url.searchParams.set(key, value);
      });
      if (window.trckUserId) url.searchParams.set("utm_term", window.trckUserId);
      return url.toString();
    } catch (err) {
      return rawUrl;
    }
  }

  // Alguns desses botões (checkout-premium, checkout-premium-downsell, checkout-basico-downsell)
  // já vêm com um onClick de fábrica no bundle React (`window.fbq && window.fbq("track",
  // "InitiateCheckout")`) sem eventID e sem disparo server-side — contaria em dobro no Meta ao
  // lado do trackEvent abaixo. Um listener em capture-phase direto no elemento roda ANTES do
  // onClick delegado do React (que escuta em bubble-phase na raiz) e o stopPropagation() barra
  // esse handler de fábrica de rodar, deixando só o nosso disparo (deduplicado, com eventID).
  function bindCheckoutClick(el, id, rawUrl) {
    if (el.dataset.trackingBound === "1") return;
    el.dataset.trackingBound = "1";

    el.addEventListener(
      "click",
      function (event) {
        event.preventDefault();
        event.stopPropagation();

        var contentName = CONTENT_NAMES[id] || id;
        var value = VALUES[id];

        var now = Date.now();
        var lastFired = recentFires.get(id);
        var isDebounced = lastFired && now - lastFired < DEBOUNCE_MS;
        if (!isDebounced) {
          recentFires.set(id, now);

          if (window.trackEvent) {
            window.trackEvent(
              "InitiateCheckout",
              contentName,
              { value: value, currency: "BRL", content_name: contentName },
              {
                gtagEvent: "begin_checkout",
                gtagData: { value: value, currency: "BRL", items: [{ item_name: contentName }] },
                keepalive: true,
              },
            );
          }
        }

        window.setTimeout(function () {
          window.location.href = trackedHref(rawUrl);
        }, 150);
      },
      true,
    );
  }

  function applyLinks(cfg) {
    var map = {
      "checkout-basico": cfg.basico,
      "checkout-basico-downsell": cfg.basico,
      "checkout-premium": cfg.premium,
      "checkout-premium-downsell": cfg.premiumDownsell,
    };
    Object.keys(map).forEach(function (id) {
      var url = map[id];
      if (!url) return;
      var el = document.getElementById(id);
      if (!el) return;
      if (el.getAttribute("href") !== url) {
        el.setAttribute("href", url);
      }
      bindCheckoutClick(el, id, url);
    });
  }

  fetch("/api/config")
    .then(function (r) {
      return r.json();
    })
    .then(function (cfg) {
      applyPixel(cfg.pixelId);
      applyLinks(cfg);
      new MutationObserver(function () {
        applyLinks(cfg);
      }).observe(document.body, { childList: true, subtree: true });
    })
    .catch(function (err) {
      console.error("Failed to load runtime config", err);
    });
})();

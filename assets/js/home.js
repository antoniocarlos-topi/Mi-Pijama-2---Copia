// assets/js/home.js
(function () {
  function formatBRL(value) {
    return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
  }

  async function ensureDataReady() {
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      await window.dataLayer.initData();
    }
  }

  function getActiveProducts() {
    return window.dataLayer.getProducts().filter((p) => p.ativo);
  }

  /* ===============================
     DESTAQUES (SELECIONADOS)
  ============================== */
  function renderHighlights() {
    const container = document.getElementById("home-highlights");
    if (!container) return;

    const products = getActiveProducts();
    container.innerHTML = "";

    if (!products.length) {
      container.innerHTML = "<p>Nenhum pijama disponível no momento.</p>";
      return;
    }

    // ✅ pega selecionados (featured). Se não tiver, fallback pros 3 primeiros.
    const featured = products.filter((p) => p.featured).slice(0, 6);
    const list = featured.length ? featured : products.slice(0, 3);

    list.forEach((product) => {
      const isPromo = !!(product.promocao && product.preco_promocional);

      const article = document.createElement("article");
      article.className = "highlight";

      if (isPromo) {
        const badge = document.createElement("span");
        badge.className = "badge-promo badge-promo--corner";
        badge.textContent = "PROMO";
        article.appendChild(badge);
      }

      const img = document.createElement("img");
      img.setAttribute("data-skeleton", "true");
      img.loading = "lazy";
      img.decoding = "async";

      const basePath = "assets/images/";
      img.src =
        window.dataLayer.resolveImageSrc
          ? window.dataLayer.resolveImageSrc(product.imagem, basePath)
          : basePath + (product.imagem || "");

      img.alt = product.nome;

      const title = document.createElement("h3");
      title.textContent = product.nome;

      const priceWrap = document.createElement("div");
      priceWrap.className = "price-wrap";

      const now = document.createElement("span");
      now.className = "price-now";
      now.textContent = formatBRL(isPromo ? product.preco_promocional : product.preco);
      priceWrap.appendChild(now);

      if (isPromo) {
        const old = document.createElement("span");
        old.className = "price-old";
        old.textContent = formatBRL(product.preco);
        priceWrap.appendChild(old);
      }

      const actions = document.createElement("div");
      actions.className = "actions";

      const btnView = document.createElement("a");
      btnView.className = "btn";
      btnView.href = `pages/produto.html?id=${product.id}`;
      btnView.textContent = "Ver";

      const btnBuy = document.createElement("a");
      btnBuy.className = "btn primary";
      btnBuy.href = `pages/produto.html?id=${product.id}`;
      btnBuy.textContent = "Comprar";

      actions.appendChild(btnView);
      actions.appendChild(btnBuy);

      article.appendChild(img);
      article.appendChild(title);
      article.appendChild(priceWrap);
      article.appendChild(actions);

      container.appendChild(article);
    });
  }

  /* ===============================
     BUSCA NA HOME
  ============================== */
  function initHomeSearch() {
    const input = document.getElementById("home-search");
    const resultsBox = document.getElementById("home-search-results");
    if (!input || !resultsBox) return;

    function hide() {
      resultsBox.style.display = "none";
      resultsBox.innerHTML = "";
    }

    input.addEventListener("input", () => {
      const term = input.value.toLowerCase().trim();
      if (!term) return hide();

      const products = getActiveProducts().filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          (p.descricao || "").toLowerCase().includes(term)
      );

      if (!products.length) {
        resultsBox.innerHTML = `<div style="padding:12px;">Nenhum resultado.</div>`;
        resultsBox.style.display = "block";
        return;
      }

      resultsBox.innerHTML = products.slice(0, 6).map((p) => `
        <a href="pages/produto.html?id=${p.id}">
          ${p.nome}
        </a>
      `).join("");

      resultsBox.style.display = "block";
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box")) hide();
    });
  }

  /* ===============================
     BANNER PROMO (se existir)
  ============================== */
  function initPromoBanner() {
    const banner = document.getElementById("promo-banner");
    if (!banner) return;

    const products = window.dataLayer.getProducts().filter(
      (p) => p.ativo && p.promocao && p.preco_promocional
    );

    if (!products.length) {
      banner.style.display = "none";
      return;
    }

    const img = document.getElementById("promo-banner-img");
    const title = document.getElementById("promo-banner-title");
    const price = document.getElementById("promo-banner-price");
    const link = document.getElementById("promo-banner-link");
    const dotsWrap = document.getElementById("promo-dots");

    let index = 0;
    let timer = null;
    let pauseUntil = 0;

    function baseImgSrc(p) {
      const basePath = "assets/images/";
      return window.dataLayer.resolveImageSrc
        ? window.dataLayer.resolveImageSrc(p.imagem, basePath)
        : basePath + (p.imagem || "");
    }

    function setDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = products.map((_, i) =>
        `<span class="promo-dot ${i === index ? "is-active" : ""}" data-dot="${i}" aria-label="Ir para item ${i + 1}"></span>`
      ).join("");

      dotsWrap.querySelectorAll("[data-dot]").forEach((d) => {
        d.addEventListener("click", () => {
          const i = Number(d.getAttribute("data-dot") || 0);
          goTo(i, true);
        });
      });
    }

    function render(p) {
      banner.classList.add("is-changing");

      img.setAttribute("data-skeleton", "true");
      img.src = baseImgSrc(p);
      img.alt = p.nome || "Promoção";

      title.textContent = p.nome || "Promoção";
      price.innerHTML =
        `${formatBRL(p.preco_promocional)} ` +
        `<span class="price-old" style="margin-left:8px;">${formatBRL(p.preco)}</span>`;

      link.href = `pages/produto.html?id=${p.id}`;

      setDots();
      window.setTimeout(() => banner.classList.remove("is-changing"), 180);
    }

    function goTo(i, userAction = false) {
      if (userAction) pauseUntil = Date.now() + 12000;
      index = (i + products.length) % products.length;
      render(products[index]);
    }

    function next() {
      if (Date.now() < pauseUntil) return;
      goTo(index + 1);
    }

    function start() {
      stop();
      timer = window.setInterval(next, 5000);
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    let startX = 0;
    let startY = 0;
    let dragging = false;

    banner.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      dragging = true;
    }, { passive: true });

    banner.addEventListener("touchend", (e) => {
      if (!dragging) return;
      dragging = false;

      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        pauseUntil = Date.now() + 12000;
        if (dx < 0) goTo(index + 1, true);
        else goTo(index - 1, true);
      }
    });

    render(products[index]);
    start();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else start();
    });
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await ensureDataReady();
    renderHighlights();
    initHomeSearch();
    initPromoBanner();
  });
})();

// assets/js/home.js
(function () {
  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }
  function qsa(sel, ctx = document) {
    return Array.from(ctx.querySelectorAll(sel));
  }

  function formatBRL(value) {
    return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
  }

  function getActiveProducts() {
    if (!window.dataLayer || typeof window.dataLayer.getProducts !== "function") return [];
    return (window.dataLayer.getProducts() || []).filter((p) => p.ativo);
  }

  // ✅ Mantive igual ao seu. Se o dataLayer resolve Supabase, ele continua resolvendo.
  function resolveImgSrc(productImage) {
    const basePath = "assets/images/";
    if (window.dataLayer && typeof window.dataLayer.resolveImageSrc === "function") {
      return window.dataLayer.resolveImageSrc(productImage || "", basePath);
    }
    const raw = String(productImage || "").trim();
    if (!raw) return "";
    if (raw.startsWith("http")) return raw;
    return basePath + raw;
  }

  function attachSkeleton(img) {
    img.setAttribute("data-skeleton", "true");
    img.loading = "lazy";
    img.decoding = "async";

    const done = () => {
      img.classList.add("is-loaded");
      img.removeAttribute("data-skeleton");
    };

    if (img.complete && img.naturalWidth > 0) done();
    else {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }
  }

  function getPriceText(p) {
    const hasPromo = !!(p.promocao && p.preco_promocional);
    return hasPromo ? formatBRL(p.preco_promocional) : formatBRL(p.preco);
  }

  function createCard(product) {
    const article = document.createElement("article");
    article.className = "highlight";
    article.setAttribute("data-id", product.id);

    const imgLink = document.createElement("a");
    imgLink.href = "pages/produto.html?id=" + product.id;
    imgLink.setAttribute("aria-label", "Ver pijama: " + (product.nome || "Pijama"));

    const img = document.createElement("img");
    img.alt = product.nome || "Pijama";
    img.src = resolveImgSrc(product.imagem);
    attachSkeleton(img);
    imgLink.appendChild(img);

    const title = document.createElement("h3");
    title.textContent = product.nome || "Pijama";

    const price = document.createElement("p");
    price.textContent = getPriceText(product);

    const actions = document.createElement("div");
    actions.className = "actions";

    const btnView = document.createElement("a");
    btnView.className = "btn";
    btnView.href = "pages/produto.html?id=" + product.id;
    btnView.textContent = "Ver";

    const btnBuy = document.createElement("a");
    btnBuy.className = "btn primary";
    btnBuy.href = "pages/produto.html?id=" + product.id + "#variant-size";
    btnBuy.textContent = "Comprar";

    actions.appendChild(btnView);
    actions.appendChild(btnBuy);

    article.appendChild(imgLink);
    article.appendChild(title);
    article.appendChild(price);
    article.appendChild(actions);

    return article;
  }

  function renderHighlights() {
    const container = qs("#home-highlights");
    if (!container) return;

    const products = getActiveProducts();
    container.innerHTML = "";

    if (!products.length) {
      container.innerHTML = "<p>Nenhum pijama disponível no momento.</p>";
      return;
    }

    let featured = products.filter((p) => !!p.featured);
    if (!featured.length) featured = products.slice(0, 6);

    featured.slice(0, 6).forEach((p) => container.appendChild(createCard(p)));
  }

  // =========================
  // ✅ BUSCA HOME (RESULTADOS SEMPRE POR CIMA DO CARROSSEL)
  // - Move a caixa de resultados para o <body> (portal)
  // - position: fixed + z-index altíssimo
  // =========================
  function initHomeSearch() {
    const input = qs("#home-search");
    const box = input ? input.closest(".search-box") : null;
    let resultsBox = qs("#home-search-results");
    if (!input || !resultsBox || !box) return;

    // ✅ Portal: joga os resultados no <body>
    if (resultsBox.parentElement !== document.body) {
      document.body.appendChild(resultsBox);
    }

    // overlay do fundo
    let overlay = qs("#search-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "search-overlay";
      document.body.appendChild(overlay);
    }

    // styles seguros
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.22);
      backdrop-filter: blur(1px);
      z-index: 2147483646;
      display: none;
    `;

    resultsBox.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      display: none;
      max-height: 360px;
      overflow: auto;
    `;

    // garante stacking do input
    box.style.position = "relative";
    box.style.zIndex = "10";

    function placeResults() {
      const r = input.getBoundingClientRect();
      const top = Math.round(r.bottom + 8);
      const left = Math.round(r.left);
      const width = Math.round(r.width);

      resultsBox.style.top = top + "px";
      resultsBox.style.left = left + "px";
      resultsBox.style.width = width + "px";
    }

    function open() {
      placeResults();
      overlay.style.display = "block";
      resultsBox.style.display = "block";
      box.classList.add("is-open");
      input.setAttribute("aria-expanded", "true");
    }

    function hide() {
      resultsBox.style.display = "none";
      resultsBox.innerHTML = "";
      overlay.style.display = "none";
      box.classList.remove("is-open");
      input.setAttribute("aria-expanded", "false");
    }

    function show(items) {
      resultsBox.innerHTML = items
        .slice(0, 8)
        .map((p) => {
          const img = resolveImgSrc(p.imagem);
          const safeName = String(p.nome || "Pijama").replace(/"/g, "");
          return `
            <a href="pages/produto.html?id=${p.id}" class="search-item">
              <img class="search-item__img" src="${img}" alt="${safeName}">
              <div class="search-item__meta">
                <div class="search-item__name">${p.nome || "Pijama"}</div>
                <div class="search-item__price">${getPriceText(p)}</div>
              </div>
            </a>
          `;
        })
        .join("");
      open();
    }

    input.addEventListener("input", () => {
      const term = (input.value || "").toLowerCase().trim();
      if (!term) return hide();

      const products = getActiveProducts();
      const matches = products.filter((p) => {
        const nome = String(p.nome || "").toLowerCase();
        const desc = String(p.descricao || "").toLowerCase();
        return nome.includes(term) || desc.includes(term);
      });

      if (!matches.length) {
        resultsBox.innerHTML = `<div class="search-empty" style="padding:12px;">Nenhum resultado.</div>`;
        open();
        return;
      }

      show(matches);
    });

    input.addEventListener("focus", () => {
      if (resultsBox.innerHTML.trim()) open();
    });

    overlay.addEventListener("click", hide);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hide();
    });

    // rolagem/resize: reposiciona o dropdown
    window.addEventListener(
      "scroll",
      () => {
        if (resultsBox.style.display === "block") placeResults();
      },
      { passive: true }
    );

    window.addEventListener("resize", () => {
      if (resultsBox.style.display === "block") placeResults();
    });
  }

  // =========================
  // ✅ CARROSSEL HOME (3 aleatórios)
  // =========================
  function initHomeCarousel() {
    const carousel = qs("#home-carousel");
    const track = qs("#home-carousel-track");
    const dotsWrap = qs("#home-carousel-dots");
    const btnPrev = qs("#carousel-prev");
    const btnNext = qs("#carousel-next");

    if (!carousel || !track || !dotsWrap || !btnPrev || !btnNext) return;

    const products = getActiveProducts();
    if (!products.length) {
      carousel.style.display = "none";
      dotsWrap.style.display = "none";
      return;
    }

    // escolhe até 3 aleatórios (sem repetir)
    const shuffled = products.slice().sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);

    track.innerHTML = "";
    dotsWrap.innerHTML = "";

    let index = 0;
    let timer = null;

    function updateDots() {
      const dots = qsa(".carousel-dot", dotsWrap);
      dots.forEach((d, i) => d.classList.toggle("is-active", i === index));
    }

    function goTo(i) {
      const slides = qsa(".carousel-slide", track);
      if (!slides.length) return;

      index = (i + slides.length) % slides.length;

      const slide = slides[index];
      track.scrollTo({
        left: slide.offsetLeft - track.offsetLeft,
        behavior: "smooth",
      });

      updateDots();
    }

    function next() {
      goTo(index + 1);
    }
    function prev() {
      goTo(index - 1);
    }

    picks.forEach((p, idx) => {
      const slide = document.createElement("div");
      slide.className = "carousel-slide";
      slide.setAttribute("data-index", String(idx));

      const img = document.createElement("img");
      img.src = resolveImgSrc(p.imagem);
      img.alt = p.nome || "Pijama";
      img.loading = "lazy";
      img.decoding = "async";
      attachSkeleton(img);

      // botão comprar (inferior esquerdo)
      const buyWrap = document.createElement("div");
      buyWrap.className = "carousel-buy";

      const buy = document.createElement("a");
      buy.className = "btn primary";
      buy.href = "pages/produto.html?id=" + p.id + "#variant-size";
      buy.textContent = "Comprar";

      buyWrap.appendChild(buy);
slide.appendChild(img);
slide.appendChild(buyWrap);
track.appendChild(slide);



      // dots
      const dot = document.createElement("button");
      dot.className = "carousel-dot" + (idx === 0 ? " is-active" : "");
      dot.type = "button";
      dot.setAttribute("aria-label", "Ir para item " + (idx + 1));
      dot.addEventListener("click", () => goTo(idx));
      dotsWrap.appendChild(dot);
    });

    btnNext.addEventListener("click", next);
    btnPrev.addEventListener("click", prev);

    function startAuto() {
      stopAuto();
      timer = window.setInterval(next, 4500);
    }
    function stopAuto() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    track.addEventListener("pointerdown", stopAuto, { passive: true });
    track.addEventListener("pointerup", startAuto, { passive: true });
    track.addEventListener("mouseenter", stopAuto);
    track.addEventListener("mouseleave", startAuto);

    // se rolar manual, recalcula index aproximado
    track.addEventListener(
      "scroll",
      () => {
        const slides = qsa(".carousel-slide", track);
        if (!slides.length) return;
        const scrollLeft = track.scrollLeft;

        let closest = 0;
        let dist = Infinity;

        slides.forEach((s, i) => {
          const d = Math.abs((s.offsetLeft - track.offsetLeft) - scrollLeft);
          if (d < dist) {
            dist = d;
            closest = i;
          }
        });

        index = closest;
        updateDots();
      },
      { passive: true }
    );

    startAuto();
  }

  async function ensureDataReady() {
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      await window.dataLayer.initData();
    }
  }

  // =========================
  // ✅ BOOT
  // =========================
  document.addEventListener("DOMContentLoaded", async function () {
    await ensureDataReady();

    renderHighlights();
    initHomeSearch();
    initHomeCarousel();

    if (typeof window.initPromoBanner === "function") {
      window.initPromoBanner();
    }
  });
})();

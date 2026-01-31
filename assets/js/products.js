// assets/js/products.js
(function () {
  function formatBRL(value) {
    return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
  }

  function attachImageLoader(img) {
    img.setAttribute("data-skeleton", "true");

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

  function attachTapFeedback(el) {
    el.addEventListener(
      "pointerdown",
      () => {
        el.classList.add("is-tap");
        window.setTimeout(() => el.classList.remove("is-tap"), 160);
      },
      { passive: true }
    );
  }

  async function boot() {
    const grid = document.getElementById("product-list");
    if (!grid) return;

    // ✅ espera Supabase
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      try {
        await window.dataLayer.initData();
      } catch (e) {
        console.warn("Falha ao carregar produtos do Supabase:", e);
      }
    }

    const products =
      window.dataLayer && typeof window.dataLayer.getProducts === "function"
        ? window.dataLayer.getProducts().filter((p) => p.ativo)
        : [];

    grid.innerHTML = "";

    if (!products.length) {
      grid.innerHTML =
        "<p>Nenhum pijama disponível no momento. Adicione produtos no Supabase para aparecerem aqui.</p>";
      return;
    }

    products.forEach((product) => {
      const isPromo = !!(product.promocao && product.preco_promocional);

      const card = document.createElement("article");
      card.className = "product product-card";

      // badge promo
      if (isPromo) {
        const badge = document.createElement("span");
        badge.className = "badge-promo badge-promo--corner";
        badge.textContent = "PROMO";
        card.appendChild(badge);
      }

      const link = document.createElement("a");
      link.className = "product-media";
      link.href = "produto.html?id=" + product.id;
      link.setAttribute("aria-label", "Ver pijama: " + product.nome);

      const img = document.createElement("img");
      const basePath = "../assets/images/";
      img.src =
        window.dataLayer && typeof window.dataLayer.resolveImageSrc === "function"
          ? window.dataLayer.resolveImageSrc(product.imagem, basePath)
          : basePath + (product.imagem || "");
      img.alt = product.nome;
      img.loading = "lazy";
      img.decoding = "async";
      attachImageLoader(img);
      link.appendChild(img);

      const body = document.createElement("div");
      body.className = "product-body";

      const title = document.createElement("h3");
      title.textContent = product.nome;

      // preço premium (promo + riscado)
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

      const ctaRow = document.createElement("div");
      ctaRow.className = "product-cta";

      const btn = document.createElement("a");
      btn.className = "btn primary product-btn";
      btn.href = "produto.html?id=" + product.id;
      btn.textContent = "Ver pijama";
      attachTapFeedback(btn);

      ctaRow.appendChild(btn);

      body.appendChild(title);
      body.appendChild(priceWrap);
      body.appendChild(ctaRow);

      card.appendChild(link);
      card.appendChild(body);

      grid.appendChild(card);
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

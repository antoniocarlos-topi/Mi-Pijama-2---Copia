// assets/js/produto.js
(function () {
  const WHATSAPP = "558699700402";
  const CART_KEY = "miPijamas_cart";

  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }

  function formatBRL(value) {
    return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
  }

  function getParam(name) {
    return new URL(window.location.href).searchParams.get(name);
  }

  async function ensureDataReady() {
    if (window.dataLayer?.initData) await window.dataLayer.initData();
  }

  function getProducts() {
    return window.dataLayer?.getProducts ? window.dataLayer.getProducts() : [];
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // força atualização do badge em outras partes do site
    window.dispatchEvent(new Event("storage"));
  }

  function addToCart(product, size) {
    const cart = getCart();

    const existing = cart.find(
      (i) => String(i.id) === String(product.id) && String(i.size || "") === String(size || "")
    );

    if (existing) {
      existing.quantidade = (Number(existing.quantidade) || 1) + 1;
    } else {
      cart.push({
        id: product.id,
        nome: product.nome,
        preco: product.preco,
        imagem: product.imagem,
        quantidade: 1,
        size: size || "",
      });
    }

    setCart(cart);
  }

  function buildWhatsAppLink(product, size) {
    const url = window.location.href;
    const precoTxt = formatBRL(product.preco);

    // ✅ mensagem mais “conversão”
    const msg =
      `Oi! Quero esse pijama 😍\n\n` +
      `• Produto: ${product.nome}\n` +
      `• Tamanho: ${size || "Ainda vou escolher"}\n` +
      `• Valor: ${precoTxt}\n\n` +
      `Link: ${url}\n\n` +
      `Pode me ajudar a finalizar o pedido?`;

    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  function applySEO(product, imageUrl) {
    const nome = (product.nome || "Produto").trim();
    const desc = (product.descricao || "").trim();

    document.title = `${nome} | MI Pijamas`;

    // meta description
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        desc
          ? `${nome} — ${desc.slice(0, 140)}`
          : `${nome} — pijama feminino com conforto premium. Compre pelo WhatsApp.`
      );
    }

    // og:title / og:description / og:image
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", `${nome} | MI Pijamas`);

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute(
        "content",
        desc ? desc.slice(0, 160) : "Pijamas femininos com conforto premium. Compre pelo WhatsApp."
      );
    }

    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && imageUrl) ogImg.setAttribute("content", imageUrl);

    // JSON-LD Product
    const jsonLd = document.getElementById("product-jsonld");
    if (jsonLd) {
      const data = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: nome,
        description: desc || undefined,
        image: imageUrl ? [imageUrl] : undefined,
        brand: { "@type": "Brand", name: "MI Pijamas" },
        offers: {
          "@type": "Offer",
          priceCurrency: "BRL",
          price: Number(product.preco || 0),
          availability: "https://schema.org/InStock",
          url: window.location.href,
        },
      };
      jsonLd.textContent = JSON.stringify(data);
    }
  }

  function setBtnDisabled(btn, disabled) {
    if (!btn) return;
    if (btn.tagName === "A") {
      btn.classList.toggle("is-disabled", !!disabled);
      btn.setAttribute("aria-disabled", disabled ? "true" : "false");
      if (disabled) btn.removeAttribute("href");
    } else {
      btn.disabled = !!disabled;
      btn.classList.toggle("is-disabled", !!disabled);
    }
  }

  function render(product) {
    // IDs do seu HTML
    const img = qs("#product-image");
    const name = qs("#product-name");
    const price = qs("#product-price");
    const desc = qs("#product-desc"); // ✅ correto no seu HTML
    const btnCart = qs("#add-to-cart");
    const btnZap = qs("#buy-whatsapp");
    const sizeSel = qs("#variant-size"); // ✅ correto no seu HTML

    // Sticky (você tem mais de um no HTML, então pegamos o primeiro que aparecer)
    const stickyPrice = qs("#sticky-price");
    const stickyHint = qs("#sticky-hint");

    const stickyAdd = qs("#sticky-add"); // aparece duplicado no seu HTML, mas o querySelector pega o primeiro
    const stickyWhats = qs("#sticky-whats") || qs("#sticky-zap"); // compatível com seus dois nomes

    if (!img || !name || !price || !btnCart || !btnZap || !sizeSel) return;

    name.textContent = product.nome || "Pijama";
    price.textContent = formatBRL(product.preco);
    if (stickyPrice) stickyPrice.textContent = formatBRL(product.preco);

    if (desc) {
      desc.textContent =
        product.descricao || "Pijama confortável, pensado para noites leves e cheias de aconchego.";
    }

    // imagem (local ou URL)
    const base = "../assets/images/";
    const raw = String(product.imagem || "").trim();
    const imageUrl = raw.startsWith("http") ? raw : base + raw;

    img.src = imageUrl;
    img.alt = product.nome || "Produto";

    // SEO + compartilhamento
    applySEO(product, imageUrl);

    function syncState() {
      const size = (sizeSel.value || "").trim();
      const hasSize = !!size;

      const link = buildWhatsAppLink(product, size);

      // WhatsApp principal
      btnZap.href = link;
      btnZap.setAttribute("target", "_blank");
      btnZap.setAttribute("rel", "noopener noreferrer");

      // Sticky WhatsApp
      if (stickyWhats) {
        stickyWhats.setAttribute("target", "_blank");
        stickyWhats.setAttribute("rel", "noopener noreferrer");
        if (hasSize) stickyWhats.href = link;
      }

      // Hints + disable
      if (stickyHint) stickyHint.textContent = hasSize ? "Pronto para comprar" : "Selecione o tamanho";

      // Só libera sticky se tiver tamanho
      if (stickyAdd) setBtnDisabled(stickyAdd, !hasSize);
      if (stickyWhats) setBtnDisabled(stickyWhats, !hasSize);
    }

    // estado inicial
    syncState();
    sizeSel.addEventListener("change", syncState);

    function onAdd() {
      const size = (sizeSel.value || "").trim();
      if (!size) {
        alert("Selecione um tamanho antes de adicionar ao carrinho.");
        sizeSel.scrollIntoView({ behavior: "smooth", block: "center" });
        sizeSel.focus();
        return;
      }

      addToCart(product, size);

      // feedback
      btnCart.textContent = "Adicionado ✓";
      btnCart.disabled = true;

      if (stickyAdd && stickyAdd.tagName !== "A") {
        stickyAdd.textContent = "Adicionado ✓";
        stickyAdd.disabled = true;
      }

      setTimeout(() => {
        btnCart.textContent = "🛍️ Adicionar ao carrinho";
        btnCart.disabled = false;

        if (stickyAdd && stickyAdd.tagName !== "A") {
          stickyAdd.textContent = "🛍️ Adicionar";
          stickyAdd.disabled = false;
        }
      }, 900);
    }

    btnCart.addEventListener("click", onAdd);
    if (stickyAdd && stickyAdd.tagName !== "A") stickyAdd.addEventListener("click", onAdd);
  }

  function renderNotFound() {
    const wrap = qs(".product-detail");
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="mini-card" style="padding:18px;">
        <h3>Produto não encontrado</h3>
        <p>Esse pijama não está disponível no momento.</p>
        <a class="btn primary" href="produtos.html">Ver Pijamas</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await ensureDataReady();

    const id = getParam("id");
    const products = getProducts().filter((p) => p.ativo);
    const product = products.find((p) => String(p.id) === String(id));

    if (!product) return renderNotFound();
    render(product);
  });
})();

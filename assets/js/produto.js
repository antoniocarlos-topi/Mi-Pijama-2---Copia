// assets/js/produto.js
(function () {
  const WHATSAPP = "558699700402";
  const CART_KEY = "miPijamas_cart";

  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }

  function formatBRL(value) {
    const n = Number(value) || 0;
    return "R$ " + n.toFixed(2).replace(".", ",");
  }

  function getParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }

  function getProducts() {
    if (window.dataLayer && typeof window.dataLayer.getProducts === "function") {
      return window.dataLayer.getProducts();
    }
    return [];
  }

  function resolveImage(imageValue) {
    const basePath = "../assets/images/";
    if (window.dataLayer && typeof window.dataLayer.resolveImageSrc === "function") {
      return window.dataLayer.resolveImageSrc(imageValue, basePath);
    }
    return basePath + (imageValue || "");
  }

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function addToCart(product, size, color) {
    const cart = getCart();

    const existing = cart.find(
      (i) => String(i.id) === String(product.id) && i.size === size && i.color === color
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
        size,
        color,
      });
    }

    setCart(cart);

    // atualiza badge
    window.dispatchEvent(new Event("storage"));
  }

  function buildWhatsAppLink(product, size, color) {
    const msg =
      `Olá! Quero comprar este pijama:\n\n` +
      `• Produto: ${product.nome}\n` +
      (size ? `• Tamanho: ${size}\n` : "") +
      (color ? `• Cor: ${color}\n` : "") +
      `• Valor: ${formatBRL(product.preco)}\n\n` +
      `Pode me ajudar a finalizar? 😊`;

    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
  }

  function render(product) {
    // ✅ IDs compatíveis com seu HTML atual + fallback pros antigos
    const img = qs("#product-image");
    const name = qs("#product-name");
    const price = qs("#product-price");

    const desc =
      qs("#product-description") || qs("#product-desc") || qs("#product-description");

    const btnCart = qs("#add-to-cart");
    const btnZap = qs("#buy-whatsapp");

    const sizeSel = qs("#product-size") || qs("#variant-size");
    const colorSel = qs("#product-color") || qs("#variant-color"); // opcional

    if (!img || !name || !price || !btnCart || !btnZap) return;

    name.textContent = product.nome;
    price.textContent = formatBRL(product.preco);

    if (desc) {
      desc.textContent =
        product.descricao ||
        "Um pijama pensado para conforto e elegância, com toque delicado e caimento perfeito.";
    }

    // imagem: URL (Storage) OU local
    img.setAttribute("data-skeleton", "true");
    img.src = resolveImage(product.imagem);
    img.alt = product.nome;

    function getSelectedSize() {
      return sizeSel ? String(sizeSel.value || "").trim() : "";
    }
    function getSelectedColor() {
      return colorSel ? String(colorSel.value || "").trim() : "";
    }

    const syncWhats = () => {
      const size = getSelectedSize();
      const color = getSelectedColor();
      btnZap.href = buildWhatsAppLink(product, size, color);
    };

    // ✅ garante que o <a> do WhatsApp sempre tenha href
    syncWhats();

    if (sizeSel) sizeSel.addEventListener("change", syncWhats);
    if (colorSel) colorSel.addEventListener("change", syncWhats);

    btnCart.addEventListener("click", () => {
      const size = getSelectedSize();
      const color = getSelectedColor();

      // ✅ se existir select de tamanho, exige selecionar
      if (sizeSel && !size) {
        alert("Selecione um tamanho para continuar 🙂");
        sizeSel.focus();
        return;
      }

      addToCart(product, size, color);

      btnCart.textContent = "Adicionado ✓";
      btnCart.disabled = true;

      setTimeout(() => {
        btnCart.textContent = "🛍️ Adicionar ao carrinho";
        btnCart.disabled = false;
      }, 900);
    });
  }

  function renderNotFound() {
    const wrap = qs(".product-page") || qs("main .container");
    if (!wrap) return;

    wrap.innerHTML = `
      <a class="back-link" href="produtos.html">← Voltar para Pijamas</a>
      <div class="mini-card" style="padding:18px;">
        <h3>Produto não encontrado</h3>
        <p>Esse pijama não está disponível no momento.</p>
        <a class="btn primary" href="produtos.html">Ver Pijamas</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async () => {
    // ✅ espera carregar produtos do Supabase antes de buscar pelo ID
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      try {
        await window.dataLayer.initData();
      } catch (e) {
        console.warn("Falha ao carregar dados:", e);
      }
    }

    const id = getParam("id");
    const products = getProducts().filter((p) => p.ativo);
    const product = products.find((p) => String(p.id) === String(id));

    if (!product) return renderNotFound();
    render(product);
  });
})();

// assets/js/cart.js
(function () {
  const CART_KEY = "miPijamas_cart";

  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }

  function formatBRL(value) {
    return "R$ " + Number(value || 0).toFixed(2).replace(".", ",");
  }

  function safeJSON(str, fallback) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return fallback;
    }
  }

  function getCart() {
    return safeJSON(localStorage.getItem(CART_KEY) || "[]", []);
  }

  function setCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart || []));
    // dispara update do badge (app.js escuta storage também)
    window.dispatchEvent(new Event("storage"));
  }

  async function ensureDataReady() {
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      try {
        await window.dataLayer.initData();
      } catch (e) {
        console.warn("Falha ao carregar produtos (dataLayer.initData):", e);
      }
    }
  }

  function getProducts() {
    if (!window.dataLayer || typeof window.dataLayer.getProducts !== "function") return [];
    return window.dataLayer.getProducts() || [];
  }

  /**
   * Resolve imagem do produto com base consistente:
   * carrinho.html está dentro de /pages, então as imagens do projeto ficam em:
   * ../assets/images/...
   */
  function resolveImgSrc(productImage) {
    const basePath = "../assets/images/";

    // Se você implementou resolveImageSrc no seu data.js, ele manda
    // url absoluta do Supabase ou monta o caminho local certo.
    if (window.dataLayer && typeof window.dataLayer.resolveImageSrc === "function") {
      return window.dataLayer.resolveImageSrc(productImage || "", basePath);
    }

    const raw = String(productImage || "").trim();
    if (!raw) return "";

    // URL absoluta
    if (/^https?:\/\//i.test(raw)) return raw;

    // já veio com ../assets...
    if (raw.startsWith("../")) return raw;

    // padrão local
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

  function findProductById(products, id) {
    return products.find((p) => String(p.id) === String(id));
  }

  function getPrice(p) {
    const hasPromo = !!(p && p.promocao && p.preco_promocional);
    return hasPromo ? Number(p.preco_promocional || 0) : Number(p.preco || 0);
  }

  function calcTotals(cart, products) {
    let subtotal = 0;

    cart.forEach((item) => {
      const prod = findProductById(products, item.id);
      // Se não achou no catálogo, usa o que estiver no item (fallback)
      const unit = prod ? getPrice(prod) : Number(item.preco || 0);
      const qty = Number(item.quantidade || 1);
      subtotal += unit * qty;
    });

    return { subtotal, total: subtotal };
  }

  function renderEmpty(isEmpty) {
    const emptyBox = qs("#cart-empty");
    const summary = qs(".cart-summary");
    const items = qs("#cart-items");

    if (!emptyBox || !summary || !items) return;

    if (isEmpty) {
      emptyBox.style.display = "block";
      summary.style.display = "none";
      items.innerHTML = "";
    } else {
      emptyBox.style.display = "none";
      summary.style.display = "block";
    }
  }

  function createCartItemRow(item, prod) {
    // dados do produto (fallback para item salvo)
    const nome = (prod && prod.nome) || item.nome || "Pijama";
    const tamanho = item.tamanho || item.size || item.variante || "";
    const imagem = (prod && prod.imagem) || item.imagem || item.image || "";
    const unitPrice = prod ? getPrice(prod) : Number(item.preco || 0);
    const qty = Math.max(1, Number(item.quantidade || 1));
    const lineTotal = unitPrice * qty;

    const row = document.createElement("article");
    row.className = "cart-item mini-card";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "14px";
    row.style.marginBottom = "12px";
    row.style.padding = "14px";

    // esquerda: imagem + infos
    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "12px";
    left.style.minWidth = "0";

    const thumbWrap = document.createElement("div");
    thumbWrap.className = "cart-thumb";
    thumbWrap.style.width = "72px";
    thumbWrap.style.height = "72px";
    thumbWrap.style.borderRadius = "14px";
    thumbWrap.style.overflow = "hidden";
    thumbWrap.style.flex = "0 0 auto";
    thumbWrap.style.background = "rgba(0,0,0,.04)";

    const img = document.createElement("img");
    img.alt = nome;
    img.src = resolveImgSrc(imagem);
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    attachSkeleton(img);

    thumbWrap.appendChild(img);

    const info = document.createElement("div");
    info.style.minWidth = "0";

    const title = document.createElement("div");
    title.textContent = nome;
    title.style.fontWeight = "700";
    title.style.whiteSpace = "nowrap";
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";

    const meta = document.createElement("div");
    meta.style.marginTop = "4px";
    meta.style.opacity = ".85";
    meta.style.fontSize = ".92rem";
    meta.textContent = tamanho ? `Tam: ${tamanho}` : "";

    const price = document.createElement("div");
    price.style.marginTop = "6px";
    price.style.fontWeight = "800";
    price.textContent = (unitPrice ? formatBRL(unitPrice) : "R$ 0,00");

    info.appendChild(title);
    if (tamanho) info.appendChild(meta);
    info.appendChild(price);

    left.appendChild(thumbWrap);
    left.appendChild(info);

    // direita: qtd + total + remover
    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "10px";
    right.style.flex = "0 0 auto";

    const totalBox = document.createElement("div");
    totalBox.style.textAlign = "right";
    totalBox.style.minWidth = "92px";
    totalBox.style.fontWeight = "800";
    totalBox.textContent = formatBRL(lineTotal);

    const qtyBox = document.createElement("div");
    qtyBox.style.display = "flex";
    qtyBox.style.alignItems = "center";
    qtyBox.style.gap = "8px";

    const btnMinus = document.createElement("button");
    btnMinus.type = "button";
    btnMinus.className = "btn";
    btnMinus.textContent = "−";
    btnMinus.style.width = "42px";
    btnMinus.style.height = "42px";
    btnMinus.style.borderRadius = "999px";
    btnMinus.setAttribute("aria-label", "Diminuir quantidade");

    const qtyText = document.createElement("strong");
    qtyText.textContent = String(qty);
    qtyText.style.minWidth = "18px";
    qtyText.style.textAlign = "center";

    const btnPlus = document.createElement("button");
    btnPlus.type = "button";
    btnPlus.className = "btn";
    btnPlus.textContent = "+";
    btnPlus.style.width = "42px";
    btnPlus.style.height = "42px";
    btnPlus.style.borderRadius = "999px";
    btnPlus.setAttribute("aria-label", "Aumentar quantidade");

    qtyBox.appendChild(btnMinus);
    qtyBox.appendChild(qtyText);
    qtyBox.appendChild(btnPlus);

    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.className = "btn";
    btnRemove.textContent = "Remover";
    btnRemove.setAttribute("aria-label", "Remover item");

    right.appendChild(totalBox);
    right.appendChild(qtyBox);
    right.appendChild(btnRemove);

    // ações
    btnMinus.addEventListener("click", () => {
      const cart = getCart();
      const idx = cart.findIndex((x) => String(x.id) === String(item.id) && String(x.tamanho || x.size || "") === String(tamanho || ""));
      if (idx === -1) return;

      cart[idx].quantidade = Math.max(1, Number(cart[idx].quantidade || 1) - 1);
      setCart(cart);
      render();
    });

    btnPlus.addEventListener("click", () => {
      const cart = getCart();
      const idx = cart.findIndex((x) => String(x.id) === String(item.id) && String(x.tamanho || x.size || "") === String(tamanho || ""));
      if (idx === -1) return;

      cart[idx].quantidade = Math.max(1, Number(cart[idx].quantidade || 1) + 1);
      setCart(cart);
      render();
    });

    btnRemove.addEventListener("click", () => {
      const cart = getCart();
      const next = cart.filter((x) => !(String(x.id) === String(item.id) && String(x.tamanho || x.size || "") === String(tamanho || "")));
      setCart(next);
      render();
    });

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function renderTotals(cart, products) {
    const subEl = qs("#subtotal");
    const totalEl = qs("#total");
    if (!subEl || !totalEl) return;

    const { subtotal, total } = calcTotals(cart, products);
    subEl.textContent = formatBRL(subtotal);
    totalEl.textContent = formatBRL(total);
  }

  async function render() {
    const itemsBox = qs("#cart-items");
    if (!itemsBox) return;

    await ensureDataReady();
    const products = getProducts();

    const cart = getCart();

    if (!cart.length) {
      renderEmpty(true);
      renderTotals([], products);
      return;
    }

    renderEmpty(false);
    itemsBox.innerHTML = "";

    cart.forEach((item) => {
      const prod = findProductById(products, item.id);
      itemsBox.appendChild(createCartItemRow(item, prod));
    });

    renderTotals(cart, products);
  }

  document.addEventListener("DOMContentLoaded", render);
})();

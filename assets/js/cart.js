(function () {
  const CART_KEY = "miPijamas_cart";

  function qs(sel, ctx = document) {
    return ctx.querySelector(sel);
  }
  function qsa(sel, ctx = document) {
    return Array.from(ctx.querySelectorAll(sel));
  }
  function formatBRL(value) {
    const n = Number(value) || 0;
    return "R$ " + n.toFixed(2).replace(".", ",");
  }
  function safeParse(json, fallback) {
    try {
      return JSON.parse(json);
    } catch {
      return fallback;
    }
  }

  function ensureDataReady() {
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      window.dataLayer.initData();
    }
  }

  function getProductsMap() {
    const map = new Map();
    const list =
      window.dataLayer && typeof window.dataLayer.getProducts === "function"
        ? window.dataLayer.getProducts()
        : [];
    list.forEach((p) => map.set(String(p.id), p));
    return map;
  }

  function getCart() {
    const raw = localStorage.getItem(CART_KEY);
    const cart = safeParse(raw || "[]", []);
    if (Array.isArray(cart)) return cart;
    if (cart && typeof cart === "object") return Object.values(cart);
    return [];
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadges();
  }

  function normalizeItem(item, productsMap) {
    const pid = item.productId ?? item.id ?? item.produtoId ?? item.product_id;
    const product = productsMap.get(String(pid));

    return {
      id: pid ?? product?.id ?? "",
      nome: item.nome ?? product?.nome ?? "Produto",
      preco: Number(item.preco ?? product?.preco ?? 0) || 0,
      quantidade: Number(item.quantidade ?? item.qty ?? 1) || 1,
      tamanho: item.tamanho ?? item.size ?? "",
      cor: item.cor ?? item.color ?? "",
      imagem: item.imagem ?? product?.imagem ?? "",
    };
  }

  function cartCount(cart) {
    return cart.reduce((sum, it) => sum + (Number(it.quantidade) || 0), 0);
  }

  function updateCartBadges() {
    const cart = getCart();
    const count = cartCount(cart);

    qsa("[data-cart-badge]").forEach((b) => {
      b.textContent = String(count);
      if (count === 0) b.classList.add("is-empty");
      else b.classList.remove("is-empty");
    });
  }

  function calcTotals(items) {
    const subtotal = items.reduce((sum, it) => sum + it.preco * it.quantidade, 0);
    const total = subtotal;
    return { subtotal, total };
  }

  function renderCart(items) {
    const itemsEl = qs("#cart-items");
    const subtotalEl = qs("#subtotal");
    const totalEl = qs("#total");
    const checkoutLink = qs('.cart-summary a[href="checkout.html"]');

    if (!itemsEl) return;

    itemsEl.innerHTML = "";

    if (!items.length) {
      itemsEl.innerHTML = `
        <div class="cart-empty" style="text-align:center;padding:28px;border:1px dashed rgba(46,42,43,.18);border-radius:16px;background:rgba(255,255,255,.7)">
          <h3 style="margin:0 0 10px 0">Seu carrinho está vazio 🧺</h3>
          <p style="margin:0 0 16px 0">Volte para a página de pijamas e escolha o seu favorito 💗</p>
          <a class="btn primary" href="produtos.html">Ver Pijamas</a>
        </div>
      `;

      if (subtotalEl) subtotalEl.textContent = "R$ 0,00";
      if (totalEl) totalEl.textContent = "R$ 0,00";
      if (checkoutLink) {
        checkoutLink.classList.add("is-disabled");
        checkoutLink.setAttribute("aria-disabled", "true");
        checkoutLink.style.pointerEvents = "none";
        checkoutLink.style.opacity = "0.6";
      }
      return;
    }

    if (checkoutLink) {
      checkoutLink.classList.remove("is-disabled");
      checkoutLink.removeAttribute("aria-disabled");
      checkoutLink.style.pointerEvents = "";
      checkoutLink.style.opacity = "";
      checkoutLink.classList.add("primary"); // deixa CTA bonito
    }

    items.forEach((it) => {
      const card = document.createElement("div");
      card.className = "cart-item";
      card.dataset.id = String(it.id);

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "14px";

      const img = document.createElement("img");
      img.alt = it.nome;
      img.width = 78;
      img.height = 78;
      img.style.width = "78px";
      img.style.height = "78px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "14px";
      img.style.border = "1px solid rgba(46,42,43,.10)";
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");

      if (it.imagem) {
        img.src = "../assets/images/" + it.imagem;
        img.setAttribute("data-skeleton", "1"); // usa shimmer do seu CSS
      } else {
        img.src =
          "data:image/svg+xml;charset=utf-8," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="78" height="78"><rect width="100%" height="100%" fill="#E8E7E2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6F6A6C" font-size="10">SEM FOTO</text></svg>`
          );
      }

      const info = document.createElement("div");
      info.style.display = "grid";
      info.style.gap = "6px";

      const title = document.createElement("h3");
      title.textContent = it.nome;
      title.style.margin = "0";
      title.style.fontSize = "1.05rem";

      const meta = document.createElement("div");
      meta.style.display = "flex";
      meta.style.flexWrap = "wrap";
      meta.style.gap = "8px";
      meta.style.fontWeight = "700";
      meta.style.fontSize = "13px";
      meta.style.color = "rgba(46,42,43,.65)";

      const metaParts = [];
      if (it.tamanho) metaParts.push("Tam: " + it.tamanho);
      if (it.cor) metaParts.push("Cor: " + it.cor);
      meta.textContent = metaParts.length ? metaParts.join(" • ") : "";

      const price = document.createElement("div");
      price.textContent = formatBRL(it.preco);
      price.style.fontWeight = "900";
      price.style.color = "var(--brand)";
      price.style.marginTop = "2px";

      info.appendChild(title);
      if (meta.textContent) info.appendChild(meta);
      info.appendChild(price);

      left.appendChild(img);
      left.appendChild(info);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.flexDirection = "column";
      right.style.alignItems = "flex-end";
      right.style.gap = "10px";

      const qtyRow = document.createElement("div");
      qtyRow.style.display = "flex";
      qtyRow.style.alignItems = "center";
      qtyRow.style.gap = "8px";

      const btnDec = document.createElement("button");
      btnDec.type = "button";
      btnDec.className = "btn";
      btnDec.textContent = "−";
      btnDec.dataset.action = "dec";
      btnDec.style.width = "42px";
      btnDec.style.padding = "0";
      btnDec.style.justifyContent = "center";

      const qty = document.createElement("span");
      qty.textContent = String(it.quantidade);
      qty.style.minWidth = "26px";
      qty.style.textAlign = "center";
      qty.style.fontWeight = "900";

      const btnInc = document.createElement("button");
      btnInc.type = "button";
      btnInc.className = "btn";
      btnInc.textContent = "+";
      btnInc.dataset.action = "inc";
      btnInc.style.width = "42px";
      btnInc.style.padding = "0";
      btnInc.style.justifyContent = "center";

      qtyRow.appendChild(btnDec);
      qtyRow.appendChild(qty);
      qtyRow.appendChild(btnInc);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn";
      remove.dataset.action = "remove";
      remove.textContent = "Remover";
      remove.style.borderColor = "rgba(46,42,43,.14)";
      remove.style.opacity = "0.92";

      const lineTotal = document.createElement("div");
      lineTotal.textContent = formatBRL(it.preco * it.quantidade);
      lineTotal.style.fontWeight = "900";
      lineTotal.style.color = "rgba(46,42,43,.92)";

      right.appendChild(lineTotal);
      right.appendChild(qtyRow);
      right.appendChild(remove);

      card.style.display = "flex";
      card.style.justifyContent = "space-between";
      card.style.alignItems = "center";
      card.style.gap = "14px";

      card.appendChild(left);
      card.appendChild(right);

      itemsEl.appendChild(card);
    });

    const { subtotal, total } = calcTotals(items);
    if (subtotalEl) subtotalEl.textContent = formatBRL(subtotal);
    if (totalEl) totalEl.textContent = formatBRL(total);
  }

  function findIndex(cart, id) {
    return cart.findIndex((it) => String(it.id ?? it.productId ?? it.produtoId) === String(id));
  }

  function initCart() {
    ensureDataReady();
    const productsMap = getProductsMap();

    const itemsEl = qs("#cart-items");
    if (!itemsEl) return;

    function refresh() {
      const rawCart = getCart();
      const items = rawCart.map((it) => normalizeItem(it, productsMap));
      renderCart(items);
      updateCartBadges();
    }

    // eventos (+ / - / remover) por delegação
    itemsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;

      const card = e.target.closest(".cart-item");
      if (!card) return;

      const id = card.dataset.id;
      const action = btn.dataset.action;

      const cart = getCart();
      const idx = findIndex(cart, id);
      if (idx < 0) return;

      const curQty = Number(cart[idx].quantidade ?? cart[idx].qty ?? 1) || 1;

      if (action === "inc") {
        cart[idx].quantidade = curQty + 1;
      } else if (action === "dec") {
        const next = curQty - 1;
        if (next <= 0) cart.splice(idx, 1);
        else cart[idx].quantidade = next;
      } else if (action === "remove") {
        cart.splice(idx, 1);
      }

      saveCart(cart);
      refresh();
    });

    refresh();
  }

  document.addEventListener("DOMContentLoaded", initCart);
})();

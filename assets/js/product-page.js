(function () {
  function formatBRL(value) {
    return "R$ " + Number(value).toFixed(2).replace(".", ",");
  }

  function ensureDataReady() {
    if (window.dataLayer && typeof window.dataLayer.initData === "function") {
      window.dataLayer.initData();
    }
  }

  function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return Number(params.get("id"));
  }

  function setupWhatsappLink(product) {
    const waBtn = document.getElementById("buy-whatsapp");
    if (!waBtn) return;

    const msg = `Olá! Quero comprar: ${product.nome} (${formatBRL(product.preco)}).`;
    waBtn.href =
      "https://wa.me/558699700402?text=" + encodeURIComponent(msg);
  }

  function renderProduct() {
    ensureDataReady();

    const id = getProductId();
    const products =
      window.dataLayer && typeof window.dataLayer.getProducts === "function"
        ? window.dataLayer.getProducts()
        : [];

    const product = products.find((p) => p.id === id && p.ativo);

    if (!product) {
      const box = document.querySelector(".container");
      if (box) box.innerHTML = "<h2>Produto não encontrado.</h2>";
      return;
    }

    const nameEl = document.getElementById("product-name");
    const priceEl = document.getElementById("product-price");
    const descEl = document.getElementById("product-description");
    const imgEl = document.getElementById("product-image");

    if (nameEl) nameEl.textContent = product.nome;
    if (priceEl) priceEl.textContent = formatBRL(product.preco);

    if (descEl) {
      descEl.textContent =
        product.descricao ||
        "Pijama confortável e elegante para suas noites.";
    }

    if (imgEl) {
      imgEl.setAttribute("data-skeleton", "true");
      imgEl.src = "../assets/images/" + product.imagem;
      imgEl.alt = product.nome;

      const done = () => {
        imgEl.classList.add("is-loaded");
        imgEl.removeAttribute("data-skeleton");
      };

      imgEl.addEventListener("load", done, { once: true });
      imgEl.addEventListener(
        "error",
        () => {
          done();
          imgEl.alt = "Imagem indisponível";
        },
        { once: true }
      );
    }

    // Botão adicionar no carrinho (se existir window.cart)
    const addBtn = document.getElementById("add-to-cart");
    if (addBtn && window.cart && typeof window.cart.add === "function") {
      addBtn.addEventListener("click", () => {
        window.cart.add(product.id, 1);
        alert("Produto adicionado ao carrinho!");
      });
    }

    setupWhatsappLink(product);
  }

  document.addEventListener("DOMContentLoaded", renderProduct);
})();

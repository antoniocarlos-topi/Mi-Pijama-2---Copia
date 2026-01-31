// assets/js/data.js
(function () {
  const PRODUCTS_TABLE = "products";
  const ORDERS_TABLE = "orders";

  let _productsCache = [];

  function hasSupabaseConfig() {
    return !!(
      window.__MI_SUPABASE__ &&
      typeof window.__MI_SUPABASE__.url === "string" &&
      window.__MI_SUPABASE__.url.startsWith("http") &&
      typeof window.__MI_SUPABASE__.anonKey === "string" &&
      window.__MI_SUPABASE__.anonKey.length > 30
    );
  }

  async function loadSupabaseClient() {
    if (window.supabase && window.supabase.createClient) return;

    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function getClient() {
    if (!hasSupabaseConfig()) throw new Error("Supabase config missing");
    await loadSupabaseClient();
    const { url, anonKey } = window.__MI_SUPABASE__;
    return window.supabase.createClient(url, anonKey);
  }

  function placeholderImageDataURI() {
    const svg = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
        <defs>
          <linearGradient id="g" x1="0" x2="1">
            <stop offset="0" stop-color="#F6F2F4"/>
            <stop offset="1" stop-color="#F0E6EB"/>
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial" font-size="42" fill="#B93A76" opacity="0.55">
          MI Pijamas
        </text>
      </svg>
    `);
    return `data:image/svg+xml;charset=utf-8,${svg}`;
  }

  // ✅ resolve imagem: URL completa (Supabase Storage) OU arquivo local
  function resolveImageSrc(imageValue, basePath) {
    const v = String(imageValue || "").trim();
    if (!v) return placeholderImageDataURI();
    if (v.startsWith("http://") || v.startsWith("https://")) return v;
    return basePath + v;
  }

  function normalizeProduct(row) {
  const img = row.image ?? row.imagem ?? "";
  return {
    id: row.id,
    nome: row.nome ?? row.name ?? "Pijama",
    preco: Number(row.preco ?? row.price ?? 0),
    imagem: img ? String(img) : "",
    descricao: row.descricao ?? row.description ?? "",
    ativo: row.ativo ?? row.active ?? true,

    featured: row.featured ?? false,

    promocao: row.promocao ?? row.promo ?? false,
    preco_promocional: row.preco_promocional ?? row.promo_price ?? null,
    estoque: row.estoque ?? row.stock ?? null,
  };
}

  async function fetchProductsFromSupabase() {
    const client = await getClient();

    const { data, error } = await client
      .from(PRODUCTS_TABLE)
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;

    _productsCache = (data || []).map(normalizeProduct);
    return _productsCache;
  }

  async function createOrder(payload) {
    const client = await getClient();

    const { data, error } = await client
      .from(ORDERS_TABLE)
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  window.dataLayer = {
    async initData() {
      // ✅ nada de fake: se não tiver config, fica vazio
      if (!hasSupabaseConfig()) {
        _productsCache = [];
        return;
      }

      // ✅ tenta Supabase
      _productsCache = await fetchProductsFromSupabase();
    },

    getProducts() {
      return _productsCache || [];
    },

    resolveImageSrc,
    createOrder,
  };
})();

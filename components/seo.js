/**
 * SEO helper — set document title, description, canonical, Open Graph
 * Usage:
 *   MFK.seo.apply({ title, description, canonical, image, type })
 * Or <mfk-seo title="..." description="..." canonical="..." image="...">
 */
(function () {
  function upsertMeta(attr, key, content) {
    if (!content) return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function upsertLink(rel, href) {
    if (!href) return;
    let el = document.head.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement("link");
      el.setAttribute("rel", rel);
      document.head.appendChild(el);
    }
    el.setAttribute("href", href);
  }

  function apply(opts = {}) {
    const {
      title,
      description,
      canonical,
      image,
      type = "website",
      siteName = "MadeForMyKids",
    } = opts;

    if (title) {
      document.title = title;
      upsertMeta("property", "og:title", title);
      upsertMeta("name", "twitter:title", title);
    }
    if (description) {
      upsertMeta("name", "description", description);
      upsertMeta("property", "og:description", description);
      upsertMeta("name", "twitter:description", description);
    }
    if (canonical) {
      upsertLink("canonical", canonical);
      upsertMeta("property", "og:url", canonical);
    }
    if (image) {
      upsertMeta("property", "og:image", image);
      upsertMeta("name", "twitter:image", image);
    }
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:site_name", siteName);
    upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
  }

  if (!customElements.get("mfk-seo")) {
    class MfkSeo extends HTMLElement {
      connectedCallback() {
        apply({
          title: this.getAttribute("title"),
          description: this.getAttribute("description"),
          canonical: this.getAttribute("canonical"),
          image: this.getAttribute("image"),
          type: this.getAttribute("type") || "website",
          siteName: this.getAttribute("site-name") || "MadeForMyKids",
        });
      }
    }
    customElements.define("mfk-seo", MfkSeo);
  }

  window.MFK = window.MFK || {};
  window.MFK.seo = { apply };
})();

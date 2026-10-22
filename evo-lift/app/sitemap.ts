import type { MetadataRoute } from "next";
import { publicSitemap } from "@/lib/search-index";

export default function sitemap(): MetadataRoute.Sitemap {
  return publicSitemap();
}

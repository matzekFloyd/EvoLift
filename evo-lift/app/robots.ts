import type { MetadataRoute } from "next";
import { crawlerRobots } from "@/lib/search-index";

export default function robots(): MetadataRoute.Robots {
  return crawlerRobots();
}

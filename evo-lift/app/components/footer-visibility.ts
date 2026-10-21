import { appPath } from "@/lib/app-paths";

const SESSION_DETAIL_PATH = /^\/app\/sessions\/[^/]+$/;

export function shouldHideFooter(pathname: string): boolean {
  if (pathname === "/login") {
    return true;
  }
  if (pathname === appPath("/sessions/new")) {
    return true;
  }
  if (SESSION_DETAIL_PATH.test(pathname)) {
    return true;
  }
  return false;
}

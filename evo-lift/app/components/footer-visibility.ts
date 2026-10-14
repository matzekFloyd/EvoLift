export function shouldHideFooter(pathname: string): boolean {
  if (pathname === "/login") {
    return true;
  }
  if (pathname === "/sessions/new") {
    return true;
  }
  if (/^\/sessions\/[^/]+$/.test(pathname)) {
    return true;
  }
  return false;
}

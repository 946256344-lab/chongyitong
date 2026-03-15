import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 支持的语言
const locales = ["en", "zh"];
const defaultLocale = "en";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 如果路径里已经包含了语言 (例如 /en/...) 或者请求的是图片/api，就不管它
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") || // 排除 image.png 等文件
    locales.some((locale) => pathname.startsWith(`/${locale}`))
  ) {
    return;
  }

  // 否则，强制跳转到默认语言 (比如 / -> /zh)
  // 进阶做法是检测 request.headers.get('accept-language')，这里先简化处理
  const locale = defaultLocale;
  request.nextUrl.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

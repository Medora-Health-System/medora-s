/**
 * Reads `refreshToken` from Nest `Set-Cookie` (refresh is no longer returned in JSON body).
 */
export function extractRefreshTokenFromApiSetCookie(res: Response): string | undefined {
  const getter = res.headers.getSetCookie;
  if (typeof getter === "function") {
    for (const line of res.headers.getSetCookie()) {
      const m = /^refreshToken=([^;]+)/.exec(line);
      if (m) return decodeURIComponent(m[1]);
    }
  }
  const single = res.headers.get("set-cookie");
  if (single) {
    const m = /^refreshToken=([^;]+)/.exec(single);
    if (m) return decodeURIComponent(m[1]);
  }
  return undefined;
}

// token.mjs —— 服务端 Token 生命周期：缓存、并发合并、提前刷新、刷新、登出
import { buildTokenBody, makeTimestamp } from './sign.mjs';
import { maskValue } from './mask.mjs';

export class ProxyError extends Error {
  constructor({ code, message, httpStatus = 0, data = null }) {
    super(message || `请求失败（code=${code}）`);
    this.code = code;
    this.httpStatus = httpStatus;
    this.data = data;
  }
}

export class TokenManager {
  constructor(cfg, { fetchImpl = fetch, log = () => {} } = {}) {
    this.cfg = cfg;
    this.fetch = fetchImpl;
    this.log = log;
    this.cached = null;        // { accessToken, expiresAt, userId, expiresIn, refreshToken, fetchedAt }
    this.inflight = null;      // 并发合并：同一个 Promise
    this.fetchCount = 0;
    this.lastError = null;
  }

  isValid(bufferMs = 60 * 1000) {
    return !!this.cached && this.cached.expiresAt - Date.now() > bufferMs;
  }

  status() {
    const remainSec = this.cached ? Math.max(0, Math.floor((this.cached.expiresAt - Date.now()) / 1000)) : 0;
    return {
      mode: this.cfg.mode,
      tsUnit: this.cfg.tsUnit,
      appIdMasked: maskValue(this.cfg.appId),
      hasToken: !!this.cached,
      tokenMasked: this.cached ? maskValue(this.cached.accessToken) : null,
      remainSec,
      expiresIn: this.cached?.expiresIn ?? 0,
      userId: this.cached?.userId ?? null,
      fetchCount: this.fetchCount,
      lastError: this.lastError,
    };
  }

  invalidate() {
    this.cached = null;
  }

  /** 取 token：有缓存直接返回；并发请求合并成一次换取 */
  async get() {
    if (this.isValid()) return this.cached;
    if (this.inflight) return this.inflight;
    this.inflight = this._fetchToken()
      .finally(() => { this.inflight = null; });
    return this.inflight;
  }

  async _fetchToken() {
    const body = buildTokenBody(this.cfg.appId, this.cfg.appKey, this.cfg.tsUnit);
    const resp = await this.fetch(`${this.cfg.baseUrl}/api/uc/v1/access/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    if (!resp.ok || !json || json.code !== 0) {
      this.lastError = { code: json?.code ?? `HTTP_${resp.status}`, message: json?.message ?? '换取 Token 失败' };
      throw new ProxyError({ code: this.lastError.code, message: this.lastError.message, httpStatus: resp.status, data: json });
    }
    const data = json.data || {};
    const expiresIn = Number(data.expiresIn) || 28800;
    this.cached = {
      accessToken: data.accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      expiresIn,
      userId: data.user?.id ?? null,
      refreshToken: data.refreshToken || null,
      fetchedAt: new Date().toISOString(),
    };
    this.fetchCount += 1;
    this.lastError = null;
    this.log(`[token] 换取成功，剩余 ${Math.round(expiresIn / 3600)} 小时，第 ${this.fetchCount} 次换取`);
    return this.cached;
  }

  /** 刷新：Authorization 放 refreshToken，间隔限制由平台判定 */
  async refresh() {
    if (!this.cached?.refreshToken) {
      throw new ProxyError({ code: 'NO_REFRESH_TOKEN', message: '还没有 refreshToken，请先取一次 Token', httpStatus: 0 });
    }
    const resp = await this.fetch(`${this.cfg.baseUrl}/api/uc/v1/access/api/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cached.refreshToken}` },
      body: JSON.stringify({ appId: this.cfg.appId, grantType: 'refreshToken' }),
    });
    const text = await resp.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    if (!resp.ok || !json || json.code !== 0) {
      const code = json?.code ?? `HTTP_${resp.status}`;
      this.lastError = { code, message: json?.message ?? '刷新 Token 失败' };
      throw new ProxyError({ code, message: this.lastError.message, httpStatus: resp.status, data: json });
    }
    const data = json.data || {};
    const expiresIn = Number(data.expiresIn) || 28800;
    this.cached = {
      accessToken: data.accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
      expiresIn,
      userId: this.cached.userId,
      refreshToken: data.refreshToken || this.cached.refreshToken,
      fetchedAt: new Date().toISOString(),
    };
    this.lastError = null;
    this.log('[token] 刷新成功');
    return this.status();
  }

  async logout() {
    let ok = false;
    if (this.cached) {
      const resp = await this.fetch(`${this.cfg.baseUrl}/api/uc/v1/web/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.cached.accessToken}` },
      });
      const text = await resp.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
      ok = resp.ok && json?.code === 0;
    }
    this.cached = null;
    this.log('[token] 已登出并清空本地缓存');
    return { ok, cleared: true };
  }
}

export { makeTimestamp };

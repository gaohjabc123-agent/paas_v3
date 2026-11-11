// sign.mjs —— 两套签名公式（第2章核心）
// 取 Token：sign = MD5(appId + timestamp + appKey)，32 位小写
// 回  调：signature = MD5(回调URL + 10位秒级timestamp + AuthKey)，32 位小写
import crypto from 'node:crypto';

export function md5Hex(input) {
  return crypto.createHash('md5').update(String(input), 'utf8').digest('hex');
}

/** 按单位生成时间戳：ms=13 位毫秒；s=10 位秒（课程默认 ms，参数表口径） */
export function makeTimestamp(unit = 'ms', now = Date.now()) {
  return unit === 's' ? String(Math.floor(now / 1000)) : String(now);
}

/** 取 Token 签名（服务端权威实现，绝不下发 appKey） */
export function makeTokenSign(appId, timestamp, appKey) {
  if (!appId || !timestamp || !appKey) throw new Error('签名参数不完整：appId/timestamp/appKey 都必须有值');
  if (!/^\d{10}$|^\d{13}$/.test(String(timestamp))) throw new Error('timestamp 必须是 10 位秒或 13 位毫秒');
  return md5Hex(`${appId}${timestamp}${appKey}`);
}

/** 换取 Token 的请求体（与官方文档 10-用户接入 一致） */
export function buildTokenBody(appId, appKey, unit = 'ms', now = Date.now()) {
  const timestamp = makeTimestamp(unit, now);
  return { appId, timestamp, sign: makeTokenSign(appId, timestamp, appKey), grantType: 'sign' };
}

/** 回调验签（第二套公式）：MD5(回调URL + 10 位秒级 timestamp + AuthKey) */
export function makeCallbackSignature(callbackUrl, timestamp10, authKey) {
  if (!/^\d{10}$/.test(String(timestamp10))) throw new Error('回调 timestamp 必须是 10 位秒级');
  return md5Hex(`${callbackUrl}${timestamp10}${authKey}`);
}

/** 回调验签结果：同时校验签名与时间窗（课程约定 5 分钟） */
export function verifyCallback({ callbackUrl, timestamp, signature, authKey, windowSec = 300, now = Date.now() }) {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || String(timestamp).length !== 10) return { ok: false, reason: 'timestamp 必须是 10 位秒级' };
  const expected = makeCallbackSignature(callbackUrl, String(timestamp), authKey);
  if (expected !== String(signature).toLowerCase()) return { ok: false, reason: 'signature 不匹配（公式或 AuthKey 错，别混用取 Token 公式）' };
  const diff = Math.abs(Math.floor(now / 1000) - ts);
  if (diff > windowSec) return { ok: false, reason: `timestamp 超出时间窗：偏差 ${diff} 秒 > ${windowSec} 秒` };
  return { ok: true, reason: '签名与时间窗都通过' };
}

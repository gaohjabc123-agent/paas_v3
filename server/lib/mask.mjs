// mask.mjs —— 脱敏：服务端日志、接口响应、错误信息三处统一使用
// 规则：必须展示时用"前4位****后4位"；密钥/令牌/邮箱/手机号/密码一律不展示明文
const SECRET_KEYS = /(appkey|authkey|app_key|auth_key|secret|password|userpwd|token|email|phone|cellphone|mobile)/i;

export function maskValue(value) {
  const s = String(value ?? '');
  if (!s) return s;
  if (s.includes('****')) return s;
  if (s.length <= 8) return '****';
  return `${s.slice(0, 4)}****${s.slice(-4)}`;
}

/** 递归脱敏对象（不修改原对象），用于返回给浏览器的响应与日志 */
export function maskDeep(input, depth = 0) {
  if (depth > 6 || input == null) return input;
  if (Array.isArray(input)) return input.map((v) => maskDeep(v, depth + 1));
  if (typeof input !== 'object') return input;
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (SECRET_KEYS.test(k) && typeof v === 'string' && v) out[k] = maskValue(v);
    else out[k] = maskDeep(v, depth + 1);
  }
  return out;
}

/** 日志脱敏：把 token/sign/密钥 从文本里替换掉（日志最容易泄露） */
export function redactText(text) {
  return String(text)
    .replace(/(Bearer\s+)[A-Za-z0-9\-._~+/]{12,}/g, '$1****')
    .replace(/("?(?:accessToken|refreshToken|sign|appKey|authKey)"?\s*[:=]\s*"?)([A-Za-z0-9\-._~+/]{8,})/gi, '$1****')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, (m) => maskValue(m))
    .replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, (m) => maskValue(m));
}

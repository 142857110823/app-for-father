(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.QimenAiClient = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function isHtmlResponse(body, contentType) {
    const normalizedType = String(contentType || '').toLowerCase();
    const normalizedBody = String(body || '').trim().toLowerCase();
    return normalizedType.includes('text/html')
      || normalizedBody.startsWith('<!doctype html')
      || normalizedBody.startsWith('<html');
  }

  async function parseJsonResponse(response) {
    const contentType = response.headers && typeof response.headers.get === 'function'
      ? response.headers.get('content-type')
      : '';
    const body = await response.text();

    if (isHtmlResponse(body, contentType)) {
      throw new Error('后端未响应，请确认本地 server.js 已启动（端口 8090）。如在 GitHub Pages 使用，请在本机启动服务。');
    }

    let json;
    try {
      json = JSON.parse(body);
    } catch (error) {
      throw new Error('AI 服务返回了无法识别的数据，请稍后重试。');
    }

    if (!response.ok) {
      throw new Error(json.error || `AI 服务请求失败（HTTP ${response.status}）`);
    }

    return json;
  }

  /**
   * 智能默认端点：
   * 1) 如果用户显式配置了 window.QIMEN_API_BASE，使用该值
   * 2) 否则如果页面在 localhost / 127.0.0.1 访问，使用同源 /api/chat
   * 3) 否则（GitHub Pages、file://、内网 IP 等静态部署），尝试 http://localhost:8090/api/chat
   *    （用户需要在本机启动 server.js 才能使用 AI 功能）
   */
  function getDefaultEndpoint() {
    if (typeof window !== 'undefined' && window.QIMEN_API_BASE) {
      return `${String(window.QIMEN_API_BASE).replace(/\/+$/, '')}/api/chat`;
    }
    if (typeof location === 'undefined') {
      return '/api/chat';
    }
    const host = String(location.hostname || '').toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
    if (isLocal) {
      return '/api/chat';
    }
    // 静态部署（GitHub Pages 等）：默认指向本机 8090
    return 'http://localhost:8090/api/chat';
  }

  async function requestAiChat(messages, options) {
    const settings = options || {};
    const fetchImpl = settings.fetchImpl
      || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetchImpl) {
      throw new Error('当前环境不支持网络请求。');
    }

    const endpoint = settings.endpoint || getDefaultEndpoint();
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : '';
      const deviceId = typeof localStorage !== 'undefined' ? localStorage.getItem('qimen_device_id') : '';
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { Authorization: `Bearer ${token}` } : {},
          deviceId ? { 'X-Device-Id': deviceId } : {}
        ),
        body: JSON.stringify({ messages }),
      });
      return parseJsonResponse(response);
    } catch (e) {
      // 网络层错误（CORS、连接被拒、混合内容 HTTPS→HTTP 等）→ 提供操作指引
      const msg = String(e && e.message || '');
      if (/Failed to fetch|NetworkError|network|连接被拒绝|拒绝连接|CORS|blocked|mixed content|不安全|http.*https/i.test(msg)
          || e && e.name === 'TypeError') {
        const host = typeof location !== 'undefined' ? String(location.hostname || '') : '';
        const isLocalhost = host === 'localhost' || host === '127.0.0.1';
        const isGitHub = /github\.io$/i.test(host);
        let guide;
        if (isLocalhost) {
          guide = '本机后端未启动。请在项目根目录执行：node server.js，随后刷新页面重试。';
        } else if (isGitHub) {
          guide = 'GitHub Pages 为纯静态站点，无 AI 后端。请在本机打开命令行进入项目根目录运行：node server.js，然后访问 http://localhost:8090 使用完整 AI 功能。或在本机启动 server.js 后，此页面会自动尝试连接 http://localhost:8090/api/chat。若浏览器因混合内容阻止 HTTP 请求，请直接访问本地 http://localhost:8090/。';
        } else {
          guide = `当前页面(${host || '未知环境'})无法连接 AI 后端。建议在本机运行 node server.js，然后访问 http://localhost:8090 使用 AI 功能。`;
        }
        throw new Error('AI 服务不可用：' + guide);
      }
      throw e;
    }
  }

  return {
    parseJsonResponse,
    requestAiChat,
  };
});

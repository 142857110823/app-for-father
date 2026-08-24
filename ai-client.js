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
      throw new Error('当前静态网页未连接 AI 后端服务');
    }

    let json;
    try {
      json = JSON.parse(body);
    } catch (error) {
      throw new Error('AI 服务返回了无法识别的数据');
    }

    if (!response.ok) {
      throw new Error(json.error || `AI 服务请求失败（HTTP ${response.status}）`);
    }

    return json;
  }

  function getDefaultEndpoint() {
    if (typeof window !== 'undefined' && window.QIMEN_API_BASE) {
      return `${String(window.QIMEN_API_BASE).replace(/\/+$/, '')}/api/chat`;
    }
    return '/api/chat';
  }

  async function requestAiChat(messages, options) {
    const settings = options || {};
    const fetchImpl = settings.fetchImpl
      || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!fetchImpl) {
      throw new Error('当前环境不支持网络请求');
    }

    const response = await fetchImpl(settings.endpoint || getDefaultEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    return parseJsonResponse(response);
  }

  return {
    parseJsonResponse,
    requestAiChat,
  };
});

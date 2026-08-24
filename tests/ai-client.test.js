const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseJsonResponse,
  requestAiChat,
} = require('../ai-client.js');

function response(body, contentType = 'application/json', status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => name.toLowerCase() === 'content-type' ? contentType : '' },
    text: async () => body,
  };
}

test('AI response parser accepts JSON responses', async () => {
  const result = await parseJsonResponse(response('{"ok":true,"data":{"choices":[]}}'));
  assert.equal(result.ok, true);
});

test('AI response parser explains when a static host returns HTML', async () => {
  await assert.rejects(
    () => parseJsonResponse(response('<!doctype html><title>404</title>', 'text/html', 404)),
    /静态网页未连接 AI 后端服务/,
  );
});

test('AI request uses a configured public backend endpoint', async () => {
  const calls = [];
  const result = await requestAiChat(
    [{ role: 'user', content: '测试' }],
    {
      endpoint: 'https://api.example.com/api/chat',
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return response('{"ok":true,"data":{"choices":[]}}');
      },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(calls[0].url, 'https://api.example.com/api/chat');
  assert.equal(JSON.parse(calls[0].options.body).messages[0].content, '测试');
});

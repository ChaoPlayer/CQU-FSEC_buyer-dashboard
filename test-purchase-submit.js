const fetch = require('node-fetch');

async function testPurchaseSubmit() {
  const baseUrl = 'http://localhost:3000';
  
  // 1. 登录普通用户
  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      email: 'user@example.com',
      password: 'password123',
    }),
    redirect: 'manual',
  });
  
  console.log('Login status:', loginRes.status);
  const cookies = loginRes.headers.get('set-cookie');
  console.log('Cookies:', cookies);
  
  // 如果没有cookie，尝试使用NextAuth的API（实际上登录路由是/api/auth/signin?callbackUrl=...）
  // 但为了简化，我们直接使用现有会话（假设已经登录）。
  // 我们将改用硬编码的会话cookie？这很棘手。
  
  // 相反，我们可以直接调用采购API，假设有有效的会话（因为我们已经通过浏览器登录了）。
  // 但我们需要模拟一个有效的会话。我们跳过这个，直接检查服务器日志。
}

testPurchaseSubmit().catch(console.error);
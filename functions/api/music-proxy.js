import musicAPI from "../../src/api/music.js";

const API_BASE_URL = "https://music-dl.sayqz.com/api";

// 允许的安全响应头
const SAFE_RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "accept-ranges",
  "content-length",
  "content-range",
  "etag",
  "last-modified",
  "expires"
];

// 创建 CORS 响应头
function createCorsHeaders(init = null) {
  const headers = new Headers();
  
  if (init) {
    for (const [key, value] of init.entries()) {
      if (SAFE_RESPONSE_HEADERS.includes(key.toLowerCase())) {
        headers.set(key, value);
      }
    }
  }
  
  // 默认不缓存
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }
  
  // 添加 CORS 头
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");
  
  return headers;
}

// 处理 OPTIONS 预检请求
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400"
    }
  });
}

// 代理音频文件
async function proxyAudioFile(targetUrl, request) {
  try {
    const url = new URL(decodeURIComponent(targetUrl));
    
    // 验证协议
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return new Response("Invalid protocol", { status: 400 });
    }
    
    const init = {
      method: request.method,
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
        "Referer": "https://music-api.gdstudio.xyz/"
      }
    };
    
    // 传递 Range 头用于流式播放
    const rangeHeader = request.headers.get("Range");
    if (rangeHeader) {
      init.headers["Range"] = rangeHeader;
    }
    
    const upstream = await fetch(url.toString(), init);
    const headers = createCorsHeaders(upstream.headers);
    
    // 音频文件设置缓存
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "public, max-age=3600");
    }
    
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    });
  } catch (error) {
    console.error("Audio proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// 代理 API 请求
async function proxyApiRequest(url, request, env) {
  try {
    // 初始化数据库
    musicAPI.initDatabase(env);
    
    // 构建 API 请求 URL
    const apiUrl = new URL(API_BASE_URL);
    
    // 映射查询参数到新的 API 规格
    const types = url.searchParams.get("types");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const count = parseInt(url.searchParams.get("count") || "20", 10);
    
    // 根据原始的 types 参数映射到新 API 的 type 参数
    let mappedType = types;
    if (types === "search") {
      mappedType = "search";
      const source = url.searchParams.get("source") || "netease";
      const keyword = url.searchParams.get("name") || "";
      const limit = url.searchParams.get("count") || "20";
      
      apiUrl.searchParams.set("source", source);
      apiUrl.searchParams.set("type", "search");
      apiUrl.searchParams.set("keyword", keyword);
      apiUrl.searchParams.set("limit", limit);
    } else if (types === "url") {
      const id = url.searchParams.get("id");
      const source = url.searchParams.get("source") || "netease";
      const br = url.searchParams.get("br") || "320k";
      
      apiUrl.searchParams.set("source", source);
      apiUrl.searchParams.set("id", id);
      apiUrl.searchParams.set("type", "url");
      apiUrl.searchParams.set("br", br);
    } else if (types === "lyric") {
      const id = url.searchParams.get("id");
      const source = url.searchParams.get("source") || "netease";
      
      apiUrl.searchParams.set("source", source);
      apiUrl.searchParams.set("id", id);
      apiUrl.searchParams.set("type", "lrc");
    } else if (types === "pic") {
      const id = url.searchParams.get("id");
      const source = url.searchParams.get("source") || "netease";
      
      apiUrl.searchParams.set("source", source);
      apiUrl.searchParams.set("id", id);
      apiUrl.searchParams.set("type", "pic");
    } else {
      // 默认: 复制所有查询参数
      url.searchParams.forEach((value, key) => {
        if (key !== "target" && key !== "callback") {
          apiUrl.searchParams.set(key, value);
        }
      });
    }
    
    // 验证必要参数
    if (!apiUrl.searchParams.has("type")) {
      return new Response(JSON.stringify({ error: "Missing type parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const upstream = await fetch(apiUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": request.headers.get("User-Agent") || "Mozilla/5.0",
        "Accept": "application/json"
      }
    });
    
    clearTimeout(timeoutId);
    
    // 处理 URL 类型的 302 重定向
    if (mappedType === "url" && upstream.status === 302) {
      const locationUrl = upstream.headers.get("location");
      const headers = createCorsHeaders(upstream.headers);
      headers.set("Content-Type", "application/json; charset=utf-8");
      headers.set("Cache-Control", "public, max-age=3600");
      
      const xSourceSwitch = upstream.headers.get("x-source-switch");
      const responseData = {
        code: 200,
        message: "success",
        data: {
          url: locationUrl
        }
      };
      
      if (xSourceSwitch) {
        responseData.data.sourceSwitch = xSourceSwitch;
      }
      
      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers
      });
    }
    
    // 处理响应
    const headers = createCorsHeaders(upstream.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json; charset=utf-8");
    }
    
    // 检查状态码
    if (!upstream.ok) {
      return new Response(JSON.stringify({
        error: `API Error: ${upstream.status} ${upstream.statusText}`
      }), {
        status: upstream.status,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 解析并可能转换响应
    let data;
    try {
      data = await upstream.json();
    } catch (parseError) {
      return new Response(JSON.stringify({ error: "Failed to parse API response" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // 设置缓存策略
    if (types === "search") {
      headers.set("Cache-Control", "public, max-age=300");
    } else if (types === "url" || types === "lyric" || types === "pic") {
      headers.set("Cache-Control", "public, max-age=3600");
    }
    
    return new Response(JSON.stringify(data), {
      status: 200,
      headers
    });
  } catch (error) {
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.name === "AbortError") {
      statusCode = 504;
      errorMessage = "Request timeout";
    } else if (error instanceof TypeError) {
      statusCode = 502;
      errorMessage = "Network error";
    }
    
    console.error("API proxy error:", errorMessage, error);
    
    return new Response(JSON.stringify({
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export default {
  async onRequest(context) {
    const { request, env } = context;
    
    // 处理 OPTIONS 预检请求
    if (request.method === "OPTIONS") {
      return handleOptions();
    }
    
    // 只允许 GET 和 HEAD 请求
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }
    
    const url = new URL(request.url);
    const target = url.searchParams.get("target");
    
    // 如果有 target 参数，代理音频文件
    if (target) {
      return proxyAudioFile(target, request);
    }
    
    // 否则代理 API 请求
    return proxyApiRequest(url, request, env);
  }
};
const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html");

    if (url.pathname === "/") {
      url.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(url, request));
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || !acceptsHtml) return response;

    url.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(url, request));
  }
};

export default worker;

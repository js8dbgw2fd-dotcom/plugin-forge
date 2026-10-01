import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { createPluginPackage } from "./generator.js";

const app = express();
app.use(express.json());
app.use("/", express.static(new URL(".", import.meta.url).pathname));
app.post("/api/create", (req, res) => {
  const input = req.body || {};
  for (const key of ["name", "description", "goal", "workflow"]) {
    if (typeof input[key] !== "string" || !input[key].trim()) return res.status(400).json({ error: `Missing ${key}` });
  }
  res.json(createPluginPackage(input));
});

const widgetHtml = readFileSync(new URL("./widget.html", import.meta.url), "utf8");
function createPluginForgeServer() {
  const server = new McpServer({ name: "plugin-forge", version: "0.1.0" });
  registerAppResource(server, "plugin-forge-widget", "ui://plugin-forge/result.html", {}, async () => ({
    contents: [{ uri: "ui://plugin-forge/result.html", mimeType: RESOURCE_MIME_TYPE, text: widgetHtml }]
  }));
  registerAppTool(server, "create_plugin_package", {
    title: "Create a ChatGPT plugin package",
    description: "Turn a user's plugin idea into a starter package with a manifest, skill instructions, README, and optionally an MCP server template.",
    inputSchema: {
      name: z.string().min(1).max(64),
      description: z.string().min(1).max(280),
      goal: z.string().min(1).max(600),
      workflow: z.string().min(1).max(800),
      includesMcp: z.boolean().default(false)
    },
    _meta: { ui: { resourceUri: "ui://plugin-forge/result.html" }, "openai/widgetAccessible": true }
  }, async (input) => {
    const result = createPluginPackage(input);
    return {
      content: [{ type: "text", text: `Created ${result.title} starter package with ${Object.keys(result.files).length} files.` }],
      structuredContent: result
    };
  });
  return server;
}

app.get("/health", (_req, res) => res.json({ ok: true, service: "plugin-forge" }));
app.options("/mcp", (_req, res) => res.set({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id"
}).sendStatus(204));
app.post("/mcp", async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  const server = createPluginForgeServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => { transport.close(); server.close(); });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request failed:", error);
    if (!res.headersSent) res.status(500).end("Internal server error");
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => console.log(`Plugin Forge MCP server listening on ${port}`));

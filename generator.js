const slugify = (value) => String(value || "my-plugin")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "my-plugin";

const sentence = (value, fallback) => String(value || fallback).trim().replace(/\s+/g, " ");

export function createPluginPackage(input) {
  const title = sentence(input.name, "My ChatGPT Plugin").slice(0, 64);
  const slug = slugify(title);
  const description = sentence(input.description, `A ChatGPT plugin that helps with ${title}.`).slice(0, 280);
  const goal = sentence(input.goal, description);
  const includesMcp = input.includesMcp === true;
  const workflow = sentence(input.workflow, `Understand the user's request, ask for missing details, and complete the task using the available tools.`);
  const serverName = slug.replace(/-/g, "_");

  const skill = `---\nname: ${slug}\ndescription: ${description}\n---\n\n# ${title}\n\n## Goal\n${goal}\n\n## Workflow\n1. Confirm the user's goal and collect any missing details.\n2. ${workflow}\n3. Show the result clearly and ask before any action that has a cost or cannot be undone.\n\n## Rules\n- Use only information the user gives you or the connected tools return.\n- Never claim an action succeeded until a tool confirms it.\n- If a needed tool is missing, explain what is missing and offer the next useful step.\n`;

  const manifest = {
    name: title,
    version: "0.1.0",
    description,
    skills: "./skills/",
    ...(includesMcp ? { mcp: "./mcp.json" } : {})
  };

  const files = {
    "plugin.json": JSON.stringify(manifest, null, 2),
    [`skills/${slug}/SKILL.md`]: skill,
    "README.md": `# ${title}\n\n${description}\n\n## Package contents\n- \`plugin.json\`: plugin identity and package links.\n- \`skills/${slug}/SKILL.md\`: workflow instructions for ChatGPT.\n${includesMcp ? "- `mcp.json` and `server/`: starter MCP tool server.\n" : ""}\n## Next steps\n1. Review the generated instructions and replace any example text.\n2. Test the package in ChatGPT Work.\n${includesMcp ? "3. Deploy the MCP server to a public HTTPS address, then add that address in ChatGPT developer mode.\n4. Add the deployed connection ID to your plugin mapping before publishing.\n" : "3. Submit the skill package through the plugin submission flow if you want others to install it.\n"}`
  };

  if (includesMcp) {
    files["mcp.json"] = JSON.stringify({ mcpServers: { [serverName]: { type: "http", url: "https://REPLACE-WITH-YOUR-HOST/mcp" } } }, null, 2);
    files["server/package.json"] = JSON.stringify({ name: `${slug}-mcp`, version: "0.1.0", private: true, type: "module", scripts: { start: "node server.js" }, dependencies: { "@modelcontextprotocol/sdk": "^1.25.2", express: "^5.1.0", zod: "^4.1.13" } }, null, 2);
    files["server/server.js"] = `// Starter MCP server for ${title}. Replace this example with your real service logic.\nimport express from "express";\nimport { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";\nimport { z } from "zod";\n\nconst app = express();\napp.use(express.json());\nconst server = new McpServer({ name: "${serverName}", version: "0.1.0" });\nserver.registerTool("${serverName}_help", {\n  title: "${title}",\n  description: "Help the user with: ${description.replaceAll('"', '\\"')}",\n  inputSchema: { request: z.string().min(1).describe("What the user wants help with") }\n}, async ({ request }) => ({\n  content: [{ type: "text", text: \`Request received: \${request}. Replace this response with the real service action.\` }]\n}));\n\napp.post("/mcp", async (req, res) => {\n  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });\n  res.on("close", () => transport.close());\n  await server.connect(transport);\n  await transport.handleRequest(req, res, req.body);\n});\napp.get("/health", (_req, res) => res.json({ ok: true }));\napp.listen(process.env.PORT || 8787, () => console.log("MCP server ready"));\n`;
  }
  return { title, slug, description, files };
}

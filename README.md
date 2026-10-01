# Plugin Forge for ChatGPT

Plugin Forge is a ChatGPT-native starter app for turning a user's idea into an Agent Plugin package. A user describes the plugin in the conversation; the MCP tool creates a manifest, a focused `SKILL.md`, a README, and optionally an MCP server template. A result card appears in ChatGPT with a ZIP download button.

## Run locally

```sh
npm install
npm test
npm start
```

Open `http://localhost:8787` for the standalone form preview. The `/mcp` route exposes `create_plugin_package` over Streamable HTTP and returns the in-chat widget resource at `ui://plugin-forge/result.html`.

## Connect to ChatGPT

Deploy the `/mcp` endpoint at a public HTTPS address, turn on ChatGPT developer mode, and register the MCP server from ChatGPT's Plugins settings. After that setup, people create and receive plugin packages inside their ChatGPT conversation. Public distribution also requires the plugin submission and review flow.

## Scope

The generator creates editable starter files. It does not create third-party credentials or make unfinished example actions work; each generated MCP server must be connected to and tested against its real service.

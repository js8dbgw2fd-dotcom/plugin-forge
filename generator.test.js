import test from "node:test";
import assert from "node:assert/strict";
import { createPluginPackage } from "../src/generator.js";

test("creates a skill-only package with a safe slug", () => {
  const pkg = createPluginPackage({ name: "Café Helper", description: "Helps users.", goal: "Help users", workflow: "Ask first", includesMcp: false });
  assert.equal(pkg.slug, "cafe-helper");
  assert.ok(pkg.files["plugin.json"]);
  assert.ok(pkg.files["skills/cafe-helper/SKILL.md"].includes("# Café Helper"));
  assert.equal(pkg.files["mcp.json"], undefined);
});

test("adds MCP starter files only when requested", () => {
  const pkg = createPluginPackage({ name: "Order Helper", description: "Helps with orders.", goal: "Track orders", workflow: "Ask for an order number", includesMcp: true });
  assert.ok(pkg.files["mcp.json"]);
  assert.ok(pkg.files["server/server.js"].includes("registerTool"));
});

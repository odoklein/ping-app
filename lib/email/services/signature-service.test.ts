import assert from "node:assert/strict";
import test from "node:test";
import {
  appendEmailSignatureHtml,
  appendEmailSignatureText,
  sanitizeEmailSignatureHtml,
  signatureHtmlToText,
  SignatureValidationError,
} from "./signature-service";

test("sanitizes scripts, event handlers and unsafe links", () => {
  const clean = sanitizeEmailSignatureHtml(
    '<p onclick="alert(1)"><strong>Jean</strong><script>alert(1)</script><a href="javascript:alert(1)">Site</a></p>',
  );

  assert.ok(clean);
  assert.equal(clean.includes("script"), false);
  assert.equal(clean.includes("onclick"), false);
  assert.equal(clean.includes("javascript:"), false);
  assert.match(clean, /<strong>Jean<\/strong>/);
});

test("creates a readable plain text fallback", () => {
  assert.equal(
    signatureHtmlToText("<p><strong>Jean Dupont</strong><br>Sales Manager</p><p>01 02 03 04 05</p>"),
    "Jean Dupont\nSales Manager\n01 02 03 04 05",
  );
});

test("preserves email-safe layouts, inline styles and hosted logos", () => {
  const clean = sanitizeEmailSignatureHtml(
    '<table cellpadding="0" style="font-family:Arial,sans-serif;color:#173f3a"><tr><td style="padding-right:12px"><img src="https://example.com/logo.png" width="72" onerror="alert(1)" style="max-width:72px"></td><td><strong>Jean Dupont</strong><br><a href="mailto:jean@example.com" style="color:#1f4d47">jean@example.com</a></td></tr></table>',
  );

  assert.ok(clean);
  assert.match(clean, /<table/);
  assert.match(clean, /font-family:Arial,sans-serif/);
  assert.match(clean, /<img src="https:\/\/example.com\/logo.png"/);
  assert.equal(clean.includes("onerror"), false);
});

test("removes unsafe CSS URLs from advanced signatures", () => {
  const clean = sanitizeEmailSignatureHtml(
    '<div style="color:#123456;background-image:url(https://tracker.test/pixel)">Jean</div>',
  );

  assert.ok(clean);
  assert.match(clean, /color:#123456/);
  assert.equal(clean.includes("background-image"), false);
  assert.equal(clean.includes("tracker.test"), false);
});

test("appends an HTML signature once", () => {
  const once = appendEmailSignatureHtml("<p>Bonjour</p>", "<p>Jean</p>");
  assert.ok(once?.includes('data-suzalink-signature="true"'));
  assert.equal(appendEmailSignatureHtml(once, "<p>Jean</p>"), once);
});

test("appends a text signature once", () => {
  const once = appendEmailSignatureText("Bonjour", "Jean\nSales Manager");
  assert.equal(once, "Bonjour\n\nJean\nSales Manager");
  assert.equal(appendEmailSignatureText(once, "Jean\nSales Manager"), once);
});

test("rejects signatures larger than the configured limit", () => {
  assert.throws(
    () => sanitizeEmailSignatureHtml("a".repeat(100_001)),
    SignatureValidationError,
  );
});

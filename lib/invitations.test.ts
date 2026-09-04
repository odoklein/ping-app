import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    INVITATION_EXPIRY_DAYS,
    INVITATION_MIN_PASSWORD_LENGTH,
    buildInviteUrl,
    daysUntil,
    generateInvitationToken,
    hashInvitationToken,
    invitationExpiryDate,
    roleRequiresClient,
    scorePassword,
} from "./invitations";
import { getRoleCopy, getRoleLabel, renderInvitationEmail } from "./email/templates/invitation";

describe("invitation tokens", () => {
    it("never stores the raw token: the hash differs and is 64 hex chars", () => {
        const { rawToken, tokenHash } = generateInvitationToken();

        assert.notEqual(tokenHash, rawToken);
        assert.match(rawToken, /^[0-9a-f]{64}$/); // 32 bytes hex
        assert.match(tokenHash, /^[0-9a-f]{64}$/); // sha-256 hex
    });

    it("hashes deterministically so lookup by tokenHash works", () => {
        const { rawToken, tokenHash } = generateInvitationToken();
        assert.equal(hashInvitationToken(rawToken), tokenHash);
    });

    it("produces a distinct token on every call", () => {
        const tokens = new Set(
            Array.from({ length: 50 }, () => generateInvitationToken().rawToken),
        );
        assert.equal(tokens.size, 50);
    });

    it("does not match a tampered token", () => {
        const { rawToken, tokenHash } = generateInvitationToken();
        const tampered = `0${rawToken.slice(1)}` === rawToken ? `1${rawToken.slice(1)}` : `0${rawToken.slice(1)}`;
        assert.notEqual(hashInvitationToken(tampered), tokenHash);
    });
});

describe("invitation expiry", () => {
    it("expires 7 days after issuance", () => {
        const from = new Date("2026-09-03T10:00:00.000Z");
        const expiresAt = invitationExpiryDate(from);

        assert.equal(INVITATION_EXPIRY_DAYS, 7);
        assert.equal(
            expiresAt.getTime() - from.getTime(),
            7 * 24 * 60 * 60 * 1000,
        );
    });

    it("reports 0 remaining days once past", () => {
        assert.equal(daysUntil(new Date(Date.now() - 1000)), 0);
        assert.equal(daysUntil(new Date(Date.now() + 3 * 24 * 3600 * 1000)), 3);
    });
});

describe("invitation URL", () => {
    it("builds /invite/<rawToken> against the request origin", () => {
        const previousPublic = process.env.NEXT_PUBLIC_APP_URL;
        const previousAuth = process.env.NEXTAUTH_URL;
        delete process.env.NEXT_PUBLIC_APP_URL;
        delete process.env.NEXTAUTH_URL;

        try {
            const url = buildInviteUrl("abc123", "https://app.example.com/api/invitations");
            assert.equal(url, "https://app.example.com/invite/abc123");
        } finally {
            if (previousPublic) process.env.NEXT_PUBLIC_APP_URL = previousPublic;
            if (previousAuth) process.env.NEXTAUTH_URL = previousAuth;
        }
    });
});

describe("role rules", () => {
    it("requires a client only for CLIENT and COMMERCIAL", () => {
        assert.equal(roleRequiresClient("CLIENT"), true);
        assert.equal(roleRequiresClient("COMMERCIAL"), true);
        assert.equal(roleRequiresClient("SDR"), false);
        assert.equal(roleRequiresClient("MANAGER"), false);
    });

    it("labels every role and falls back for unknown ones", () => {
        assert.equal(getRoleLabel("SDR"), "SDR");
        assert.equal(getRoleLabel("BUSINESS_DEVELOPER"), "Business Developer");
        assert.equal(getRoleLabel("NOT_A_ROLE"), "Collaborateur");
    });

    it("gives each role its own headline copy", () => {
        assert.notEqual(getRoleCopy("MANAGER").headline, getRoleCopy("CLIENT").headline);
        assert.notEqual(getRoleCopy("SDR").headline, getRoleCopy("COMMERCIAL").headline);
    });
});

describe("password strength", () => {
    it("rejects anything shorter than the minimum as weak", () => {
        assert.equal(INVITATION_MIN_PASSWORD_LENGTH, 8);
        const weak = scorePassword("Ab1!");
        assert.equal(weak.checks.length, false);
        assert.ok(weak.score <= 1);
    });

    it("scores a long mixed password highly", () => {
        const strong = scorePassword("Prospecto2026!");
        assert.equal(strong.checks.length, true);
        assert.equal(strong.checks.upper, true);
        assert.equal(strong.checks.digit, true);
        assert.equal(strong.checks.symbol, true);
        assert.ok(strong.score >= 3);
    });
});

describe("invitation email rendering", () => {
    it("embeds the activation URL and role-specific copy", () => {
        const { subject, html, text } = renderInvitationEmail({
            role: "SDR",
            recipientName: "Alex Martin",
            inviterName: "Victor Dupont",
            inviteUrl: "https://app.example.com/invite/deadbeef",
            companyName: "Ping",
        });

        assert.ok(subject.includes("Victor Dupont"));
        assert.ok(subject.includes("SDR"));
        assert.ok(html.includes("https://app.example.com/invite/deadbeef"));
        assert.ok(html.includes(getRoleCopy("SDR").headline.replace(/'/g, "&#39;")));
        assert.ok(text.includes("https://app.example.com/invite/deadbeef"));
        assert.ok(text.includes("7 jours"));
    });

    it("escapes recipient-controlled values in the HTML body", () => {
        const { html } = renderInvitationEmail({
            role: "CLIENT",
            recipientName: '<script>alert("x")</script>',
            inviterName: "Manager & Co",
            inviteUrl: "https://app.example.com/invite/token",
            clientName: "Acme <b>",
        });

        assert.ok(!html.includes("<script>alert"));
        assert.ok(html.includes("&lt;script&gt;"));
        assert.ok(html.includes("Manager &amp; Co"));
        assert.ok(html.includes("Acme &lt;b&gt;"));
    });

    it("shows the client account row only when a client is attached", () => {
        const withClient = renderInvitationEmail({
            role: "CLIENT",
            recipientName: "Dir",
            inviterName: "Mgr",
            inviteUrl: "https://x/invite/t",
            clientName: "Acme",
        });
        const withoutClient = renderInvitationEmail({
            role: "SDR",
            recipientName: "Alex",
            inviterName: "Mgr",
            inviteUrl: "https://x/invite/t",
        });

        assert.ok(withClient.html.includes(">Compte<"));
        assert.ok(!withoutClient.html.includes(">Compte<"));
    });
});

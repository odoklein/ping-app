import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { testWithAllo, testRingover, testLeexi, testSmtp } from "@/lib/tenant/api-tester";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { provider, credentials } = body;

    if (!provider) {
      return NextResponse.json({ success: false, error: "Fournisseur non spécifié" }, { status: 400 });
    }

    let result;

    switch (provider.toUpperCase()) {
      case "ALLO":
      case "WITHALLO":
        result = await testWithAllo(credentials?.apiKey || "");
        break;

      case "RINGOVER":
        result = await testRingover(credentials?.apiKey || "");
        break;

      case "LEEXI":
        result = await testLeexi(credentials?.keyId || "", credentials?.keySecret || "");
        break;

      case "SMTP":
        result = await testSmtp({
          host: credentials?.host || "",
          port: Number(credentials?.port) || 587,
          user: credentials?.user || "",
          pass: credentials?.pass || "",
          secure: Boolean(credentials?.secure),
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Fournisseur ${provider} non supporté pour le test automatique.` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[TEST_CONNECTION_ERROR]", error);
    return NextResponse.json(
      { success: false, message: `Erreur interne lors du test : ${error.message}` },
      { status: 500 }
    );
  }
}

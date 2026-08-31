import { NextRequest } from "next/server";
import { z } from "zod";
import { errorResponse, requireAuth, successResponse, validateRequest, withErrorHandler } from "@/lib/api-utils";

const requestSchema = z.object({
    kind: z.enum(["TASK", "PROJECT", "SUBTASK"]),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(12000).optional(),
    projectName: z.string().max(200).optional(),
    existingItems: z.array(z.string().max(200)).max(50).optional(),
});

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

export const POST = withErrorHandler(async (request: NextRequest) => {
    await requireAuth(request);
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) return errorResponse("MISTRAL_API_KEY non configurée", 503);

    const input = await validateRequest(request, requestSchema);
    const existing = input.existingItems?.length
        ? `\nÉléments déjà existants : ${input.existingItems.map((item, index) => `${index + 1}. ${item}`).join("\n")}`
        : "";
    const isProject = input.kind === "PROJECT";
    const systemPrompt = `Tu es un chef de projet expert. Propose une organisation avant toute création. Ne suppose jamais que ta proposition sera appliquée : elle doit être claire, courte et modifiable par un humain.

Contexte : ${input.projectName || "Non spécifié"}${existing}

Réponds UNIQUEMENT avec du JSON valide selon ce schéma :
{
  "summary": "Résumé de l'organisation proposée",
  "item": {
    "title": "Titre clair",
    "description": "Description structurée",
    "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    "labels": ["label"],
    "estimatedHours": number
  },
  "children": [
    { "title": "Élément actionnable", "description": "Critère de réalisation", "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT", "estimatedHours": number }
  ]
}

${isProject
    ? `Pour un projet, children contient les sous-projets cohérents. Chaque child peut aussi contenir children pour un niveau supplémentaire de sous-projets, et un tableau tasks :
"tasks": [{ "title": "Tâche actionnable", "description": "Critère de réalisation", "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT", "estimatedHours": number }].

Si le texte fourni contient une liste de tâches, tu DOIS la répartir dans tasks, sous le bon sous-projet. Ne laisse pas de liste de tâches dans item.description. item.description doit être un résumé du projet de 300 caractères maximum, sans puces, sans emojis et sans répéter le texte source. Si le texte mentionne des phases, modules, lots ou catégories, utilise-les comme sous-projets. Si aucune catégorie n'est présente, crée des sous-projets logiques seulement si cela apporte de la clarté. Conserve les priorités, personnes et échéances lorsqu'elles sont présentes dans le texte.`
    : "Pour une tâche, children contient 0 à 8 sous-tâches indépendantes et vérifiables."}
Réponds en français. Les children doivent éviter les doublons avec les éléments existants.`;

    try {
        const response = await fetch(MISTRAL_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "mistral-large-latest",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `À organiser (${input.kind}) : ${input.title}\n${input.description ? `Description : ${input.description}` : ""}` },
                ],
                temperature: 0.3,
                max_tokens: isProject ? 6000 : 2000,
                response_format: { type: "json_object" },
            }),
        });
        if (!response.ok) {
            const details = await response.json().catch(() => ({}));
            return errorResponse(details.error?.message || "Erreur Mistral AI", response.status);
        }
        const content = (await response.json()).choices?.[0]?.message?.content?.trim();
        if (!content) return errorResponse("Réponse vide de Mistral AI", 500);
        return successResponse(JSON.parse(content));
    } catch (error) {
        console.error("Mistral organize-work error:", error);
        return errorResponse("Impossible de générer la proposition d'organisation", 500);
    }
});

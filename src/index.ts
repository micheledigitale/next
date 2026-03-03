import { Env, ChatMessage } from "./types";

// Modello Gemma 2 9B: perfetto per risposte secche e veloci
const MODEL_ID = "@cf/google/gemma-2-9b-it";

// Istruzioni per eliminare i fronzoli tipici delle AI
const SYSTEM_PROMPT =
	"Sei Jarvis. Rispondi solo in italiano. Sii brutale, sintetico e vai dritto al punto. " +
	"Niente saluti, niente introduzioni, niente 'Certamente!' o 'Ecco la risposta'. " +
	"Fornisci solo l'informazione richiesta. Zero chiacchiere.";

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/" || !url.pathname.startsWith("/api/")) {
			return env.ASSETS.fetch(request);
		}

		if (url.pathname === "/api/chat" && request.method === "POST") {
			return handleChatRequest(request, env);
		}

		return new Response("Not found", { status: 404 });
	},
} satisfies ExportedHandler<Env>;

async function handleChatRequest(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		const { messages = [] } = (await request.json()) as {
			messages: ChatMessage[];
		};

		if (!messages.some((msg) => msg.role === "system")) {
			messages.unshift({ role: "system", content: SYSTEM_PROMPT });
		}

		const stream = await env.AI.run(
			MODEL_ID,
			{
				messages,
				max_tokens: 300, // Limite stretto per forzare la sintesi
				temperature: 0.2, // Più basso = più deterministico e meno chiacchiere
				stream: true,
			},
			{
				gateway: {
					id: "jarvis-gateway", 
					skipCache: false,     
					cacheTtl: 86400,      
				},
			},
		);

		return new Response(stream, {
			headers: {
				"content-type": "text/event-stream; charset=utf-8",
				"cache-control": "no-cache",
				connection: "keep-alive",
			},
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: "Errore sistema." }), { status: 500 });
	}
}

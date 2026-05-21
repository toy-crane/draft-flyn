import { translateKoreanToEnglish } from "@/lib/ai/translate";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 10;

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text: string };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!text || text.trim().length === 0) {
    return Response.json({ en: "" });
  }

  const en = await translateKoreanToEnglish(text);
  return Response.json({ en });
}

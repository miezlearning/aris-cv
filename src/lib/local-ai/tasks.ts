import type { ResumeProfile } from "@/types/resume";
import { translateFieldToEnglish, translateFieldToIndonesian, translateProfileDeterministic } from "@/lib/ats/translator";
import { runLocalChatCompletion, type ActiveLocalAiConfig } from "@/lib/local-ai/engine";

const stripWrapperQuotes = (text: string): string =>
  text
    .replace(/^```[\s\S]*?\n|```$/g, "")
    .replace(/^[-•*\s]+/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(?:Rewritten bullet|Hasil|Output|Summary|Ringkasan)\s*:\s*/i, "")
    .trim();

export const rewriteBulletWithLocalAi = async (
  config: ActiveLocalAiConfig,
  params: {
    bullet: string;
    role: string;
    jobTitle: string;
    jobDescription: string;
    targetKeywords: string[];
    targetLang: "id" | "en";
  }
): Promise<{ suggestion: string; note: string }> => {
  const kwText = params.targetKeywords.length ? params.targetKeywords.join(", ") : "-";
  const langLabel = params.targetLang === "en" ? "ATS English" : "Bahasa Indonesia formal ATS";
  const actionRule =
    params.targetLang === "en"
      ? "Start with a strong English past/present ATS action verb (e.g. Developed, Built, Engineered, Coordinated, Analyzed)."
      : "Awali dengan kata kerja aktif Bahasa Indonesia (misal: Mengembangkan, Merancang, Membangun, Mengkoordinasikan, Mengoptimalkan).";

  const systemPrompt = `You are a strict, honest ATS Resume Coach. Rewrite ONE resume bullet point in ${langLabel} so it aligns better with the target job description using Google XYZ/STAR structure (Action + Context/Tools + Outcome).
STRICT RULES:
1. NEVER invent numbers, percentages, metrics, tools, or achievements not stated in the original bullet.
2. Only incorporate target keywords if they accurately describe what is already in the original bullet.
3. ${actionRule}
4. Return ONLY ONE plain single-line bullet sentence without bullet symbol, quotes, or explanation.`;

  const userPrompt = `Target Role: ${params.jobTitle || "General Role"}
Relevant Job Keywords: ${kwText}
Target Job Context: ${(params.jobDescription || "").slice(0, 700)}
Candidate Source Role: ${params.role || "-"}
Original Bullet: ${params.bullet}`;

  const raw = await runLocalChatCompletion(
    config,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.25, maxTokens: 160 }
  );

  const cleaned = stripWrapperQuotes(raw.split(/\r?\n/)[0] ?? "");
  if (!cleaned || cleaned.length < 10) {
    throw new Error("Model mengembalikan output terlalu pendek. Coba susun ulang lagi.");
  }

  const hasNumber = /\d/.test(cleaned);
  return {
    suggestion: cleaned,
    note: hasNumber
      ? "Disusun ulang oleh AI lokal selaras lowongan Langkah 2 dengan mempertahankan data aslimu."
      : "Disusun ulang oleh AI lokal. Jika ada angka atau cakupan nyata dari pengalamanmu, kamu bisa menambahkannya manual."
  };
};

export const tailorSummaryWithLocalAi = async (
  config: ActiveLocalAiConfig,
  params: {
    summary: string;
    headline: string;
    jobTitle: string;
    companyName: string;
    matchedKeywords: string[];
    targetLang: "id" | "en";
  }
): Promise<string> => {
  const langLabel = params.targetLang === "en" ? "ATS English" : "Bahasa Indonesia formal ATS";
  const systemPrompt = `You are an expert ATS Resume Writer. Tailor the candidate's existing profile summary to emphasize relevant real strengths for the target role in ${langLabel}.
STRICT RULES:
1. Keep 2 to 4 concise sentences without first-person pronouns ("I", "Saya", "Aku").
2. NEVER fabricate years of experience, companies, GPA, tools, or metrics not already present in the original summary or matched facts.
3. Return ONLY the rewritten summary paragraph, with no quotes or prefix labels.`;

  const userPrompt = `Target Role: ${params.jobTitle || "-"} ${params.companyName ? `at ${params.companyName}` : ""}
Verified Matching Qualifications on Candidate CV: ${params.matchedKeywords.slice(0, 10).join(", ") || "-"}
Candidate Headline: ${params.headline || "-"}
Original Summary: ${params.summary}`;

  const raw = await runLocalChatCompletion(
    config,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    { temperature: 0.25, maxTokens: 260 }
  );

  const cleaned = stripWrapperQuotes(raw);
  if (!cleaned || cleaned.length < 25) {
    throw new Error("Ringkasan dari model terlalu pendek. Coba jalankan kembali.");
  }
  return cleaned;
};

const translateTextWithModel = async (
  config: ActiveLocalAiConfig,
  text: string,
  targetLang: "id" | "en"
): Promise<string> => {
  const clean = text.trim();
  if (!clean) return text;

  const targetName = targetLang === "en" ? "natural, ATS-industry English" : "Bahasa Indonesia baku standar ATS";
  const systemPrompt = `You are a professional ATS CV translator. Translate the input text to ${targetName}. Keep all technical terms (frameworks, programming languages, SQL, API, HTML, CSS), company/university names, numbers, and dates exact. Return ONLY the translated text without quotes or explanations.`;

  const raw = await runLocalChatCompletion(
    config,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: clean }
    ],
    { temperature: 0.15, maxTokens: 280 }
  );

  const cleaned = stripWrapperQuotes(raw);
  return cleaned.length >= 3 ? cleaned : clean;
};

const translateBulletsChunk = async (
  config: ActiveLocalAiConfig,
  bullets: string[],
  fallbackBullets: string[],
  targetLang: "id" | "en"
): Promise<string[]> => {
  const nonEmptyIndices: number[] = [];
  bullets.forEach((b, idx) => {
    if (b.trim()) nonEmptyIndices.push(idx);
  });
  if (!nonEmptyIndices.length) return bullets;

  const targetName = targetLang === "en" ? "natural, ATS-industry English" : "Bahasa Indonesia baku standar ATS";
  const numberedInput = nonEmptyIndices
    .map((idx, pos) => `[${pos}] ${bullets[idx].trim()}`)
    .join("\n");

  try {
    const raw = await runLocalChatCompletion(
      config,
      [
        {
          role: "system",
          content: `Translate each numbered CV bullet point to ${targetName}. Keep exact [0], [1], ... prefixes on separate lines. Preserve all technical stack names, metrics, and numbers. Return ONLY the numbered lines.`
        },
        { role: "user", content: numberedInput }
      ],
      { temperature: 0.15, maxTokens: Math.min(700, 140 * nonEmptyIndices.length) }
    );

    const parsedMap = new Map<number, string>();
    for (const line of raw.split(/\r?\n/)) {
      const m = line.trim().match(/^\[(\d+)\]\s*(.+)$/);
      if (m) {
        parsedMap.set(Number(m[1]), stripWrapperQuotes(m[2]));
      }
    }

    if (parsedMap.size >= Math.ceil(nonEmptyIndices.length / 2)) {
      const result = [...fallbackBullets];
      nonEmptyIndices.forEach((origIdx, pos) => {
        const translated = parsedMap.get(pos);
        if (translated && translated.length >= 5) {
          result[origIdx] = translated;
        }
      });
      return result;
    }
  } catch {
    // Gunakan baseline deterministik jika chunk gagal
  }

  return fallbackBullets;
};

export const translateProfileWithLocalAi = async (
  config: ActiveLocalAiConfig,
  resume: ResumeProfile,
  targetLang: "id" | "en",
  onProgress?: (statusText: string) => void
): Promise<ResumeProfile> => {
  const baseline = translateProfileDeterministic(resume, targetLang);
  const translateShortFallback = (txt: string, fallback: string) =>
    txt.trim() ? fallback : txt;

  onProgress?.("Menerjemahkan ringkasan & profil...");
  let headline = baseline.contact.headline ?? "";
  if (resume.contact.headline?.trim()) {
    try {
      headline = await translateTextWithModel(config, resume.contact.headline, targetLang);
    } catch {
      headline = translateShortFallback(
        resume.contact.headline,
        targetLang === "en"
          ? translateFieldToEnglish(resume.contact.headline, "prose")
          : translateFieldToIndonesian(resume.contact.headline, "prose")
      );
    }
  }

  let summary = baseline.summary;
  if (resume.summary.trim()) {
    try {
      summary = await translateTextWithModel(config, resume.summary, targetLang);
    } catch {
      summary = baseline.summary;
    }
  }

  const workExperience = [...baseline.workExperience];
  for (let i = 0; i < (resume.workExperience ?? []).length; i += 1) {
    const src = resume.workExperience[i];
    const base = baseline.workExperience[i];
    onProgress?.(`Menerjemahkan pengalaman kerja ${i + 1}/${resume.workExperience.length}...`);
    const bullets = await translateBulletsChunk(
      config,
      src.bulletPoints ?? [],
      base.bulletPoints ?? [],
      targetLang
    );
    workExperience[i] = { ...base, bulletPoints: bullets };
  }

  const projects = [...baseline.projects];
  for (let i = 0; i < (resume.projects ?? []).length; i += 1) {
    const src = resume.projects[i];
    const base = baseline.projects[i];
    onProgress?.(`Menerjemahkan proyek ${i + 1}/${resume.projects.length}...`);
    const bullets = await translateBulletsChunk(
      config,
      src.bulletPoints ?? [],
      base.bulletPoints ?? [],
      targetLang
    );
    projects[i] = { ...base, bulletPoints: bullets };
  }

  const organizations = [...baseline.organizations];
  for (let i = 0; i < (resume.organizations ?? []).length; i += 1) {
    const src = resume.organizations[i];
    const base = baseline.organizations[i];
    onProgress?.(`Menerjemahkan organisasi ${i + 1}/${resume.organizations.length}...`);
    const bullets = await translateBulletsChunk(
      config,
      src.bulletPoints ?? [],
      base.bulletPoints ?? [],
      targetLang
    );
    organizations[i] = { ...base, bulletPoints: bullets };
  }

  onProgress?.("Menyelesaikan penyesuaian akhir...");
  return {
    ...baseline,
    contact: {
      ...resume.contact,
      headline
    },
    summary,
    workExperience,
    projects,
    organizations
  };
};

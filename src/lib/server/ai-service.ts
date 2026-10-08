import type { ExtractedKeywords, JobTarget, MatchAnalytics, ResumeProfile, RewriteSuggestion } from "@/types/resume";
import { buildAnalysis, extractKeywords } from "@/lib/analyzer";
import { createId } from "@/lib/defaults";

export type AnalysisProvider = "gemini" | "openrouter" | "deterministic";

export type AiAnalysisResult = {
  enrichedJob: JobTarget;
  analytics: MatchAnalytics;
  suggestions: RewriteSuggestion[];
  provider: AnalysisProvider;
};

export type AiRewriteResult = {
  suggestion: string;
  note: string;
  keywordsUsed: string[];
  provider: AnalysisProvider;
};

/**
 * Call Google Gemini REST API with structured prompt and strict timeouts.
 */
const callGemini = async (prompt: string, apiKey: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        }),
        signal: AbortSignal.timeout(12000)
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof candidateText === "string" ? candidateText : null;
  } catch {
    return null;
  }
};

/**
 * Call OpenRouter REST API with structured JSON response.
 */
const callOpenRouter = async (prompt: string, apiKey: string): Promise<string | null> => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://quicktailor.cv",
        "X-Title": "QuickTailor CV"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
};

/**
 * Perform hybrid analysis of Job Target & Resume Profile.
 * Uses AI LLM if keys are available, otherwise falls back gracefully to deterministic engine.
 */
export const runJobAnalysis = async (resume: ResumeProfile, job: JobTarget): Promise<AiAnalysisResult> => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  // If AI keys exist, attempt enhanced AI keyword extraction
  if (geminiKey || openRouterKey) {
    const prompt = `Anda adalah sistem ATS Parser profesional untuk lowongan kerja Indonesia.
Tugas: Ekstraksi kata kunci penting dari iklan lowongan kerja di bawah ini.

ATURAN KETAT:
1. Hanya ambil kata kunci yang benar-benar tertulis atau disyaratkan dalam teks.
2. Pisahkan ke dalam 3 kategori:
   - requiredHardSkills: keahlian teknis, tools, software, bahasa pemrograman, sertifikasi.
   - domainKeywords: bidang kerja, proses bisnis, metodologi, tanggung jawab industri.
   - softSkills: keterampilan komunikasi, kepemimpinan, pemecahan masalah, adaptabilitas.
3. Berikan output HANYA dalam JSON format persis seperti ini:
{
  "requiredHardSkills": ["string"],
  "domainKeywords": ["string"],
  "softSkills": ["string"]
}

<job_description>
${job.rawDescription.slice(0, 10000)}
</job_description>`;

    let aiRawJson: string | null = null;
    let provider: AnalysisProvider = "deterministic";

    if (geminiKey) {
      aiRawJson = await callGemini(prompt, geminiKey);
      if (aiRawJson) provider = "gemini";
    }

    if (!aiRawJson && openRouterKey) {
      aiRawJson = await callOpenRouter(prompt, openRouterKey);
      if (aiRawJson) provider = "openrouter";
    }

    if (aiRawJson) {
      try {
        const parsed = JSON.parse(aiRawJson) as Partial<ExtractedKeywords>;
        if (
          Array.isArray(parsed.requiredHardSkills) &&
          Array.isArray(parsed.domainKeywords) &&
          Array.isArray(parsed.softSkills)
        ) {
          // Merge AI extraction with deterministic fallback dictionary for completeness
          const localKeywords = extractKeywords(job.rawDescription);
          const mergedJob: JobTarget = {
            ...job,
            extractedKeywords: {
              requiredHardSkills: Array.from(new Set([...parsed.requiredHardSkills, ...localKeywords.requiredHardSkills])).slice(0, 30),
              domainKeywords: Array.from(new Set([...parsed.domainKeywords, ...localKeywords.domainKeywords])).slice(0, 20),
              softSkills: Array.from(new Set([...parsed.softSkills, ...localKeywords.softSkills])).slice(0, 15)
            }
          };

          const analysis = buildAnalysis(resume, mergedJob);
          return {
            enrichedJob: mergedJob,
            analytics: analysis.analytics,
            suggestions: analysis.suggestions,
            provider
          };
        }
      } catch {
        // Parsing failure falls through to deterministic fallback
      }
    }
  }

  // Deterministic local engine fallback (reliable, instantaneous, zero cost)
  const localAnalysis = buildAnalysis(resume, job);
  return {
    enrichedJob: localAnalysis.enrichedJob,
    analytics: localAnalysis.analytics,
    suggestions: localAnalysis.suggestions,
    provider: "deterministic"
  };
};

/**
 * Rewrite single bullet point using Google XYZ / STAR format with strict anti-hallucination guardrails.
 */
export const rewriteBulletPoint = async (
  bullet: string,
  role?: string,
  jobTitle?: string,
  targetKeywords?: string[]
): Promise<AiRewriteResult> => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (geminiKey || openRouterKey) {
    const prompt = `Anda adalah pakar penulisan resume profesional dan spesialis format ATS Indonesia.
Tugas: Rekonstruksi poin pengalaman kerja berikut dengan formula Google XYZ (Accomplished [X] measured by [Y] by doing [Z]) dan STAR method.

PANDUAN KESELAMATAN & ANTI-HALUSINASI (SANGAT KETAT):
1. DILARANG MENGARANG data, angka metrik fiktif, alat baru, atau klaim pencapaian yang tidak ada pada kalimat asli.
2. Jika kalimat asli tidak memiliki angka metrik, jangan mengarang angka! Sebaliknya, berikan struktur tindakan yang kuat dan tambahkan catatan sopan kepada pengguna untuk melengkapi metriknya.
3. Mulai dengan kata kerja aksi aktif Bahasa Indonesia yang kuat (contoh: Mengembangkan, Mengoptimalkan, Menyusun, dsb.).
4. Hindari pembuka pasif seperti "Bertanggung jawab untuk" atau "Membantu dalam".
5. Target peran: "${role || jobTitle || "Profesional"}".
6. Kata kunci target yang relevan: ${(targetKeywords ?? []).join(", ") || "sesuai konteks"}.

Berikan output HANYA dalam JSON format persis seperti ini:
{
  "suggestion": "Kalimat hasil restrukturisasi",
  "note": "Catatan ringkas panduan atau instruksi untuk pengguna",
  "keywordsUsed": ["kata kunci yang berhasil disematkan"]
}

<original_bullet>
${bullet}
</original_bullet>`;

    let aiRawJson: string | null = null;
    let provider: AnalysisProvider = "deterministic";

    if (geminiKey) {
      aiRawJson = await callGemini(prompt, geminiKey);
      if (aiRawJson) provider = "gemini";
    }

    if (!aiRawJson && openRouterKey) {
      aiRawJson = await callOpenRouter(prompt, openRouterKey);
      if (aiRawJson) provider = "openrouter";
    }

    if (aiRawJson) {
      try {
        const parsed = JSON.parse(aiRawJson);
        if (typeof parsed.suggestion === "string" && parsed.suggestion.trim()) {
          return {
            suggestion: parsed.suggestion.trim(),
            note: typeof parsed.note === "string" ? parsed.note : "Disusun dengan pola Google XYZ.",
            keywordsUsed: Array.isArray(parsed.keywordsUsed) ? parsed.keywordsUsed : [],
            provider
          };
        }
      } catch {
        // Parsing failure falls through to deterministic
      }
    }
  }

  // Deterministic fallback using existing local engine
  const dummyResume: ResumeProfile = {
    contact: { fullName: "", email: "", phone: "", location: "", linkedinUrl: "", portfolioUrl: "" },
    summary: "",
    workExperience: [
      {
        id: "temp",
        company: "Temp",
        role: role || "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        bulletPoints: [bullet]
      }
    ],
    education: [],
    skills: { hardSkills: [], softSkills: [], tools: [] }
  };

  const dummyJob: JobTarget = {
    jobTitle: jobTitle || "",
    companyName: "",
    rawDescription: (targetKeywords ?? []).join(" "),
    extractedKeywords: {
      requiredHardSkills: targetKeywords ?? [],
      domainKeywords: [],
      softSkills: []
    }
  };

  const analysis = buildAnalysis(dummyResume, dummyJob);
  const matched = analysis.suggestions[0];

  if (matched) {
    return {
      suggestion: matched.suggestion,
      note: matched.note || "Disusun ulang dengan struktur kata kerja aktif.",
      keywordsUsed: matched.keywordsUsed,
      provider: "deterministic"
    };
  }

  return {
    suggestion: bullet,
    note: "Kalimat sudah memiliki susunan yang baik.",
    keywordsUsed: [],
    provider: "deterministic"
  };
};

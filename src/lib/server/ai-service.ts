import type {
  JobTarget,
  MatchAnalytics,
  NormalizedJobQualifications,
  ResumeProfile,
  RewriteSuggestion
} from "@/types/resume";
import {
  analyzeMatch,
  buildAnalysis,
  generateRewriteSuggestions,
  normalizeJobDescription,
  toLegacyExtractedKeywords
} from "@/lib/analyzer";
import { ADMIN_RULES } from "@/lib/ats/taxonomy";
import { translateProfileToEnglish } from "@/lib/ats/translator";
import { unique } from "@/lib/text";

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

const callGemini = async (prompt: string, apiKey: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
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

const callOpenRouter = async (prompt: string, apiKey: string): Promise<string | null> => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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

const isAdministrativeNoise = (term: string): boolean =>
  ADMIN_RULES.some((rule) => rule.pattern.test(term));

/**
 * Analisis hybrid opsional.
 * Secara bawaan seluruh proses berjalan deterministik; jika API key AI dikonfigurasi di server,
 * AI hanya dipakai untuk memperkaya ekstraksi kualifikasi (tanpa membaca data pribadi) dan tidak pernah menimpa isolasi syarat administratif.
 */
export const runJobAnalysis = async (resume: ResumeProfile, job: JobTarget): Promise<AiAnalysisResult> => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (geminiKey || openRouterKey) {
    const prompt = `Anda adalah sistem ATS Parser profesional untuk lowongan kerja Indonesia dan internasional.
Tugas: Ekstraksi kualifikasi dari iklan lowongan kerja di bawah ini ke dalam format JSON terstruktur.

ATURAN KETAT:
1. Pisahkan syarat berkas/administrasi (KTP, KK, SKCK, NPWP, FC Ijazah, Transkrip, Pas Foto, usia, gender, tinggi badan, domisili, SIM, status pernikahan) ke dalam "administrative_requirements" dan JANGAN masukkan ke hard skills.
2. "explicit_hard_skills_and_tools": hanya skill teknis, software, tools, metodologi, atau sertifikasi yang disebut langsung di teks.
3. "soft_skills_and_work_traits": sikap/karakter kerja (komunikasi, kerja tim, teliti, cekatan).
4. Jangan mengarang kualifikasi yang tidak tertulis.
5. Kembalikan HANYA JSON valid:
{
  "explicit_hard_skills_and_tools": ["string"],
  "soft_skills_and_work_traits": ["string"]
}

<job_title>${job.jobTitle || ""}</job_title>
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
        const parsed = JSON.parse(aiRawJson) as {
          explicit_hard_skills_and_tools?: unknown;
          soft_skills_and_work_traits?: unknown;
        };

        const localNorm = normalizeJobDescription(job.rawDescription, job.jobTitle);
        const aiHard = Array.isArray(parsed.explicit_hard_skills_and_tools)
          ? parsed.explicit_hard_skills_and_tools
              .filter((v): v is string => typeof v === "string" && v.trim().length > 1)
              .filter((v) => !isAdministrativeNoise(v))
          : [];
        const aiSoft = Array.isArray(parsed.soft_skills_and_work_traits)
          ? parsed.soft_skills_and_work_traits
              .filter((v): v is string => typeof v === "string" && v.trim().length > 1)
              .filter((v) => !isAdministrativeNoise(v))
          : [];

        const mergedNorm: NormalizedJobQualifications = {
          ...localNorm,
          explicit_hard_skills_and_tools: unique([
            ...localNorm.explicit_hard_skills_and_tools,
            ...aiHard
          ]).slice(0, 30),
          soft_skills_and_work_traits: unique([
            ...localNorm.soft_skills_and_work_traits,
            ...aiSoft
          ]).slice(0, 14)
        };

        const mergedJob: JobTarget = {
          ...job,
          normalized: mergedNorm,
          extractedKeywords: toLegacyExtractedKeywords(mergedNorm)
        };

        // Hitung match langsung memakai mergedJob tanpa menimpa ulang hasil AI
        const analytics = analyzeMatch(resume, mergedJob);
        const suggestions = generateRewriteSuggestions(resume, analytics);

        return {
          enrichedJob: mergedJob,
          analytics,
          suggestions,
          provider
        };
      } catch {
        // Lanjut ke engine deterministik lokal
      }
    }
  }

  const localAnalysis = buildAnalysis(resume, job);
  return {
    enrichedJob: localAnalysis.enrichedJob,
    analytics: localAnalysis.analytics,
    suggestions: localAnalysis.suggestions,
    provider: "deterministic"
  };
};

export const rewriteBulletPoint = async (
  bullet: string,
  role?: string,
  jobTitle?: string,
  targetKeywords?: string[]
): Promise<AiRewriteResult> => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (geminiKey || openRouterKey) {
    const prompt = `Anda adalah pakar penulisan resume profesional untuk fresh graduate maupun kandidat berpengalaman di Indonesia.
Tugas: Susun ulang poin pengalaman/proyek/organisasi berikut memakai formula Google XYZ / STAR.

ATURAN ANTI-HALUSINASI (WAJIB):
1. DILARANG mengarang angka, metrik, alat baru, atau pencapaian yang tidak tertulis di kalimat asli.
2. Jika kalimat asli tidak punya angka, jangan mengarang angka. Berikan saran kalimat aktif yang kuat lalu tulis catatan agar pengguna melengkapi angka jika datanya memang ada.
3. Mulai dengan kata kerja aksi aktif yang kuat dan hapus pembuka pasif seperti "Bertanggung jawab untuk" atau "Membantu dalam".
4. Konteks peran: "${role || jobTitle || "Pelamar"}".
5. Kata kunci relevan yang bisa dipertahankan jika memang sesuai: ${(targetKeywords ?? []).join(", ") || "sesuai kalimat asli"}.

Berikan output HANYA JSON:
{
  "suggestion": "Kalimat hasil restrukturisasi",
  "note": "Catatan singkat panduan",
  "keywordsUsed": ["kata kunci yang ada di kalimat"]
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
        // Fallback deterministik lokal
      }
    }
  }

  const dummyResume: ResumeProfile = {
    experienceLevel: "fresh_graduate",
    contact: { fullName: "", email: "", phone: "", location: "", linkedinUrl: "", portfolioUrl: "" },
    summary: "",
    workExperience: [
      {
        id: "temp",
        company: "",
        role: role || "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        bulletPoints: [bullet]
      }
    ],
    education: [],
    projects: [],
    organizations: [],
    certificationItems: [],
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
      note: matched.note || "Disusun ulang dengan struktur kata kerja aksi.",
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

export type AiTranslateResult = {
  profile: ResumeProfile;
  provider: AnalysisProvider;
};

/**
 * Menerjemahkan konten CV ke bahasa Inggris berstandar industri ATS (tanpa PII).
 * Jika API key AI tersedia, memoles terjemahan JSON dengan aturan anti-halusinasi;
 * jika tidak, langsung menggunakan translator deterministik lokal.
 */
export const translateResumeWithAi = async (resume: ResumeProfile): Promise<AiTranslateResult> => {
  const baseline = translateProfileToEnglish(resume);
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();

  if (geminiKey || openRouterKey) {
    const payloadToTranslate = {
      headline: resume.contact?.headline ?? "",
      summary: resume.summary ?? "",
      workExperience: (resume.workExperience ?? []).map((item) => ({
        id: item.id,
        role: item.role,
        company: item.company,
        startDate: item.startDate,
        endDate: item.endDate,
        bulletPoints: item.bulletPoints
      })),
      education: (resume.education ?? []).map((item) => ({
        id: item.id,
        degree: item.degree,
        fieldOfStudy: item.fieldOfStudy,
        graduationDate: item.graduationDate,
        thesisTitle: item.thesisTitle ?? "",
        relevantCoursework: item.relevantCoursework ?? [],
        achievements: item.achievements ?? ""
      })),
      projects: (resume.projects ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        role: item.role,
        context: item.context,
        period: item.period,
        technologies: item.technologies,
        bulletPoints: item.bulletPoints
      })),
      organizations: (resume.organizations ?? []).map((item) => ({
        id: item.id,
        organization: item.organization,
        role: item.role,
        period: item.period,
        bulletPoints: item.bulletPoints
      })),
      certificationItems: (resume.certificationItems ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        year: item.year
      })),
      skills: resume.skills
    };

    const prompt = `You are an expert ATS Resume Writer & Indonesian-to-English Career Translator.
Task: Translate all Indonesian resume content below into crisp, natural, ATS-industry standard English.

STRICT GUARDRAILS:
1. NEVER invent or alter numbers, percentages, metrics, dates, company/university proper names, or skills.
2. Keep exact array lengths and "id" values matching the input JSON.
3. Start bullets with strong past/present ATS action verbs (Developed, Built, Managed, Coordinated, Configured, Analyzed, etc.).
4. Use standard English academic/industry terms (e.g. Informatics Engineering, Undergraduate Thesis Project, Bachelor's Degree, Present).
5. Return ONLY valid JSON with the exact same keys as input:
${JSON.stringify(payloadToTranslate)}`;

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
        const mergeById = <T extends { id: string }>(orig: T[], incoming: unknown, apply: (o: T, inc: Record<string, unknown>) => T): T[] => {
          if (!Array.isArray(incoming)) return orig;
          return orig.map((o, idx) => {
            const match = incoming.find((x) => x && typeof x === "object" && (x as { id?: string }).id === o.id) ?? incoming[idx];
            return match && typeof match === "object" ? apply(o, match as Record<string, unknown>) : o;
          });
        };

        const merged: ResumeProfile = {
          ...baseline,
          contact: {
            ...resume.contact,
            headline: typeof parsed.headline === "string" ? parsed.headline.trim() : baseline.contact.headline
          },
          summary: typeof parsed.summary === "string" ? parsed.summary.trim() : baseline.summary,
          workExperience: mergeById(baseline.workExperience, parsed.workExperience, (o, inc) => ({
            ...o,
            role: typeof inc.role === "string" ? inc.role : o.role,
            company: typeof inc.company === "string" ? inc.company : o.company,
            startDate: typeof inc.startDate === "string" ? inc.startDate : o.startDate,
            endDate: typeof inc.endDate === "string" ? inc.endDate : o.endDate,
            bulletPoints: Array.isArray(inc.bulletPoints)
              ? inc.bulletPoints.map((b, i) => (typeof b === "string" ? b : o.bulletPoints[i] ?? ""))
              : o.bulletPoints
          })),
          education: mergeById(baseline.education, parsed.education, (o, inc) => ({
            ...o,
            degree: typeof inc.degree === "string" ? inc.degree : o.degree,
            fieldOfStudy: typeof inc.fieldOfStudy === "string" ? inc.fieldOfStudy : o.fieldOfStudy,
            graduationDate: typeof inc.graduationDate === "string" ? inc.graduationDate : o.graduationDate,
            thesisTitle: typeof inc.thesisTitle === "string" ? inc.thesisTitle : o.thesisTitle,
            relevantCoursework: Array.isArray(inc.relevantCoursework)
              ? inc.relevantCoursework.filter((c): c is string => typeof c === "string")
              : o.relevantCoursework,
            achievements: typeof inc.achievements === "string" ? inc.achievements : o.achievements
          })),
          projects: mergeById(baseline.projects, parsed.projects, (o, inc) => ({
            ...o,
            name: typeof inc.name === "string" ? inc.name : o.name,
            role: typeof inc.role === "string" ? inc.role : o.role,
            context: typeof inc.context === "string" ? inc.context : o.context,
            period: typeof inc.period === "string" ? inc.period : o.period,
            technologies: Array.isArray(inc.technologies)
              ? inc.technologies.filter((t): t is string => typeof t === "string")
              : o.technologies,
            bulletPoints: Array.isArray(inc.bulletPoints)
              ? inc.bulletPoints.map((b, i) => (typeof b === "string" ? b : o.bulletPoints[i] ?? ""))
              : o.bulletPoints
          })),
          organizations: mergeById(baseline.organizations, parsed.organizations, (o, inc) => ({
            ...o,
            organization: typeof inc.organization === "string" ? inc.organization : o.organization,
            role: typeof inc.role === "string" ? inc.role : o.role,
            period: typeof inc.period === "string" ? inc.period : o.period,
            bulletPoints: Array.isArray(inc.bulletPoints)
              ? inc.bulletPoints.map((b, i) => (typeof b === "string" ? b : o.bulletPoints[i] ?? ""))
              : o.bulletPoints
          })),
          certificationItems: mergeById(baseline.certificationItems, parsed.certificationItems, (o, inc) => ({
            ...o,
            name: typeof inc.name === "string" ? inc.name : o.name,
            year: typeof inc.year === "string" ? inc.year : o.year
          })),
          skills:
            parsed.skills && typeof parsed.skills === "object"
              ? {
                  hardSkills: Array.isArray(parsed.skills.hardSkills) ? parsed.skills.hardSkills : baseline.skills.hardSkills,
                  tools: Array.isArray(parsed.skills.tools) ? parsed.skills.tools : baseline.skills.tools,
                  softSkills: Array.isArray(parsed.skills.softSkills) ? parsed.skills.softSkills : baseline.skills.softSkills
                }
              : baseline.skills
        };

        return { profile: merged, provider };
      } catch {
        // Fall through to deterministic translator
      }
    }
  }

  return { profile: baseline, provider: "deterministic" };
};

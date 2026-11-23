import type { ResumeProfile } from "@/types/resume";
import { translateProfileDeterministic } from "@/lib/ats/translator";
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
      ? "Disusun ulang oleh AI selaras lowongan Langkah 2 dengan mempertahankan data aslimu."
      : "Disusun ulang oleh AI. Jika ada angka atau cakupan nyata dari pengalamanmu, kamu bisa menambahkannya manual."
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
    { temperature: 0.15, maxTokens: 320 }
  );

  const cleaned = stripWrapperQuotes(raw);
  return cleaned.length >= 2 ? cleaned : clean;
};

const translateIndexedChunk = async (
  config: ActiveLocalAiConfig,
  sources: string[],
  fallbacks: string[],
  targetLang: "id" | "en"
): Promise<string[]> => {
  const nonEmptyIndices: number[] = [];
  sources.forEach((b, idx) => {
    if (b.trim()) nonEmptyIndices.push(idx);
  });
  if (!nonEmptyIndices.length) return sources;

  const targetName = targetLang === "en" ? "natural, ATS-industry English" : "Bahasa Indonesia baku standar ATS";
  const result = [...fallbacks];
  const CHUNK_SIZE = 10;

  for (let start = 0; start < nonEmptyIndices.length; start += CHUNK_SIZE) {
    const slice = nonEmptyIndices.slice(start, start + CHUNK_SIZE);
    const numberedInput = slice
      .map((idx, pos) => `[${pos}] ${sources[idx].replace(/\s*\r?\n\s*/g, " ").trim()}`)
      .join("\n");

    try {
      const raw = await runLocalChatCompletion(
        config,
        [
          {
            role: "system",
            content: `Translate each numbered CV entry to ${targetName}. Keep exact [0], [1], ... prefixes on separate lines. Preserve all proper organization/university names, technical stack names, numbers, and metrics. Return ONLY the numbered lines.`
          },
          { role: "user", content: numberedInput }
        ],
        { temperature: 0.15, maxTokens: Math.min(900, 140 * slice.length) }
      );

      const parsedMap = new Map<number, string>();
      for (const line of raw.split(/\r?\n/)) {
        const m = line.trim().match(/^\[(\d+)\]\s*(.+)$/);
        if (m) {
          parsedMap.set(Number(m[1]), stripWrapperQuotes(m[2]));
        }
      }

      if (parsedMap.size >= Math.ceil(slice.length / 2)) {
        slice.forEach((origIdx, pos) => {
          const translated = parsedMap.get(pos);
          if (translated && translated.length >= 2) {
            result[origIdx] = translated;
          }
        });
      }
    } catch {
      // Gunakan baseline deterministik jika chunk gagal
    }
  }

  return result;
};

/**
 * Menerjemahkan seluruh bagian prosais CV secara menyeluruh menggunakan model AI aktif,
 * dengan baseline deterministik sebagai pengaman anti-gagal di tiap kolom.
 */
export const translateProfileWithLocalAi = async (
  config: ActiveLocalAiConfig,
  resume: ResumeProfile,
  targetLang: "id" | "en",
  onProgress?: (statusText: string) => void
): Promise<ResumeProfile> => {
  const baseline = translateProfileDeterministic(resume, targetLang);

  onProgress?.("Menerjemahkan ringkasan & profil...");
  let headline = baseline.contact.headline ?? "";
  if (resume.contact.headline?.trim()) {
    try {
      headline = await translateTextWithModel(config, resume.contact.headline, targetLang);
    } catch {
      headline = baseline.contact.headline ?? "";
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

  onProgress?.("Menerjemahkan peran, pendidikan, judul proyek & sertifikasi...");
  type MetadataSetter = {
    source: string;
    fallback: string;
    apply: (val: string) => void;
  };
  const metaTasks: MetadataSetter[] = [];

  const workExperience = baseline.workExperience.map((item) => ({ ...item }));
  (resume.workExperience ?? []).forEach((src, i) => {
    if (src.role.trim()) {
      metaTasks.push({
        source: src.role,
        fallback: workExperience[i].role,
        apply: (val) => {
          workExperience[i].role = val;
        }
      });
    }
  });

  const education = baseline.education.map((item) => ({ ...item }));
  (resume.education ?? []).forEach((src, i) => {
    if (src.degree.trim()) {
      metaTasks.push({
        source: src.degree,
        fallback: education[i].degree,
        apply: (val) => {
          education[i].degree = val;
        }
      });
    }
    if (src.fieldOfStudy.trim()) {
      metaTasks.push({
        source: src.fieldOfStudy,
        fallback: education[i].fieldOfStudy,
        apply: (val) => {
          education[i].fieldOfStudy = val;
        }
      });
    }
    if (src.thesisTitle?.trim()) {
      metaTasks.push({
        source: src.thesisTitle,
        fallback: education[i].thesisTitle ?? src.thesisTitle,
        apply: (val) => {
          education[i].thesisTitle = val;
        }
      });
    }
    if (src.achievements?.trim()) {
      metaTasks.push({
        source: src.achievements,
        fallback: education[i].achievements ?? src.achievements,
        apply: (val) => {
          education[i].achievements = val;
        }
      });
    }
    (src.relevantCoursework ?? []).forEach((cw, cIdx) => {
      if (cw.trim()) {
        metaTasks.push({
          source: cw,
          fallback: education[i].relevantCoursework?.[cIdx] ?? cw,
          apply: (val) => {
            const next = [...(education[i].relevantCoursework ?? [])];
            next[cIdx] = val;
            education[i].relevantCoursework = next;
          }
        });
      }
    });
  });

  const projects = baseline.projects.map((item) => ({ ...item }));
  (resume.projects ?? []).forEach((src, i) => {
    if (src.name.trim()) {
      metaTasks.push({
        source: src.name,
        fallback: projects[i].name,
        apply: (val) => {
          projects[i].name = val;
        }
      });
    }
    if (src.role.trim()) {
      metaTasks.push({
        source: src.role,
        fallback: projects[i].role,
        apply: (val) => {
          projects[i].role = val;
        }
      });
    }
    if (src.context.trim()) {
      metaTasks.push({
        source: src.context,
        fallback: projects[i].context,
        apply: (val) => {
          projects[i].context = val;
        }
      });
    }
  });

  const organizations = baseline.organizations.map((item) => ({ ...item }));
  (resume.organizations ?? []).forEach((src, i) => {
    if (src.role.trim()) {
      metaTasks.push({
        source: src.role,
        fallback: organizations[i].role,
        apply: (val) => {
          organizations[i].role = val;
        }
      });
    }
  });

  const certificationItems = baseline.certificationItems.map((item) => ({ ...item }));
  (resume.certificationItems ?? []).forEach((src, i) => {
    if (src.name.trim()) {
      metaTasks.push({
        source: src.name,
        fallback: certificationItems[i].name,
        apply: (val) => {
          certificationItems[i].name = val;
        }
      });
    }
  });

  const skills = {
    ...baseline.skills,
    groups: (baseline.skills.groups ?? []).map((g) => ({ ...g }))
  };
  (resume.skills.groups ?? []).forEach((srcGrp, i) => {
    if (srcGrp.category.trim() && skills.groups[i]) {
      metaTasks.push({
        source: srcGrp.category,
        fallback: skills.groups[i].category,
        apply: (val) => {
          skills.groups[i].category = val;
        }
      });
    }
  });

  if (metaTasks.length > 0) {
    const metaResults = await translateIndexedChunk(
      config,
      metaTasks.map((t) => t.source),
      metaTasks.map((t) => t.fallback),
      targetLang
    );
    metaTasks.forEach((t, idx) => t.apply(metaResults[idx]));
  }

  for (let i = 0; i < (resume.workExperience ?? []).length; i += 1) {
    const src = resume.workExperience[i];
    const base = workExperience[i];
    onProgress?.(`Menerjemahkan pengalaman kerja ${i + 1}/${resume.workExperience.length}...`);
    const bullets = await translateIndexedChunk(
      config,
      src.bulletPoints ?? [],
      base.bulletPoints ?? [],
      targetLang
    );
    workExperience[i] = { ...base, bulletPoints: bullets };
  }

  for (let i = 0; i < (resume.projects ?? []).length; i += 1) {
    const src = resume.projects[i];
    const base = projects[i];
    onProgress?.(`Menerjemahkan proyek ${i + 1}/${resume.projects.length}...`);
    const bullets = await translateIndexedChunk(
      config,
      src.bulletPoints ?? [],
      base.bulletPoints ?? [],
      targetLang
    );
    projects[i] = { ...base, bulletPoints: bullets };
  }

  for (let i = 0; i < (resume.organizations ?? []).length; i += 1) {
    const src = resume.organizations[i];
    const base = organizations[i];
    onProgress?.(`Menerjemahkan organisasi ${i + 1}/${resume.organizations.length}...`);
    const bullets = await translateIndexedChunk(
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
    education,
    projects,
    organizations,
    certificationItems,
    skills
  };
};

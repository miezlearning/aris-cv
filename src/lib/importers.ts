import type { ResumeProfile } from "@/types/resume";
import { createId, emptyResumeProfile } from "@/lib/defaults";
import { splitList } from "@/lib/text";

const firstValue = (...values: Array<unknown>) => values.find((value) => typeof value === "string" && value.trim()) as string | undefined;

export const parseResumeInput = (raw: string): { profile: ResumeProfile; message: string } => {
  const value = raw.trim();
  if (!value) {
    return { profile: emptyResumeProfile(), message: "Belum ada teks yang ditempel." };
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed.resumeProfile) {
      return { profile: normalizeProfile(parsed.resumeProfile), message: "Data dari berkas QuickTailor berhasil dimasukkan. Periksa hasilnya di formulir bawah." };
    }

    return { profile: fromJsonResume(parsed), message: "Data dari berkas JSON Resume berhasil dimasukkan. Periksa hasilnya di formulir bawah." };
  } catch {
    return {
      profile: fromStructuredText(value),
      message: "Teks CV kamu berhasil dipisah menjadi beberapa bagian. Periksa bagian pengalaman dan keahlian, karena pemisahan otomatis sering masih perlu dirapikan."
    };
  }
};

const normalizeProfile = (input: Partial<ResumeProfile>): ResumeProfile => {
  const empty = emptyResumeProfile();
  return {
    contact: { ...empty.contact, ...input.contact },
    summary: input.summary ?? "",
    workExperience: input.workExperience?.length
      ? input.workExperience.map((item) => ({
          id: item.id ?? createId(),
          company: item.company ?? "",
          role: item.role ?? "",
          startDate: item.startDate ?? "",
          endDate: item.endDate ?? "",
          isCurrent: Boolean(item.isCurrent),
          bulletPoints: item.bulletPoints?.length ? item.bulletPoints : [""]
        }))
      : empty.workExperience,
    education: input.education?.length
      ? input.education.map((item) => ({
          id: item.id ?? createId(),
          institution: item.institution ?? "",
          degree: item.degree ?? "",
          fieldOfStudy: item.fieldOfStudy ?? "",
          gpa: item.gpa ?? "",
          graduationDate: item.graduationDate ?? ""
        }))
      : empty.education,
    skills: {
      hardSkills: input.skills?.hardSkills ?? [],
      softSkills: input.skills?.softSkills ?? [],
      tools: input.skills?.tools ?? []
    }
  };
};

const fromJsonResume = (json: Record<string, any>): ResumeProfile => {
  const basics = json.basics ?? {};
  const profile = emptyResumeProfile();

  return {
    ...profile,
    contact: {
      fullName: basics.name ?? "",
      email: basics.email ?? "",
      phone: basics.phone ?? "",
      location: firstValue(basics.location?.city, basics.location?.address, basics.location?.region) ?? "",
      linkedinUrl: basics.profiles?.find((item: any) => String(item.network).toLowerCase().includes("linkedin"))?.url ?? "",
      portfolioUrl: basics.url ?? ""
    },
    summary: basics.summary ?? "",
    workExperience: Array.isArray(json.work) && json.work.length
      ? json.work.map((item: any) => ({
          id: createId(),
          company: item.name ?? item.company ?? "",
          role: item.position ?? "",
          startDate: toMonthYear(item.startDate),
          endDate: item.endDate ? toMonthYear(item.endDate) : "Present",
          isCurrent: !item.endDate,
          bulletPoints: item.highlights?.length ? item.highlights : [item.summary ?? ""]
        }))
      : profile.workExperience,
    education: Array.isArray(json.education) && json.education.length
      ? json.education.map((item: any) => ({
          id: createId(),
          institution: item.institution ?? "",
          degree: item.studyType ?? "",
          fieldOfStudy: item.area ?? "",
          gpa: item.score ?? "",
          graduationDate: item.endDate ? String(item.endDate).slice(0, 4) : ""
        }))
      : profile.education,
    skills: {
      hardSkills: Array.isArray(json.skills) ? json.skills.flatMap((skill: any) => skill.keywords ?? []).filter(Boolean) : [],
      softSkills: [],
      tools: []
    }
  };
};

const toMonthYear = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const fromStructuredText = (raw: string): ResumeProfile => {
  const profile = emptyResumeProfile();
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const email = joined.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = joined.match(/(?:\+62|0)[0-9\s-]{8,}/)?.[0] ?? "";
  const sections = splitIntoSections(lines);
  const skillLines = sections.skills.length ? sections.skills.join(", ") : "";

  return {
    ...profile,
    contact: {
      ...profile.contact,
      fullName: lines[0] && !lines[0].includes("@") ? lines[0] : "",
      email,
      phone
    },
    summary: sections.summary.join(" "),
    workExperience: sections.experience.length
      ? [
          {
            id: createId(),
            company: "",
            role: "",
            startDate: "",
            endDate: "Present",
            isCurrent: true,
            bulletPoints: sections.experience.map((line) => line.replace(/^[-•]\s*/, ""))
          }
        ]
      : profile.workExperience,
    education: sections.education.length
      ? [
          {
            id: createId(),
            institution: sections.education[0] ?? "",
            degree: sections.education[1] ?? "",
            fieldOfStudy: "",
            gpa: joined.match(/(?:IPK|GPA)\s*:?\s*([0-4](?:[.,]\d{1,2})?)/i)?.[1] ?? "",
            graduationDate: joined.match(/\b(20\d{2}|19\d{2})\b/)?.[0] ?? ""
          }
        ]
      : profile.education,
    skills: {
      hardSkills: splitList(skillLines),
      softSkills: [],
      tools: []
    }
  };
};

const splitIntoSections = (lines: string[]) => {
  const sections = {
    summary: [] as string[],
    experience: [] as string[],
    education: [] as string[],
    skills: [] as string[]
  };
  let current: keyof typeof sections = "summary";

  lines.forEach((line) => {
    const normalized = line.toLowerCase();
    if (/ringkasan|summary|profil/.test(normalized)) {
      current = "summary";
      return;
    }
    if (/pengalaman|experience|work/.test(normalized)) {
      current = "experience";
      return;
    }
    if (/pendidikan|education|kampus|universitas/.test(normalized)) {
      current = "education";
      return;
    }
    if (/skills|keahlian|keterampilan|tools/.test(normalized)) {
      current = "skills";
      return;
    }

    sections[current].push(line);
  });

  return sections;
};

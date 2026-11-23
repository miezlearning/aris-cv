import type { ResumeProfile } from "@/types/resume";
import { createId, emptyResumeProfile } from "@/lib/defaults";
import { splitList } from "@/lib/text";

const firstValue = (...values: Array<unknown>) =>
  values.find((value) => typeof value === "string" && value.trim()) as string | undefined;

export const parseResumeInput = (raw: string): { profile: ResumeProfile; message: string } => {
  const value = raw.trim();
  if (!value) {
    return { profile: emptyResumeProfile(), message: "Belum ada teks yang ditempel." };
  }

  try {
    const parsed = JSON.parse(value);

    if (parsed.resumeProfile) {
      return {
        profile: normalizeProfile(parsed.resumeProfile),
        message: "Data dari berkas QuickTailor berhasil dimasukkan. Periksa hasilnya di formulir di bawah."
      };
    }

    return {
      profile: fromJsonResume(parsed),
      message: "Data dari berkas JSON Resume berhasil dimasukkan. Periksa hasilnya di formulir di bawah."
    };
  } catch {
    return {
      profile: fromStructuredText(value),
      message:
        "Teks CV kamu berhasil dipisah menjadi beberapa bagian. Periksa bagian pengalaman, proyek, dan keahlian agar sesuai dengan data aslimu."
    };
  }
};

const normalizeProfile = (input: Partial<ResumeProfile>): ResumeProfile => {
  const empty = emptyResumeProfile();
  const workExperience = input.workExperience?.length
    ? input.workExperience.map((item) => ({
        id: item.id ?? createId(),
        company: item.company ?? "",
        role: item.role ?? "",
        type: item.type,
        location: item.location ?? "",
        startDate: item.startDate ?? "",
        endDate: item.endDate ?? "",
        isCurrent: Boolean(item.isCurrent),
        bulletPoints: item.bulletPoints?.length ? item.bulletPoints : [""]
      }))
    : [];

  return {
    experienceLevel: input.experienceLevel ?? (workExperience.length >= 2 ? "experienced" : "fresh_graduate"),
    contact: { ...empty.contact, ...input.contact },
    summary: input.summary ?? "",
    workExperience,
    education: input.education?.length
      ? input.education.map((item) => ({
          id: item.id ?? createId(),
          institution: item.institution ?? "",
          degree: item.degree ?? "",
          fieldOfStudy: item.fieldOfStudy ?? "",
          gpa: item.gpa ?? "",
          graduationDate: item.graduationDate ?? "",
          thesisTitle: item.thesisTitle ?? "",
          relevantCoursework: item.relevantCoursework ?? [],
          achievements: item.achievements ?? ""
        }))
      : empty.education,
    projects: input.projects?.length
      ? input.projects.map((item) => ({
          id: item.id ?? createId(),
          name: item.name ?? "",
          role: item.role ?? "",
          context: item.context ?? "",
          period: item.period ?? "",
          technologies: item.technologies ?? [],
          url: item.url ?? "",
          bulletPoints: item.bulletPoints?.length ? item.bulletPoints : [""]
        }))
      : [],
    organizations: input.organizations?.length
      ? input.organizations.map((item) => ({
          id: item.id ?? createId(),
          organization: item.organization ?? "",
          role: item.role ?? "",
          period: item.period ?? "",
          bulletPoints: item.bulletPoints?.length ? item.bulletPoints : [""]
        }))
      : [],
    certificationItems: input.certificationItems?.length ? input.certificationItems : [],
    skills: {
      hardSkills: input.skills?.hardSkills ?? [],
      softSkills: input.skills?.softSkills ?? [],
      tools: input.skills?.tools ?? []
    },
    certifications: []
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromJsonResume = (json: Record<string, any>): ResumeProfile => {
  const basics = json.basics ?? {};
  const profile = emptyResumeProfile();

  const workExperience =
    Array.isArray(json.work) && json.work.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.work.map((item: any) => ({
          id: createId(),
          company: item.name ?? item.company ?? "",
          role: item.position ?? "",
          startDate: toMonthYear(item.startDate),
          endDate: item.endDate ? toMonthYear(item.endDate) : "Present",
          isCurrent: !item.endDate,
          bulletPoints: item.highlights?.length ? item.highlights : [item.summary ?? ""].filter(Boolean)
        }))
      : [];

  const projects =
    Array.isArray(json.projects) && json.projects.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.projects.map((item: any) => ({
          id: createId(),
          name: item.name ?? "",
          role: Array.isArray(item.roles) ? item.roles.join(", ") : "",
          context: item.entity ?? "Proyek",
          period: [item.startDate, item.endDate].filter(Boolean).join(" - "),
          technologies: Array.isArray(item.keywords) ? item.keywords : [],
          url: item.url ?? "",
          bulletPoints: item.highlights?.length ? item.highlights : [item.description ?? ""].filter(Boolean)
        }))
      : [];

  const organizations =
    Array.isArray(json.volunteer) && json.volunteer.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.volunteer.map((item: any) => ({
          id: createId(),
          organization: item.organization ?? "",
          role: item.position ?? "",
          period: [item.startDate, item.endDate].filter(Boolean).join(" - "),
          bulletPoints: item.highlights?.length ? item.highlights : [item.summary ?? ""].filter(Boolean)
        }))
      : [];

  const certificationItems =
    Array.isArray(json.certificates) && json.certificates.length
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json.certificates.map((item: any) => ({
          id: createId(),
          name: item.name ?? "",
          issuer: item.issuer ?? "",
          year: item.date ? String(item.date).slice(0, 4) : ""
        }))
      : [];

  return {
    ...profile,
    experienceLevel: workExperience.length >= 2 ? "experienced" : workExperience.length === 1 ? "early_career" : "fresh_graduate",
    contact: {
      fullName: basics.name ?? "",
      headline: basics.label ?? "",
      email: basics.email ?? "",
      phone: basics.phone ?? "",
      location: firstValue(basics.location?.city, basics.location?.address, basics.location?.region) ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      linkedinUrl: basics.profiles?.find((item: any) => String(item.network).toLowerCase().includes("linkedin"))?.url ?? "",
      portfolioUrl: basics.url ?? ""
    },
    summary: basics.summary ?? "",
    workExperience,
    education:
      Array.isArray(json.education) && json.education.length
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          json.education.map((item: any) => ({
            id: createId(),
            institution: item.institution ?? "",
            degree: item.studyType ?? "",
            fieldOfStudy: item.area ?? "",
            gpa: item.score ?? "",
            graduationDate: item.endDate ? String(item.endDate).slice(0, 4) : "",
            thesisTitle: "",
            relevantCoursework: Array.isArray(item.courses) ? item.courses : [],
            achievements: ""
          }))
        : profile.education,
    projects,
    organizations,
    certificationItems,
    skills: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      hardSkills: Array.isArray(json.skills) ? json.skills.flatMap((skill: any) => skill.keywords ?? []).filter(Boolean) : [],
      softSkills: [],
      tools: []
    }
  };
};

const toMonthYear = (value: string) => {
  if (!value) return "";
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
    experienceLevel: sections.experience.length ? "early_career" : "fresh_graduate",
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
            role: "Pengalaman (silakan lengkapi posisi & instansi)",
            startDate: "",
            endDate: "",
            isCurrent: false,
            bulletPoints: sections.experience.map((line) => line.replace(/^[-•*]\s*/, ""))
          }
        ]
      : [],
    education: sections.education.length
      ? [
          {
            id: createId(),
            institution: sections.education[0] ?? "",
            degree: sections.education[1] ?? "",
            fieldOfStudy: "",
            gpa: joined.match(/(?:IPK|GPA)\s*:?\s*([0-4](?:[.,]\d{1,2})?)/i)?.[1] ?? "",
            graduationDate: joined.match(/\b(20\d{2}|19\d{2})\b/)?.[0] ?? "",
            thesisTitle: "",
            relevantCoursework: [],
            achievements: ""
          }
        ]
      : profile.education,
    projects: sections.projects.length
      ? [
          {
            id: createId(),
            name: "Proyek dari Impor CV",
            role: "",
            context: "Proyek",
            period: "",
            technologies: [],
            url: "",
            bulletPoints: sections.projects.map((line) => line.replace(/^[-•*]\s*/, ""))
          }
        ]
      : [],
    organizations: sections.organizations.length
      ? [
          {
            id: createId(),
            organization: "Organisasi dari Impor CV",
            role: "",
            period: "",
            bulletPoints: sections.organizations.map((line) => line.replace(/^[-•*]\s*/, ""))
          }
        ]
      : [],
    certificationItems: sections.certifications.length
      ? sections.certifications.map((line) => ({
          id: createId(),
          name: line.replace(/^[-•*]\s*/, ""),
          issuer: "",
          year: ""
        }))
      : [],
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
    projects: [] as string[],
    organizations: [] as string[],
    education: [] as string[],
    certifications: [] as string[],
    skills: [] as string[]
  };
  let current: keyof typeof sections = "summary";

  lines.forEach((line) => {
    const normalized = line.toLowerCase();
    if (normalized.length < 48) {
      if (/^(ringkasan|summary|profil|tentang saya)/.test(normalized)) {
        current = "summary";
        return;
      }
      if (/^(pengalaman kerja|pengalaman|experience|work experience)/.test(normalized)) {
        current = "experience";
        return;
      }
      if (/^(proyek|project|projects|portofolio|studi kasus)/.test(normalized)) {
        current = "projects";
        return;
      }
      if (/^(organisasi|kepanitiaan|organization|organizations|volunteer)/.test(normalized)) {
        current = "organizations";
        return;
      }
      if (/^(pendidikan|education|riwayat pendidikan)/.test(normalized)) {
        current = "education";
        return;
      }
      if (/^(sertifikasi|pelatihan|certifications|training|lisensi)/.test(normalized)) {
        current = "certifications";
        return;
      }
      if (/^(skills|keahlian|keterampilan|tools|kemampuan)/.test(normalized)) {
        current = "skills";
        return;
      }
    }

    sections[current].push(line);
  });

  return sections;
};

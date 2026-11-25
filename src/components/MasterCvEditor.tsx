"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AddressBook,
  Briefcase,
  CaretDown,
  Certificate,
  CodeBlock,
  GraduationCap,
  Lightbulb,
  Medal,
  NotePencil,
  Plus,
  Student,
  Trash,
  TrendUp,
  UsersThree,
  Wrench
} from "@phosphor-icons/react";
import { KumoTabs, type TabItem } from "@/components/KumoTabs";
import { Button, Field, SectionCard, SelectInput, TextArea, TextInput } from "@/components/ui";
import { FRESH_GRAD_XYZ_EXAMPLES } from "@/lib/analyzer";
import { useCvStore, type MasterTab } from "@/lib/store";
import { splitList } from "@/lib/text";
import type { ExperienceLevel, WorkType } from "@/types/resume";

const EXPERIENCE_LEVEL_OPTIONS: Array<{
  value: ExperienceLevel;
  title: string;
  desc: string;
  tint: string;
  icon: ReactNode;
}> = [
  {
    value: "fresh_graduate",
    title: "Fresh Graduate",
    desc: "Pendidikan, Proyek, & Magang tampil di atas.",
    tint: "bg-[#DFF5DA] text-[#144C32]",
    icon: <Student size={18} weight="duotone" aria-hidden="true" />
  },
  {
    value: "early_career",
    title: "Pengalaman 0-2 Tahun",
    desc: "Magang & Kerja tampil di atas, diikuti Proyek.",
    tint: "bg-[#D6F3FA] text-[#124959]",
    icon: <TrendUp size={18} weight="duotone" aria-hidden="true" />
  },
  {
    value: "experienced",
    title: "Berpengalaman (2+ Tahun)",
    desc: "Riwayat Kerja & Keahlian tampil paling atas.",
    tint: "bg-[#FFF0A8] text-[#4A3A2E]",
    icon: <Medal size={18} weight="duotone" aria-hidden="true" />
  }
];

const CommaListArea = ({
  values,
  onChangeValues,
  placeholder,
  rows = 3
}: {
  values: string[];
  onChangeValues: (next: string[]) => void;
  placeholder: string;
  rows?: number;
}) => {
  const joined = values.join(", ");
  const [draft, setDraft] = useState(joined);

  useEffect(() => {
    const parsedDraft = splitList(draft).join(", ");
    if (parsedDraft !== joined) {
      setDraft(joined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);

  return (
    <TextArea
      rows={rows}
      value={draft}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);
        onChangeValues(splitList(nextDraft));
      }}
      placeholder={placeholder}
    />
  );
};

const XyzGuideToggle = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-[#DFC25A] bg-[#FFF8DF] p-3.5 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#DFC25A] bg-[#FFF0A8] text-[#4A3A2E]"
          >
            <Lightbulb size={17} weight="duotone" />
          </span>
          <div>
            <p className="text-xs sm:text-sm font-bold text-[#251813]">
              Tips menulis poin yang kuat
            </p>
            <p className="text-xs text-[#4E3E36] mt-0.5">
              Kata kerja aktif + tugas + alat/hasil terukur (jika ada datanya).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="inline-flex items-center gap-1.5 min-h-[44px] rounded-xl border border-[#251813]/30 bg-white px-3 py-1.5 text-xs font-bold text-[#251813] hover:bg-[#FFF0A8] transition-colors"
        >
          <span>{open ? "Sembunyikan Contoh" : "Lihat Contoh Penulisan"}</span>
          <CaretDown
            size={14}
            weight="bold"
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="xyz-guide-list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid gap-3 border-t border-[#DFC25A]/60 pt-3 sm:grid-cols-2">
              {FRESH_GRAD_XYZ_EXAMPLES.map((ex) => (
                <div key={ex.category} className="rounded-xl border border-[#D9CEBC] bg-white p-3 text-xs grid gap-1.5">
                  <p className="font-bold text-[#144C32]">{ex.category}</p>
                  <p className="text-[#7B1F14]">
                    <span className="font-bold">Kurang kuat:</span> {ex.weak}
                  </p>
                  <p className="text-[#251813] leading-relaxed">
                    <span className="font-bold text-[#144C32]">Lebih kuat:</span> {ex.strong}
                  </p>
                  <p className="text-[#59483F] italic">{ex.formulaNote}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export const MasterCvEditor = () => {
  const activeTab = useCvStore((state) => state.activeMasterTab);
  const setActiveTab = useCvStore((state) => state.setActiveMasterTab);
  const resume = useCvStore((state) => state.resumeProfile);
  const setExperienceLevel = useCvStore((state) => state.setExperienceLevel);
  const updateContact = useCvStore((state) => state.updateContact);
  const updateSummary = useCvStore((state) => state.updateSummary);

  const addExperience = useCvStore((state) => state.addExperience);
  const updateExperience = useCvStore((state) => state.updateExperience);
  const removeExperience = useCvStore((state) => state.removeExperience);
  const updateBullet = useCvStore((state) => state.updateBullet);
  const addBullet = useCvStore((state) => state.addBullet);
  const removeBullet = useCvStore((state) => state.removeBullet);

  const addEducation = useCvStore((state) => state.addEducation);
  const updateEducation = useCvStore((state) => state.updateEducation);
  const removeEducation = useCvStore((state) => state.removeEducation);

  const addProject = useCvStore((state) => state.addProject);
  const updateProject = useCvStore((state) => state.updateProject);
  const removeProject = useCvStore((state) => state.removeProject);
  const addProjectBullet = useCvStore((state) => state.addProjectBullet);
  const updateProjectBullet = useCvStore((state) => state.updateProjectBullet);
  const removeProjectBullet = useCvStore((state) => state.removeProjectBullet);

  const addOrganization = useCvStore((state) => state.addOrganization);
  const updateOrganization = useCvStore((state) => state.updateOrganization);
  const removeOrganization = useCvStore((state) => state.removeOrganization);
  const addOrganizationBullet = useCvStore((state) => state.addOrganizationBullet);
  const updateOrganizationBullet = useCvStore((state) => state.updateOrganizationBullet);
  const removeOrganizationBullet = useCvStore((state) => state.removeOrganizationBullet);

  const addCertification = useCvStore((state) => state.addCertification);
  const updateCertification = useCvStore((state) => state.updateCertification);
  const removeCertification = useCvStore((state) => state.removeCertification);

  const updateSkills = useCvStore((state) => state.updateSkills);
  const addSkillGroup = useCvStore((state) => state.addSkillGroup);
  const updateSkillGroup = useCvStore((state) => state.updateSkillGroup);
  const removeSkillGroup = useCvStore((state) => state.removeSkillGroup);
  const setSkillGroups = useCvStore((state) => state.setSkillGroups);

  const skillGroups = resume.skills.groups ?? [];
  const hasCustomGroups = skillGroups.length > 0;
  const [skillMode, setSkillMode] = useState<"standard" | "grouped">(hasCustomGroups ? "grouped" : "standard");

  useEffect(() => {
    if (skillGroups.length > 0) {
      setSkillMode("grouped");
    }
  }, [skillGroups.length]);

  const handleEnableGroupedMode = () => {
    if (skillGroups.length === 0) {
      const seeded = [
        resume.skills.hardSkills.length
          ? { id: "grp-seed-1", category: "Keahlian Teknis", items: [...resume.skills.hardSkills] }
          : null,
        resume.skills.tools.length
          ? { id: "grp-seed-2", category: "Alat & Framework", items: [...resume.skills.tools] }
          : null,
        resume.skills.softSkills.length
          ? { id: "grp-seed-3", category: "Kompetensi Lainnya", items: [...resume.skills.softSkills] }
          : null
      ].filter((g): g is { id: string; category: string; items: string[] } => g !== null);

      setSkillGroups(
        seeded.length ? seeded : [{ id: "grp-seed-1", category: "Programming", items: [] }]
      );
    }
    setSkillMode("grouped");
  };

  const handleSwitchToStandardMode = () => {
    if (skillGroups.length > 0) {
      setSkillGroups([]);
    }
    setSkillMode("standard");
  };

  const isFresh = resume.experienceLevel === "fresh_graduate";

  const hasContact = Boolean(resume.contact.fullName.trim() && resume.contact.email.trim() && resume.contact.phone.trim());
  const hasSummary = resume.summary.trim().length >= 30;
  const hasEducation = resume.education.some((e) => e.institution.trim() || e.degree.trim() || e.fieldOfStudy.trim());
  const hasProjects = resume.projects.some((p) => p.name.trim() || p.bulletPoints.some((b) => b.trim()));
  const hasWork = resume.workExperience.some((w) => w.company.trim() || w.role.trim() || w.bulletPoints.some((b) => b.trim()));
  const hasOrgs = resume.organizations.some((o) => o.organization.trim() || o.role.trim() || o.bulletPoints.some((b) => b.trim()));
  const hasCerts = resume.certificationItems.some((c) => c.name.trim());
  const groupedSkillsCount = skillGroups.reduce((sum, g) => sum + g.items.filter((i) => i.trim()).length, 0);
  const flatSkillsCount = resume.skills.hardSkills.length + resume.skills.tools.length + resume.skills.softSkills.length;
  const totalSkills = Math.max(flatSkillsCount, groupedSkillsCount);

  const baseTabs: Record<MasterTab, TabItem<MasterTab>> = {
    contact: {
      value: "contact",
      label: "Profil & Kontak",
      icon: <AddressBook size={15} weight="duotone" aria-hidden="true" />,
      done: hasContact
    },
    summary: {
      value: "summary",
      label: "Ringkasan",
      icon: <NotePencil size={15} weight="duotone" aria-hidden="true" />,
      done: hasSummary
    },
    education: {
      value: "education",
      label: "Pendidikan",
      icon: <GraduationCap size={15} weight="duotone" aria-hidden="true" />,
      done: hasEducation
    },
    projects: {
      value: "projects",
      label: "Proyek / Skripsi",
      icon: <CodeBlock size={15} weight="duotone" aria-hidden="true" />,
      done: hasProjects,
      badge: resume.projects.length || undefined
    },
    experience: {
      value: "experience",
      label: isFresh ? "Magang / Kerja" : "Pengalaman Kerja",
      icon: <Briefcase size={15} weight="duotone" aria-hidden="true" />,
      done: hasWork,
      badge: resume.workExperience.length || undefined
    },
    organizations: {
      value: "organizations",
      label: "Organisasi",
      icon: <UsersThree size={15} weight="duotone" aria-hidden="true" />,
      done: hasOrgs,
      badge: resume.organizations.length || undefined
    },
    certifications: {
      value: "certifications",
      label: "Sertifikasi",
      icon: <Certificate size={15} weight="duotone" aria-hidden="true" />,
      done: hasCerts,
      badge: resume.certificationItems.length || undefined
    },
    skills: {
      value: "skills",
      label: "Keahlian",
      icon: <Wrench size={15} weight="duotone" aria-hidden="true" />,
      done: totalSkills >= 3,
      badge: totalSkills || undefined
    }
  };

  const tabOrder: MasterTab[] =
    resume.experienceLevel === "fresh_graduate"
      ? ["contact", "summary", "education", "projects", "experience", "organizations", "certifications", "skills"]
      : resume.experienceLevel === "early_career"
      ? ["contact", "summary", "experience", "projects", "organizations", "education", "skills", "certifications"]
      : ["contact", "summary", "experience", "skills", "education", "projects", "organizations", "certifications"];

  const orderedTabs = tabOrder.map((key) => baseTabs[key]);

  return (
    <div className="min-w-0 grid gap-5">
      {/* Pilihan Mode Profil Pengalaman */}
      <div className="surface-card p-4 sm:p-5">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <p className="text-sm font-bold text-[#251813]">Urutan CV sesuai pengalaman</p>
          <p className="text-xs text-[#59483F]">Mengatur posisi bagian terkuat di CV.</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3" role="radiogroup" aria-label="Pilih tingkat pengalaman">
          {EXPERIENCE_LEVEL_OPTIONS.map((opt) => {
            const active = resume.experienceLevel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setExperienceLevel(opt.value)}
                className={`text-left rounded-xl p-3.5 transition-all cursor-pointer min-h-[44px] ${
                  active
                    ? "border-2 border-[#251813] bg-[#FFF8DF] shadow-[2px_3px_0_rgba(37,24,19,0.14)]"
                    : "border border-[#D9CEBC] bg-white hover:border-[#251813]/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`grid h-8 w-8 place-items-center rounded-lg border border-[#251813]/20 ${opt.tint}`}>
                    {opt.icon}
                  </span>
                  <span
                    className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                      active ? "border-[#1F6B57] bg-[#1F6B57]" : "border-[#C2B49E] bg-white"
                    }`}
                  />
                </div>
                <span className="block text-xs sm:text-sm font-bold text-[#251813]">{opt.title}</span>
                <p className="mt-1 text-xs leading-relaxed text-[#4E3E36]">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab bagian CV */}
      <div className="surface-card p-3.5 sm:p-4">
        <p className="text-xs sm:text-sm font-bold text-[#251813] mb-2.5">Bagian CV:</p>
        <KumoTabs<MasterTab>
          tabs={orderedTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          layoutId="master-editor-tabs-pill"
          ariaLabel="Pilihan bagian data CV"
        />
      </div>

      {/* Panel Tab Aktif */}
      <div key={activeTab} className="motion-panel min-w-0 grid gap-5">
        {activeTab === "contact" ? (
          <SectionCard
            title="Profil & Kontak"
            description="Tampil paling atas di dokumen CV."
            accent="butter"
            icon={<AddressBook size={20} weight="duotone" />}
          >
            <div className="grid gap-4 sm:grid-cols-2 items-start">
              <Field label="Nama lengkap">
                <TextInput
                  value={resume.contact.fullName}
                  onChange={(event) => updateContact("fullName", event.target.value)}
                  placeholder="Nadia Kusuma"
                />
              </Field>
              <Field label="Headline / Posisi target (opsional)">
                <TextInput
                  value={resume.contact.headline || ""}
                  onChange={(event) => updateContact("headline", event.target.value)}
                  placeholder="Lulusan Teknik Informatika | Web Developer"
                />
              </Field>
              <Field label="Email aktif">
                <TextInput
                  type="email"
                  value={resume.contact.email}
                  onChange={(event) => updateContact("email", event.target.value)}
                  placeholder="nama@email.com"
                />
              </Field>
              <Field label="Nomor telepon / WhatsApp">
                <TextInput
                  value={resume.contact.phone}
                  onChange={(event) => updateContact("phone", event.target.value)}
                  placeholder="+62 812-xxxx-xxxx"
                />
              </Field>
              <Field label="Domisili">
                <TextInput
                  value={resume.contact.location}
                  onChange={(event) => updateContact("location", event.target.value)}
                  placeholder="Kota, Provinsi"
                />
              </Field>
              <Field label="LinkedIn (opsional)">
                <TextInput
                  value={resume.contact.linkedinUrl}
                  onChange={(event) => updateContact("linkedinUrl", event.target.value)}
                  placeholder="linkedin.com/in/username"
                />
              </Field>
              <Field label="Portofolio / GitHub (opsional)" className="sm:col-span-2">
                <TextInput
                  value={resume.contact.portfolioUrl}
                  onChange={(event) => updateContact("portfolioUrl", event.target.value)}
                  placeholder="github.com/username"
                />
              </Field>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "summary" ? (
          <SectionCard
            title="Ringkasan Profil"
            description="2-4 kalimat singkat tentang latar belakang, alat kerja, dan bidang yang dituju."
            accent="sky"
            icon={<NotePencil size={20} weight="duotone" />}
          >
            <div className="grid gap-4">
              <Field label="Ringkasan diri">
                <TextArea
                  rows={5}
                  value={resume.summary}
                  onChange={(event) => updateSummary(event.target.value)}
                  placeholder={
                    isFresh
                      ? "Lulusan S1 Teknik Informatika (IPK 3.74) dengan pengalaman proyek web dan magang IT Support. Terbiasa dengan React, SQL, dan jaringan lokal."
                      : "Staf Administrasi dengan pengalaman 3 tahun mengelola stok, arsip transaksi, dan laporan harian menggunakan Excel dan ERP."
                  }
                />
              </Field>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "education" ? (
          <SectionCard
            title="Pendidikan"
            description={
              isFresh
                ? "Cantumkan IPK, tugas akhir, atau mata kuliah yang relevan."
                : "Tuliskan riwayat pendidikan terakhirmu."
            }
            accent="sage"
            icon={<GraduationCap size={20} weight="duotone" />}
            actions={
              <Button type="button" variant="secondary" onClick={addEducation} className="gap-1.5">
                <Plus size={15} weight="bold" aria-hidden="true" />
                <span>Tambah Pendidikan</span>
              </Button>
            }
          >
            <div className="grid gap-5">
              {resume.education.map((education, eduIndex) => (
                <div key={education.id} className="rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4 border-b border-[#D9CEBC] pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#59483F]">
                      Pendidikan #{eduIndex + 1}
                    </span>
                    {resume.education.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeEducation(education.id)}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2.5 text-xs font-bold text-[#7B1F14] hover:underline"
                      >
                        <Trash size={14} weight="duotone" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 items-start">
                    <Field label="Universitas / Sekolah">
                      <TextInput
                        value={education.institution}
                        onChange={(event) => updateEducation(education.id, { institution: event.target.value })}
                        placeholder="Universitas / Politeknik / SMK"
                      />
                    </Field>
                    <Field label="Jenjang">
                      <TextInput
                        value={education.degree}
                        onChange={(event) => updateEducation(education.id, { degree: event.target.value })}
                        placeholder="S1 / D3 / SMK"
                      />
                    </Field>
                    <Field label="Jurusan / Program Studi">
                      <TextInput
                        value={education.fieldOfStudy}
                        onChange={(event) => updateEducation(education.id, { fieldOfStudy: event.target.value })}
                        placeholder="Teknik Informatika / Akuntansi"
                      />
                    </Field>
                    <Field label="Tahun lulus">
                      <TextInput
                        value={education.graduationDate}
                        onChange={(event) => updateEducation(education.id, { graduationDate: event.target.value })}
                        placeholder="2025 atau 2021 - 2025"
                      />
                    </Field>
                    <Field label="IPK / Nilai (opsional)">
                      <TextInput
                        value={education.gpa}
                        onChange={(event) => updateEducation(education.id, { gpa: event.target.value })}
                        placeholder="3.74/4.00"
                      />
                    </Field>
                    <Field label="Prestasi / Beasiswa (opsional)">
                      <TextInput
                        value={education.achievements || ""}
                        onChange={(event) => updateEducation(education.id, { achievements: event.target.value })}
                        placeholder="Cum Laude / Penerima Beasiswa"
                      />
                    </Field>
                    <Field
                      label="Judul Tugas Akhir / Skripsi (opsional)"
                      className="sm:col-span-2"
                    >
                      <TextInput
                        value={education.thesisTitle || ""}
                        onChange={(event) => updateEducation(education.id, { thesisTitle: event.target.value })}
                        placeholder="Rancang Bangun Sistem Antrean Klinik Berbasis Web"
                      />
                    </Field>
                    <Field
                      label="Mata kuliah relevan (opsional)"
                      hint="Pisahkan dengan koma."
                      className="sm:col-span-2"
                    >
                      <CommaListArea
                        rows={2}
                        values={education.relevantCoursework ?? []}
                        onChangeValues={(vals) => updateEducation(education.id, { relevantCoursework: vals })}
                        placeholder="Basis Data, Jaringan Komputer, Rekayasa Perangkat Lunak"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "projects" ? (
          <SectionCard
            title="Proyek & Tugas Akhir"
            description="Proyek kuliah, tugas akhir, freelance, atau karya mandiri."
            accent="butter"
            icon={<CodeBlock size={20} weight="duotone" />}
            actions={
              <Button type="button" onClick={addProject} className="gap-1.5">
                <Plus size={15} weight="bold" aria-hidden="true" />
                <span>Tambah Proyek</span>
              </Button>
            }
          >
            <div className="grid gap-5">
              <XyzGuideToggle />

              {resume.projects.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#C2B49E] bg-white p-6 text-center">
                  <p className="text-sm font-bold text-[#251813]">Belum ada proyek</p>
                  <p className="mt-1 text-xs text-[#4E3E36]">
                    Tambahkan proyek kuliah, skripsi, atau proyek pribadi untuk menunjukkan keahlianmu.
                  </p>
                  <Button type="button" className="mt-4 gap-1.5" onClick={addProject}>
                    <Plus size={15} weight="bold" aria-hidden="true" />
                    <span>Tambah Proyek</span>
                  </Button>
                </div>
              ) : (
                resume.projects.map((project, projIdx) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-[#D9CEBC] pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#59483F]">
                        Proyek #{projIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProject(project.id)}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2.5 text-xs font-bold text-[#7B1F14] hover:underline"
                      >
                        <Trash size={14} weight="duotone" aria-hidden="true" />
                        <span>Hapus proyek</span>
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 items-start">
                      <Field label="Nama proyek atau studi kasus">
                        <TextInput
                          value={project.name}
                          onChange={(event) => updateProject(project.id, { name: event.target.value })}
                          placeholder="Contoh: Aplikasi Inventaris Lab Komputer"
                        />
                      </Field>
                      <Field label="Konteks / Jenis proyek" hint="Contoh: Proyek Tugas Akhir, Proyek Kuliah, Freelance.">
                        <TextInput
                          value={project.context}
                          onChange={(event) => updateProject(project.id, { context: event.target.value })}
                          placeholder="Proyek Kuliah"
                        />
                      </Field>
                      <Field label="Peran kamu di proyek ini">
                        <TextInput
                          value={project.role}
                          onChange={(event) => updateProject(project.id, { role: event.target.value })}
                          placeholder="Contoh: Frontend Developer / Analis Data"
                        />
                      </Field>
                      <Field label="Periode pengerjaan" hint="Contoh: Jan 2025 - May 2025.">
                        <TextInput
                          value={project.period}
                          onChange={(event) => updateProject(project.id, { period: event.target.value })}
                          placeholder="Jan 2025 - May 2025"
                        />
                      </Field>
                      <Field label="Alat / Teknologi yang dipakai" hint="Pisahkan dengan koma.">
                        <CommaListArea
                          rows={2}
                          values={project.technologies}
                          onChangeValues={(vals) => updateProject(project.id, { technologies: vals })}
                          placeholder="Next.js, PostgreSQL, Excel, Figma"
                        />
                      </Field>
                      <Field label="Tautan proyek / GitHub (opsional)">
                        <TextInput
                          value={project.url || ""}
                          onChange={(event) => updateProject(project.id, { url: event.target.value })}
                          placeholder="github.com/..."
                        />
                      </Field>
                    </div>

                    <div className="mt-4 border-t border-[#D9CEBC] pt-4 grid gap-3">
                      <p className="text-sm font-bold text-[#251813]">Poin hal yang kamu kerjakan & hasilnya</p>
                      {project.bulletPoints.map((bullet, bIdx) => (
                        <div key={`${project.id}-b-${bIdx}`} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-start">
                          <div className="flex-1">
                            <TextArea
                              rows={2}
                              value={bullet}
                              onChange={(event) => updateProjectBullet(project.id, bIdx, event.target.value)}
                              placeholder="Contoh: Membangun modul pelacakan 180+ perangkat lab menggunakan PostgreSQL untuk menggantikan pencatatan manual."
                            />
                          </div>
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => removeProjectBullet(project.id, bIdx)}
                            className="shrink-0 self-end sm:self-start"
                          >
                            Hapus
                          </Button>
                        </div>
                      ))}
                      <div>
                        <Button type="button" variant="secondary" onClick={() => addProjectBullet(project.id)} className="gap-1.5">
                          <Plus size={14} weight="bold" aria-hidden="true" />
                          <span>Tambah Poin Proyek</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "experience" ? (
          <SectionCard
            title={isFresh ? "Magang, PKL, & Kerja" : "Pengalaman Kerja"}
            description={
              isFresh
                ? "Boleh dikosongkan jika belum ada pengalaman kerja atau magang."
                : "Urutkan dari pengalaman paling baru."
            }
            accent="sky"
            icon={<Briefcase size={20} weight="duotone" />}
            actions={
              <Button type="button" variant="secondary" onClick={addExperience} className="gap-1.5">
                <Plus size={15} weight="bold" aria-hidden="true" />
                <span>Tambah Pengalaman</span>
              </Button>
            }
          >
            <div className="grid gap-5">
              <XyzGuideToggle />

              {resume.workExperience.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#C2B49E] bg-white p-6 text-center">
                  <p className="text-sm font-bold text-[#251813]">Belum ada pengalaman kerja / magang</p>
                  <p className="mt-1 text-xs text-[#4E3E36]">
                    {isFresh
                      ? "Opsional untuk Fresh Graduate."
                      : "Klik tombol di bawah untuk menambahkan."}
                  </p>
                  <Button type="button" variant="secondary" className="mt-4 gap-1.5" onClick={addExperience}>
                    <Plus size={15} weight="bold" aria-hidden="true" />
                    <span>Tambah Pengalaman</span>
                  </Button>
                </div>
              ) : (
                resume.workExperience.map((experience, expIndex) => (
                  <motion.div
                    key={experience.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-[#D9CEBC] pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#59483F]">
                        Pengalaman #{expIndex + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExperience(experience.id)}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2.5 text-xs font-bold text-[#7B1F14] hover:underline"
                      >
                        <Trash size={14} weight="duotone" aria-hidden="true" />
                        <span>Hapus bagian ini</span>
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 items-start">
                      <Field label="Nama perusahaan atau instansi">
                        <TextInput
                          value={experience.company}
                          onChange={(event) => updateExperience(experience.id, { company: event.target.value })}
                          placeholder="PT / Instansi / Rumah Sakit"
                        />
                      </Field>
                      <Field label="Posisi atau jabatan">
                        <TextInput
                          value={experience.role}
                          onChange={(event) => updateExperience(experience.id, { role: event.target.value })}
                          placeholder="Contoh: IT Support Intern / Admin Gudang"
                        />
                      </Field>
                      <Field label="Jenis posisi">
                        <SelectInput
                          value={experience.type ?? "fulltime"}
                          onChange={(event) =>
                            updateExperience(experience.id, { type: event.target.value as WorkType })
                          }
                        >
                          <option value="fulltime">Penuh Waktu (Full-time)</option>
                          <option value="internship">Magang / PKL / MSIB</option>
                          <option value="parttime">Paruh Waktu (Part-time)</option>
                          <option value="freelance">Freelance / Kontrak Proyek</option>
                        </SelectInput>
                      </Field>
                      <Field label="Kota / Lokasi (opsional)">
                        <TextInput
                          value={experience.location || ""}
                          onChange={(event) => updateExperience(experience.id, { location: event.target.value })}
                          placeholder="Jakarta / Remote"
                        />
                      </Field>
                      <Field label="Tanggal mulai">
                        <TextInput
                          value={experience.startDate}
                          onChange={(event) => updateExperience(experience.id, { startDate: event.target.value })}
                          placeholder="Aug 2024"
                        />
                      </Field>
                      <div className="flex flex-col gap-2">
                        <Field label="Tanggal selesai">
                          <TextInput
                            value={experience.isCurrent ? "Present" : experience.endDate}
                            disabled={experience.isCurrent}
                            onChange={(event) =>
                              updateExperience(experience.id, {
                                endDate: event.target.value,
                                isCurrent: /^(present|sekarang)$/i.test(event.target.value.trim())
                              })
                            }
                            placeholder="Dec 2024"
                          />
                        </Field>
                        <label className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#251813] cursor-pointer min-h-[44px]">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm border-[#251813]/40 checked:bg-[#1F6B57] checked:border-[#1F6B57]"
                            checked={experience.isCurrent}
                            onChange={(event) =>
                              updateExperience(experience.id, {
                                isCurrent: event.target.checked,
                                endDate: event.target.checked ? "Present" : ""
                              })
                            }
                          />
                          <span>Masih aktif bekerja / magang di sini</span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-[#D9CEBC] pt-4 grid gap-3">
                      <div>
                        <p className="text-sm font-bold text-[#251813]">Poin-poin pencapaian</p>
                        <p className="text-xs text-[#59483F] mt-0.5">
                          Tulis tindakan nyata, alat yang dipakai, dan angka hasil terukur jika datanya ada.
                        </p>
                      </div>

                      <div className="grid gap-2.5">
                        {experience.bulletPoints.map((bullet, index) => (
                          <div
                            key={`${experience.id}-${index}`}
                            className="flex flex-col sm:flex-row gap-2 sm:items-start"
                          >
                            <div className="flex-1">
                              <TextArea
                                rows={2}
                                value={bullet}
                                onChange={(event) => updateBullet(experience.id, index, event.target.value)}
                                placeholder="Contoh: Menangani troubleshooting 15+ tiket perangkat keras dan jaringan LAN setiap minggu untuk unit administrasi."
                              />
                            </div>
                            <Button
                              type="button"
                              variant="danger"
                              onClick={() => removeBullet(experience.id, index)}
                              aria-label={`Hapus poin ke-${index + 1}`}
                              className="shrink-0 self-end sm:self-start"
                            >
                              Hapus
                            </Button>
                          </div>
                        ))}
                      </div>

                      <div>
                        <Button type="button" variant="secondary" onClick={() => addBullet(experience.id)} className="gap-1.5">
                          <Plus size={14} weight="bold" aria-hidden="true" />
                          <span>Tambah Poin Pencapaian</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "organizations" ? (
          <SectionCard
            title="Organisasi & Kepanitiaan"
            description="Kegiatan kampus, UKM, kepanitiaan, atau relawan."
            accent="sage"
            icon={<UsersThree size={20} weight="duotone" />}
            actions={
              <Button type="button" variant="secondary" onClick={addOrganization} className="gap-1.5">
                <Plus size={15} weight="bold" aria-hidden="true" />
                <span>Tambah Organisasi</span>
              </Button>
            }
          >
            <div className="grid gap-5">
              <XyzGuideToggle />

              {resume.organizations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#C2B49E] bg-white p-6 text-center">
                  <p className="text-sm font-bold text-[#251813]">Belum ada organisasi atau kepanitiaan</p>
                  <p className="mt-1 text-xs sm:text-sm text-[#4E3E36] max-w-lg mx-auto">
                    Tambahkan pengalaman HMJ, BEM, UKM, panitia seminar, atau kegiatan sosial/relawan jika ada.
                  </p>
                  <Button type="button" variant="secondary" className="mt-4 gap-1.5" onClick={addOrganization}>
                    <Plus size={15} weight="bold" aria-hidden="true" />
                    <span>Tambah Organisasi / Kepanitiaan</span>
                  </Button>
                </div>
              ) : (
                resume.organizations.map((org, orgIdx) => (
                  <motion.div
                    key={org.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-[#D9CEBC] pb-2.5">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#59483F]">
                        Organisasi #{orgIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeOrganization(org.id)}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2.5 text-xs font-bold text-[#7B1F14] hover:underline"
                      >
                        <Trash size={14} weight="duotone" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 items-start">
                      <Field label="Nama organisasi atau kepanitiaan">
                        <TextInput
                          value={org.organization}
                          onChange={(event) => updateOrganization(org.id, { organization: event.target.value })}
                          placeholder="Himpunan Mahasiswa / Panitia Seminar Nasional"
                        />
                      </Field>
                      <Field label="Jabatan atau peran">
                        <TextInput
                          value={org.role}
                          onChange={(event) => updateOrganization(org.id, { role: event.target.value })}
                          placeholder="Koordinator Acara / Staf Hubungan Masyarakat"
                        />
                      </Field>
                      <Field label="Periode keaktifan" hint="Contoh: Feb 2023 - Jan 2024.">
                        <TextInput
                          value={org.period}
                          onChange={(event) => updateOrganization(org.id, { period: event.target.value })}
                          placeholder="Feb 2023 - Jan 2024"
                        />
                      </Field>
                    </div>

                    <div className="mt-4 border-t border-[#D9CEBC] pt-4 grid gap-3">
                      <p className="text-sm font-bold text-[#251813]">Kontribusi & hasil kegiatan</p>
                      {org.bulletPoints.map((bullet, bIdx) => (
                        <div key={`${org.id}-b-${bIdx}`} className="flex flex-col sm:flex-row gap-2 sm:items-start">
                          <div className="flex-1">
                            <TextArea
                              rows={2}
                              value={bullet}
                              onChange={(event) => updateOrganizationBullet(org.id, bIdx, event.target.value)}
                              placeholder="Contoh: Mengkoordinasikan 4 lokakarya pelatihan teknologi yang diikuti 160 peserta mahasiswa."
                            />
                          </div>
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => removeOrganizationBullet(org.id, bIdx)}
                            className="shrink-0 self-end sm:self-start"
                          >
                            Hapus
                          </Button>
                        </div>
                      ))}
                      <div>
                        <Button type="button" variant="secondary" onClick={() => addOrganizationBullet(org.id)} className="gap-1.5">
                          <Plus size={14} weight="bold" aria-hidden="true" />
                          <span>Tambah Poin Kontribusi</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "certifications" ? (
          <SectionCard
            title="Sertifikasi & Pelatihan"
            description="Kursus, bootcamp, atau sertifikat kompetensi relevan."
            accent="butter"
            icon={<Certificate size={20} weight="duotone" />}
            actions={
              <Button type="button" variant="secondary" onClick={addCertification} className="gap-1.5">
                <Plus size={15} weight="bold" aria-hidden="true" />
                <span>Tambah Sertifikasi</span>
              </Button>
            }
          >
            {resume.certificationItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#C2B49E] bg-white p-6 text-center">
                <p className="text-sm font-bold text-[#251813]">Belum ada sertifikasi</p>
                <p className="mt-1 text-xs text-[#4E3E36]">Opsional. Tambahkan jika ada sertifikat atau bootcamp relevan.</p>
                <Button type="button" variant="secondary" className="mt-4 gap-1.5" onClick={addCertification}>
                  <Plus size={15} weight="bold" aria-hidden="true" />
                  <span>Tambah Sertifikasi</span>
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {resume.certificationItems.map((cert, certIdx) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#D9CEBC] bg-white p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between mb-3 border-b border-[#D9CEBC] pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#59483F]">
                        Sertifikasi #{certIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeCertification(cert.id)}
                        className="inline-flex items-center gap-1 min-h-[44px] px-2.5 text-xs font-bold text-[#7B1F14] hover:underline"
                      >
                        <Trash size={14} weight="duotone" aria-hidden="true" />
                        <span>Hapus</span>
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 items-start">
                      <Field label="Nama sertifikasi / pelatihan" className="sm:col-span-2">
                        <TextInput
                          value={cert.name}
                          onChange={(event) => updateCertification(cert.id, { name: event.target.value })}
                          placeholder="Contoh: Junior Network Administrator (VSGA)"
                        />
                      </Field>
                      <Field label="Tahun">
                        <TextInput
                          value={cert.year}
                          onChange={(event) => updateCertification(cert.id, { year: event.target.value })}
                          placeholder="2024"
                        />
                      </Field>
                      <Field label="Lembaga penerbit" className="sm:col-span-3">
                        <TextInput
                          value={cert.issuer}
                          onChange={(event) => updateCertification(cert.id, { issuer: event.target.value })}
                          placeholder="Contoh: Kominfo / BNSP / Dicoding Indonesia"
                        />
                      </Field>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeTab === "skills" ? (
          <SectionCard
            title="Keahlian & Alat"
            description="Digunakan langsung saat mencocokkan CV dengan syarat lowongan."
            accent="sky"
            icon={<Wrench size={20} weight="duotone" />}
            actions={
              skillMode === "grouped" ? (
                <Button type="button" variant="secondary" onClick={addSkillGroup} className="gap-1.5">
                  <Plus size={15} weight="bold" aria-hidden="true" />
                  <span>Tambah Kategori</span>
                </Button>
              ) : null
            }
          >
            <div className="grid gap-4">
              {/* Switcher Mode Kelompok Keahlian */}
              <div className="rounded-xl border border-[#94D1DF] bg-white p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <p className="text-xs sm:text-sm font-bold text-[#251813]">Tampilan keahlian di CV</p>
                  <p className="text-xs text-[#59483F] mt-0.5">Standar 3 kelompok atau kategori kustom.</p>
                </div>
                <div
                  role="group"
                  aria-label="Mode kelompok keahlian"
                  className="inline-flex rounded-xl border border-[#D9CEBC] bg-[#F3E7C8] p-1 shrink-0"
                >
                  <button
                    type="button"
                    onClick={handleSwitchToStandardMode}
                    className={`min-h-[38px] rounded-lg px-3 text-xs font-bold transition-colors ${
                      skillMode === "standard" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
                    }`}
                  >
                    3 Kelompok Standar
                  </button>
                  <button
                    type="button"
                    onClick={handleEnableGroupedMode}
                    className={`min-h-[38px] rounded-lg px-3 text-xs font-bold transition-colors ${
                      skillMode === "grouped" ? "bg-white text-[#251813] shadow-2xs" : "text-[#4E3E36]"
                    }`}
                  >
                    Kategori Kustom ({skillGroups.length})
                  </button>
                </div>
              </div>

              {skillMode === "grouped" ? (
                <div className="grid gap-3.5">
                  {skillGroups.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#C2B49E] bg-white p-6 text-center">
                      <p className="text-sm font-bold text-[#251813]">Belum ada kategori keahlian kustom</p>
                      <Button type="button" variant="secondary" className="mt-3 gap-1.5" onClick={addSkillGroup}>
                        <Plus size={15} weight="bold" aria-hidden="true" />
                        <span>Tambah Kategori Pertama</span>
                      </Button>
                    </div>
                  ) : (
                    skillGroups.map((group, gIdx) => (
                      <div key={group.id} className="rounded-xl border border-[#D9CEBC] bg-white p-4 grid gap-3">
                        <div className="flex items-center justify-between gap-2 border-b border-[#D9CEBC] pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#59483F]">
                            Kategori #{gIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSkillGroup(group.id)}
                            className="inline-flex items-center gap-1 min-h-[36px] px-2 text-xs font-bold text-[#7B1F14] hover:underline"
                          >
                            <Trash size={14} weight="duotone" aria-hidden="true" />
                            <span>Hapus</span>
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3 items-start">
                          <Field label="Nama kategori" hint="Contoh: Programming, Database, Tools.">
                            <TextInput
                              value={group.category}
                              onChange={(event) => updateSkillGroup(group.id, { category: event.target.value })}
                              placeholder="Programming"
                            />
                          </Field>
                          <Field
                            label="Daftar skill dalam kategori ini"
                            hint="Pisahkan dengan koma."
                            className="sm:col-span-2"
                          >
                            <CommaListArea
                              rows={2}
                              values={group.items}
                              onChangeValues={(vals) => updateSkillGroup(group.id, { items: vals })}
                              placeholder="Python, Go, SQL, JavaScript, TypeScript"
                            />
                          </Field>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" onClick={addSkillGroup} className="gap-1.5">
                      <Plus size={15} weight="bold" aria-hidden="true" />
                      <span>Tambah Kategori Keahlian</span>
                    </Button>
                    <Button type="button" variant="ghost" onClick={handleSwitchToStandardMode}>
                      Beralih ke 3 Kelompok Standar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <Field label="Keahlian teknis (Hard Skills)" hint="Pisahkan dengan koma.">
                    <CommaListArea
                      rows={4}
                      values={resume.skills.hardSkills}
                      onChangeValues={(vals) => updateSkills("hardSkills", vals)}
                      placeholder="SQL, HTML, CSS, JavaScript, Jaringan LAN/WAN"
                    />
                  </Field>
                  <Field label="Alat & Software (Tools)" hint="Pisahkan dengan koma.">
                    <CommaListArea
                      rows={3}
                      values={resume.skills.tools}
                      onChangeValues={(vals) => updateSkills("tools", vals)}
                      placeholder="Microsoft Excel, Microsoft Word, Git, MySQL, Figma"
                    />
                  </Field>
                  <Field label="Kompetensi pendukung (Soft Skills)" hint="Pisahkan dengan koma.">
                    <CommaListArea
                      rows={3}
                      values={resume.skills.softSkills}
                      onChangeValues={(vals) => updateSkills("softSkills", vals)}
                      placeholder="Komunikasi, Kerja Tim, Teliti"
                    />
                  </Field>
                </div>
              )}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
};

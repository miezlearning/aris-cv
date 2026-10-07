"use client";

import { useState } from "react";
import { Button, Field, SectionCard, TextArea, TextInput } from "@/components/ui";
import { useCvStore } from "@/lib/store";
import { splitList } from "@/lib/text";

type MasterTab = "contact" | "summary" | "experience" | "education" | "skills";

const masterTabs: Array<{ id: MasterTab; label: string; color: string }> = [
  { id: "contact", label: "Kontak", color: "bg-[#fff0a8]" },
  { id: "summary", label: "Ringkasan", color: "bg-[#e0f6fb]" },
  { id: "experience", label: "Pengalaman", color: "bg-[#e4f6df]" },
  { id: "education", label: "Pendidikan", color: "bg-[#ffe1d6]" },
  { id: "skills", label: "Keahlian", color: "bg-white" }
];

export const MasterCvEditor = () => {
  const [activeTab, setActiveTab] = useState<MasterTab>("contact");
  const resume = useCvStore((state) => state.resumeProfile);
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
  const updateSkills = useCvStore((state) => state.updateSkills);

  return (
    <div className="grid gap-5">
      {/* Clean Segmented Tab Navigation - No horizontal scrollbar! */}
      <div className="doodle-card bg-[var(--paper-strong)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <p className="text-sm font-bold text-ink">Pilih bagian data CV:</p>
          <span className="text-xs text-[#6b584d]">5 bagian standar format ATS</span>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-2.5" role="group" aria-label="Bagian data CV">
          {masterTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] px-4 sm:px-5 py-2 rounded-xl text-sm font-bold border-2 border-line transition-all ${
                  selected
                    ? `${tab.color} shadow-[2px_3px_0_rgba(37,24,19,0.18)] translate-y-[-1px] ring-2 ring-line/20`
                    : "bg-white text-ink/80 hover:bg-[#fffdf7] hover:-translate-y-0.5"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab Panel */}
      <div key={activeTab} className="motion-panel grid gap-5">
        {activeTab === "contact" ? (
          <SectionCard
            title="Kontak pribadi"
            description="Nama dan kontak diletakkan di bagian atas isi CV, bukan di header atau footer dokumen, supaya sistem ATS tetap bisa membacanya."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap">
                <TextInput value={resume.contact.fullName} onChange={(event) => updateContact("fullName", event.target.value)} placeholder="Nama sesuai CV" />
              </Field>
              <Field label="Email" hint="Pakai email yang kamu periksa setiap hari.">
                <TextInput type="email" value={resume.contact.email} onChange={(event) => updateContact("email", event.target.value)} placeholder="email@example.com" />
              </Field>
              <Field label="Nomor telepon" hint="Tulis nomor yang aktif dan bisa dihubungi.">
                <TextInput value={resume.contact.phone} onChange={(event) => updateContact("phone", event.target.value)} placeholder="Nomor aktif" />
              </Field>
              <Field label="Domisili" hint="Cukup kota dan provinsi.">
                <TextInput value={resume.contact.location} onChange={(event) => updateContact("location", event.target.value)} placeholder="Kota, Provinsi" />
              </Field>
              <Field label="LinkedIn" hint="Kosongkan kalau belum punya.">
                <TextInput value={resume.contact.linkedinUrl} onChange={(event) => updateContact("linkedinUrl", event.target.value)} placeholder="https://linkedin.com/in/..." />
              </Field>
              <Field label="Portofolio" hint="Kosongkan kalau belum punya.">
                <TextInput value={resume.contact.portfolioUrl} onChange={(event) => updateContact("portfolioUrl", event.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "summary" ? (
          <SectionCard
            title="Ringkasan tentang kamu"
            description="Tulis 3 sampai 5 kalimat: siapa kamu, bidang yang kamu tekuni, dan hal yang paling kamu kuasai. Semua isinya harus benar-benar ada di pengalaman atau keahlianmu."
          >
            <Field label="Ringkasan eksekutif" hint="Hindari kalimat klise seperti pekerja keras dan cepat belajar. Sebut hal konkret yang bisa dibuktikan.">
              <TextArea
                rows={6}
                value={resume.summary}
                onChange={(event) => updateSummary(event.target.value)}
                placeholder="Contoh: Lulusan Sistem Informasi dengan pengalaman magang di bagian analisis data. Terbiasa mengolah spreadsheet transaksi, menyusun dasbor metrik, dan merapikan data pelanggan."
              />
            </Field>
          </SectionCard>
        ) : null}

        {activeTab === "experience" ? (
          <SectionCard
            title="Pengalaman kerja dan organisasi"
            description="Format tanggal: MM/YYYY (contoh: 08/2024). Kalau masih berjalan, tulis 'Present'. Magang MSIB dan pengalaman organisasi kampus boleh dimasukkan di sini."
            actions={<Button type="button" variant="secondary" onClick={addExperience}>+ Tambah pengalaman</Button>}
          >
            <div className="grid gap-5">
              {resume.workExperience.map((experience, expIndex) => (
                <div key={experience.id} className="rounded-2xl border-2 border-line bg-[#f8fbff] p-5 sm:p-6 shadow-[2px_3px_0_rgba(37,24,19,0.08)]">
                  <div className="flex items-center justify-between mb-4 border-b border-line/15 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#57443b]">Pengalaman #{expIndex + 1}</span>
                    {resume.workExperience.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeExperience(experience.id)}
                        className="text-xs font-bold text-[#a3291b] hover:underline"
                      >
                        Hapus bagian ini
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Perusahaan atau organisasi">
                      <TextInput value={experience.company} onChange={(event) => updateExperience(experience.id, { company: event.target.value })} placeholder="Nama perusahaan atau organisasi" />
                    </Field>
                    <Field label="Posisi atau jabatan">
                      <TextInput value={experience.role} onChange={(event) => updateExperience(experience.id, { role: event.target.value })} placeholder="Posisi atau jabatan" />
                    </Field>
                    <Field label="Bulan mulai" hint="Format MM/YYYY, contoh: 01/2023.">
                      <TextInput value={experience.startDate} onChange={(event) => updateExperience(experience.id, { startDate: event.target.value })} placeholder="MM/YYYY" />
                    </Field>
                    <Field label="Bulan selesai" hint="Format MM/YYYY, atau tulis 'Present'.">
                      <TextInput value={experience.endDate} onChange={(event) => updateExperience(experience.id, { endDate: event.target.value, isCurrent: event.target.value.toLowerCase() === "present" })} placeholder="MM/YYYY atau Present" />
                    </Field>
                  </div>

                  <div className="mt-5 border-t border-line/10 pt-4 grid gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">Poin-poin pencapaian</p>
                      <p className="text-xs text-[#57443b] mt-0.5">
                        Tulis tindakan nyata, hasil/dampak, dan alat kerja. Kalau ada angka terukur (%, jumlah), cantumkan angkanya.
                      </p>
                    </div>

                    <div className="grid gap-2.5">
                      {experience.bulletPoints.map((bullet, index) => (
                        <div key={`${experience.id}-${index}`} className="flex flex-col sm:flex-row gap-2 sm:items-start">
                          <div className="flex-1">
                            <TextArea
                              rows={2}
                              value={bullet}
                              onChange={(event) => updateBullet(experience.id, index, event.target.value)}
                              placeholder="Contoh: Mengelola 5 kampanye pemasaran digital dengan kenaikan prospek 25% menggunakan Meta Ads."
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

                    <div className="pt-2">
                      <Button type="button" variant="secondary" onClick={() => addBullet(experience.id)}>
                        + Tambah poin pencapaian
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "education" ? (
          <SectionCard
            title="Riwayat pendidikan"
            description="Tulis jenjang perguruan tinggi atau sekolah terakhir. Fresh graduate disarankan mencantumkan IPK skala 4.00 dan bulan/tahun kelulusan."
            actions={<Button type="button" variant="secondary" onClick={addEducation}>+ Tambah pendidikan</Button>}
          >
            <div className="grid gap-5">
              {resume.education.map((education, eduIndex) => (
                <div key={education.id} className="rounded-2xl border-2 border-line bg-[#fffdf7] p-5 sm:p-6 shadow-[2px_3px_0_rgba(37,24,19,0.08)]">
                  <div className="flex items-center justify-between mb-4 border-b border-line/15 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#57443b]">Pendidikan #{eduIndex + 1}</span>
                    {resume.education.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeEducation(education.id)}
                        className="text-xs font-bold text-[#a3291b] hover:underline"
                      >
                        Hapus bagian ini
                      </button>
                    ) : null}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Nama institusi atau universitas">
                      <TextInput value={education.institution} onChange={(event) => updateEducation(education.id, { institution: event.target.value })} placeholder="Universitas atau Sekolah" />
                    </Field>
                    <Field label="Jenjang" hint="Contoh: S1, D3, SMK, atau Bootcamp.">
                      <TextInput value={education.degree} onChange={(event) => updateEducation(education.id, { degree: event.target.value })} placeholder="S1, D3, Bootcamp" />
                    </Field>
                    <Field label="Program studi atau jurusan">
                      <TextInput value={education.fieldOfStudy} onChange={(event) => updateEducation(education.id, { fieldOfStudy: event.target.value })} placeholder="Program studi" />
                    </Field>
                    <Field label="IPK atau Nilai Akhir" hint="Skala 4.00, contoh: 3.75/4.00.">
                      <TextInput value={education.gpa} onChange={(event) => updateEducation(education.id, { gpa: event.target.value })} placeholder="3.75/4.00" />
                    </Field>
                    <Field label="Tahun kelulusan" hint="Empat angka, contoh: 2025.">
                      <TextInput value={education.graduationDate} onChange={(event) => updateEducation(education.id, { graduationDate: event.target.value })} placeholder="2025" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "skills" ? (
          <SectionCard
            title="Keahlian kamu"
            description="Daftar ini dicocokkan langsung dengan kata kunci lowongan di Langkah 2. Tulis keahlian dan alat kerja yang benar-benar kamu kuasai."
          >
            <div className="grid gap-4">
              <Field label="Keahlian teknis (Hard Skills)" hint="Pisahkan dengan koma atau baris baru. Contoh: SQL, Pemodelan Data, SEO, Analisis Keuangan.">
                <TextArea rows={4} value={resume.skills.hardSkills.join(", ")} onChange={(event) => updateSkills("hardSkills", splitList(event.target.value))} placeholder="SQL, analisis data, Python, Google Analytics" />
              </Field>
              <Field label="Alat kerja (Tools & Software)" hint="Perangkat lunak yang pernah kamu gunakan. Contoh: Excel, Figma, Tableau, Git.">
                <TextArea rows={4} value={resume.skills.tools.join(", ")} onChange={(event) => updateSkills("tools", splitList(event.target.value))} placeholder="Excel, Figma, Power BI, VS Code" />
              </Field>
              <Field label="Sikap & kompetensi kerja (Soft Skills)" hint="Sikap yang bisa kamu buktikan dengan contoh nyata saat wawancara.">
                <TextArea rows={4} value={resume.skills.softSkills.join(", ")} onChange={(event) => updateSkills("softSkills", splitList(event.target.value))} placeholder="Komunikasi, kolaborasi tim, pemecahan masalah" />
              </Field>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
};

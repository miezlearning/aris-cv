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
    <div className="grid gap-4">
      <div className="doodle-card bg-[var(--paper-strong)] p-3">
        <p className="mb-2 text-sm font-black text-ink">Pilih bagian yang mau diisi</p>
        <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Bagian data CV">
          {masterTabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-11 shrink-0 rounded-[999px_13px_999px_16px] border-2 border-line px-4 text-sm font-black shadow-[2px_3px_0_rgba(37,24,19,0.14)] transition hover:-translate-y-0.5 ${selected ? tab.color : "bg-white"}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div key={activeTab} className="motion-panel grid gap-4">
        {activeTab === "contact" ? (
          <SectionCard
            title="Kontak pribadi"
            description="Nama dan kontak diletakkan di bagian atas isi CV, bukan di header atau footer dokumen, supaya sistem ATS tetap bisa membacanya."
          >
            <div className="grid gap-3 sm:grid-cols-2">
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
            <Field label="Ringkasan" hint="Hindari kalimat klise seperti pekerja keras dan cepat belajar. Sebut hal yang bisa dibuktikan.">
              <TextArea
                rows={7}
                value={resume.summary}
                onChange={(event) => updateSummary(event.target.value)}
                placeholder="Contoh: lulusan sistem informasi dengan pengalaman magang di bagian data. Terbiasa menyusun laporan bulanan dan merapikan data pelanggan."
              />
            </Field>
          </SectionCard>
        ) : null}

        {activeTab === "experience" ? (
          <SectionCard
            title="Pengalaman kerja dan organisasi"
            description="Tanggal memakai format MM/YYYY, contoh 08/2024. Kalau masih berjalan, tulis Present. Magang MSIB dan pengalaman organisasi boleh dimasukkan di sini."
            actions={<Button type="button" variant="secondary" onClick={addExperience}>Tambah pengalaman</Button>}
          >
            <div className="grid gap-4">
              {resume.workExperience.map((experience) => (
                <div key={experience.id} className="rounded-[22px_15px_24px_17px] border-2 border-line bg-[#e0f6fb] p-4 shadow-[4px_5px_0_rgba(37,24,19,0.12)]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Perusahaan atau organisasi">
                      <TextInput value={experience.company} onChange={(event) => updateExperience(experience.id, { company: event.target.value })} placeholder="Nama perusahaan, MSIB, atau organisasi" />
                    </Field>
                    <Field label="Posisi">
                      <TextInput value={experience.role} onChange={(event) => updateExperience(experience.id, { role: event.target.value })} placeholder="Posisi atau jabatan" />
                    </Field>
                    <Field label="Mulai" hint="Format MM/YYYY.">
                      <TextInput value={experience.startDate} onChange={(event) => updateExperience(experience.id, { startDate: event.target.value })} placeholder="MM/YYYY" />
                    </Field>
                    <Field label="Selesai" hint="Format MM/YYYY, atau tulis Present.">
                      <TextInput value={experience.endDate} onChange={(event) => updateExperience(experience.id, { endDate: event.target.value, isCurrent: event.target.value.toLowerCase() === "present" })} placeholder="MM/YYYY atau Present" />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-2">
                    <p className="text-sm font-black text-ink">Poin pengalaman</p>
                    <p className="text-xs font-semibold leading-5 text-[#57443b]">
                      Satu poin berisi satu hal yang kamu kerjakan dan hasilnya. Kalau ada angkanya, tulis angkanya.
                    </p>
                    {experience.bulletPoints.map((bullet, index) => (
                      <div key={`${experience.id}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <TextArea rows={2} value={bullet} onChange={(event) => updateBullet(experience.id, index, event.target.value)} placeholder="Tulis tindakan, hasil, dan alat yang digunakan." />
                        <Button type="button" variant="danger" onClick={() => removeBullet(experience.id, index)} aria-label={`Hapus poin ke-${index + 1}`}>
                          Hapus
                        </Button>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => addBullet(experience.id)}>
                        Tambah poin
                      </Button>
                      {resume.workExperience.length > 1 ? (
                        <Button type="button" variant="danger" onClick={() => removeExperience(experience.id)}>
                          Hapus pengalaman
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "education" ? (
          <SectionCard
            title="Pendidikan"
            description="Isi IPK dengan skala 4.00 kalau kamu ingin mencantumkannya. Fresh graduate biasanya mencantumkan IPK, yang sudah punya pengalaman kerja biasanya tidak."
            actions={<Button type="button" variant="secondary" onClick={addEducation}>Tambah pendidikan</Button>}
          >
            <div className="grid gap-4">
              {resume.education.map((education) => (
                <div key={education.id} className="rounded-[18px_24px_17px_22px] border-2 border-line bg-[#fff0a8] p-4 shadow-[4px_5px_0_rgba(37,24,19,0.12)]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Institusi">
                      <TextInput value={education.institution} onChange={(event) => updateEducation(education.id, { institution: event.target.value })} placeholder="Universitas atau sekolah" />
                    </Field>
                    <Field label="Jenjang" hint="Contoh: S1, D3, atau bootcamp.">
                      <TextInput value={education.degree} onChange={(event) => updateEducation(education.id, { degree: event.target.value })} placeholder="S1, D3, Bootcamp" />
                    </Field>
                    <Field label="Bidang studi">
                      <TextInput value={education.fieldOfStudy} onChange={(event) => updateEducation(education.id, { fieldOfStudy: event.target.value })} placeholder="Program studi" />
                    </Field>
                    <Field label="IPK" hint="Tulis dengan skala 4.00.">
                      <TextInput value={education.gpa} onChange={(event) => updateEducation(education.id, { gpa: event.target.value })} placeholder="3.75/4.00" />
                    </Field>
                    <Field label="Tahun lulus" hint="Empat angka, contoh 2025.">
                      <TextInput value={education.graduationDate} onChange={(event) => updateEducation(education.id, { graduationDate: event.target.value })} placeholder="2025" />
                    </Field>
                  </div>
                  {resume.education.length > 1 ? (
                    <div className="mt-3">
                      <Button type="button" variant="danger" onClick={() => removeEducation(education.id)}>
                        Hapus pendidikan
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === "skills" ? (
          <SectionCard
            title="Keahlian kamu"
            description="Daftar ini dipakai untuk mencocokkan CV dengan kata kunci lowongan. Tulis keahlian yang benar-benar kamu punya, karena kata kunci yang tidak didukung pengalaman justru terlihat mencurigakan saat wawancara."
          >
            <div className="grid gap-3">
              <Field label="Keahlian teknis" hint="Pisahkan dengan koma atau baris baru.">
                <TextArea rows={4} value={resume.skills.hardSkills.join(", ")} onChange={(event) => updateSkills("hardSkills", splitList(event.target.value))} placeholder="SQL, analisis data, SEO" />
              </Field>
              <Field label="Alat kerja" hint="Alat yang benar-benar pernah kamu pakai.">
                <TextArea rows={4} value={resume.skills.tools.join(", ")} onChange={(event) => updateSkills("tools", splitList(event.target.value))} placeholder="Excel, Figma, Power BI" />
              </Field>
              <Field label="Sikap kerja" hint="Sebutkan sikap yang bisa kamu buktikan dengan cerita pengalaman.">
                <TextArea rows={4} value={resume.skills.softSkills.join(", ")} onChange={(event) => updateSkills("softSkills", splitList(event.target.value))} placeholder="Komunikasi, kolaborasi, pemecahan masalah" />
              </Field>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
};

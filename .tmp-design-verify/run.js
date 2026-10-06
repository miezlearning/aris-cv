const path = require("path");
const fs = require("fs");
const Module = require("module");

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("@/")) {
    return originalResolve.call(this, path.join(__dirname, "out", request.slice(2)), ...rest);
  }
  return originalResolve.call(this, request, ...rest);
};

const { buildPlainTextResume, buildDocxDocument, buildPdfDocument } = require("./out/lib/exporters.js");

const resume = {
  contact: {
    fullName: "Aris Pratama",
    email: "aris.pratama@example.com",
    phone: "0812-3456-7890",
    location: "Jakarta Selatan",
    linkedinUrl: "linkedin.com/in/arispratama",
    portfolioUrl: ""
  },
  summary:
    "Data analyst dengan pengalaman dua tahun menyusun laporan penjualan dan merapikan data pelanggan memakai Excel dan SQL untuk kebutuhan tim penjualan.",
  workExperience: [
    {
      id: "exp-1",
      company: "PT Contoh Sejahtera",
      role: "Data Analyst",
      startDate: "08/2024",
      endDate: "Present",
      isCurrent: true,
      bulletPoints: [
        "Menyusun laporan penjualan mingguan sehingga waktu rekap turun dari 5 hari menjadi 1 hari.",
        "Merapikan data pelanggan memakai SQL dan Excel untuk kebutuhan tim penjualan."
      ]
    },
    {
      id: "exp-2",
      company: "Startup Contoh",
      role: "Intern Data",
      startDate: "01/2024",
      endDate: "06/2024",
      isCurrent: false,
      bulletPoints: ["Membantu menyiapkan dashboard penjualan memakai Power BI."]
    }
  ],
  education: [
    {
      id: "edu-1",
      institution: "Universitas Contoh",
      degree: "S1",
      fieldOfStudy: "Sistem Informasi",
      gpa: "3.75/4.00",
      graduationDate: "2024"
    }
  ],
  skills: {
    hardSkills: ["SQL", "analisis data", "Excel"],
    tools: ["Power BI", "Excel"],
    softSkills: ["komunikasi", "kolaborasi"]
  }
};

fs.writeFileSync(path.join(__dirname, "cv.txt"), buildPlainTextResume(resume), "utf8");

(async () => {
  const { Packer } = require("docx");
  const docxDocument = await buildDocxDocument(resume);
  const docxBuffer = await Packer.toBuffer(docxDocument);
  fs.writeFileSync(path.join(__dirname, "cv.docx"), docxBuffer);
  console.log(`DOCX: ${docxBuffer.length} byte`);

  const { renderToBuffer } = require("@react-pdf/renderer");
  const pdfDocument = await buildPdfDocument(resume);
  const pdfBuffer = await renderToBuffer(pdfDocument);
  fs.writeFileSync(path.join(__dirname, "cv.pdf"), pdfBuffer);
  console.log(`PDF : ${pdfBuffer.length} byte`);

  const collected = [];
  const walk = (node) => {
    if (node === null || node === undefined || typeof node === "boolean") return;
    if (typeof node === "string" || typeof node === "number") {
      collected.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node.props) walk(node.props.children);
  };
  walk(pdfDocument);
  fs.writeFileSync(path.join(__dirname, "pdf-tree-text.txt"), collected.join("\n"), "utf8");
})().catch((error) => {
  console.error("GAGAL:", error && error.message ? error.message : error);
  process.exit(1);
});

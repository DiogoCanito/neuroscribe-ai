import { jsPDF } from 'jspdf';

interface PatientInfo {
  name: string;
  dateOfBirth?: string | null;
  processNumber?: string | null;
}

interface ExamInfo {
  type: string;
  date?: string | null;
}

interface ReportData {
  transcription?: string;
  consultationReason?: string;
  neurologicalExam?: string;
  complementaryExams?: string;
  diagnosis?: string;
  therapeuticPlan?: string;
  observations?: string;
}

interface GeneratePDFOptions {
  patient: PatientInfo;
  exam: ExamInfo;
  report: ReportData;
  doctorName?: string;
}

export function generateReportPDF(options: GeneratePDFOptions): Blob {
  const { patient, exam, report, doctorName } = options;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Helper functions
  const addTitle = (text: string, fontSize: number = 16) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin, y);
    y += fontSize * 0.5;
  };

  const addSection = (title: string, content: string | undefined) => {
    if (!content?.trim()) return;
    
    // Check for page break
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);
    doc.text(title, margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    
    const lines = doc.splitTextToSize(content, contentWidth);
    lines.forEach((line: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += 5;
    });
    
    y += 8;
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  // Header
  doc.setFillColor(15, 76, 117); // Primary color
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO CLÍNICO', margin, 15);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Exame: ${exam.type}`, margin, 25);
  doc.text(`Data: ${formatDate(exam.date)}`, margin, 30);

  y = 50;
  doc.setTextColor(0, 0, 0);

  // Patient Info Box
  doc.setFillColor(245, 247, 250);
  doc.roundedRect(margin, y - 5, contentWidth, 30, 3, 3, 'F');
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICAÇÃO DO DOENTE', margin + 5, y + 3);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${patient.name}`, margin + 5, y + 12);
  doc.text(`Data de Nascimento: ${formatDate(patient.dateOfBirth)}`, margin + 5, y + 19);
  if (patient.processNumber) {
    doc.text(`Nº Processo: ${patient.processNumber}`, margin + 100, y + 19);
  }

  y += 40;

  // Report Sections
  addSection('MOTIVO DA CONSULTA / EXAME', report.consultationReason);
  addSection('ACHADOS DO EXAME NEUROLÓGICO', report.neurologicalExam);
  addSection('EXAMES COMPLEMENTARES', report.complementaryExams);
  addSection('DIAGNÓSTICO / IMPRESSÃO CLÍNICA', report.diagnosis);
  addSection('PLANO TERAPÊUTICO', report.therapeuticPlan);
  addSection('OBSERVAÇÕES', report.observations);

  // Footer with timestamp
  const now = new Date();
  const timestamp = now.toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Go to last page
  const pageCount = doc.internal.pages.length - 1;
  doc.setPage(pageCount);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 275, pageWidth - margin, 275);
  
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Gerado em: ${timestamp}`, margin, 282);
  
  if (doctorName) {
    doc.text(`Médico: ${doctorName}`, pageWidth - margin - 50, 282);
  }

  return doc.output('blob');
}

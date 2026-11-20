import { jsPDF } from 'jspdf';
import type { EnvironmentActionPlan } from '../shared/types';

export function exportActionPlanJson(plan: EnvironmentActionPlan): void {
  const jsonStr = JSON.stringify(plan, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plan.id}-action-plan.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportActionPlanPdf(plan: EnvironmentActionPlan): void {
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text(plan.title, 14, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Municipality: ${plan.municipalityName} | ID: ${plan.id} | Generated: ${new Date(
      plan.generatedAt
    ).toLocaleString()}`,
    14,
    y
  );
  y += 12;

  doc.setTextColor(0);
  doc.setFontSize(13);
  doc.text('Executive Summary', 14, y);
  y += 7;

  doc.setFontSize(10);
  const execLines = doc.splitTextToSize(plan.executiveSummary, 180);
  doc.text(execLines, 14, y);
  y += execLines.length * 6 + 6;

  doc.setFontSize(13);
  doc.text(`Priority Actions (${plan.priorityActions.length})`, 14, y);
  y += 7;

  doc.setFontSize(10);
  plan.priorityActions.forEach((act, idx) => {
    const actLines = doc.splitTextToSize(`${idx + 1}. ${act}`, 180);
    doc.text(actLines, 14, y);
    y += actLines.length * 5 + 3;
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  y += 6;
  doc.setFontSize(13);
  doc.text('Detailed Municipal Interventions', 14, y);
  y += 8;

  plan.recommendations.forEach((rec) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(11);
    doc.text(`[${rec.urgency.toUpperCase()}] ${rec.title}`, 14, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(80);
    doc.text(`Target: ${rec.targetWard} | Dept: ${rec.department} | Cost: ${rec.estimatedCost}`, 14, y);
    y += 5;

    doc.setTextColor(0);
    const descLines = doc.splitTextToSize(rec.description, 180);
    doc.text(descLines, 14, y);
    y += descLines.length * 5 + 6;
  });

  doc.save(`${plan.id}-action-plan.pdf`);
}

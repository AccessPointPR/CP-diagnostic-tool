const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://hlygvrgqjrfohurstvvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhseWd2cmdxanJmb2h1cnN0dnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzY3NzgsImV4cCI6MjA5ODMxMjc3OH0.pBbrxhWOLIxVLXGkeitW17EyvkjDqaBcnGke3ImPMWY';

const DIMS = {
  trust:    { label: 'Confianza',               color: '#14A0B4', bg: '#E3F5F8' },
  conflict: { label: 'Gestión del conflicto',   color: '#993C1D', bg: '#FAECE7' },
  clarity:  { label: 'Claridad',                color: '#854F0B', bg: '#FAEEDA' },
  cohesion: { label: 'Cohesión',                color: '#64B450', bg: '#EBF5E6' },
  psafety:  { label: 'Seguridad psicológica',   color: '#534AB7', bg: '#E5E3FC' },
  impact:   { label: 'Impacto colectivo',       color: '#888780', bg: '#F1EFE8' },
};

const BLOCKERS = {
  trust:    'La confianza es la base de todo. Sin ella, el conflicto se evita, los compromisos son superficiales y la seguridad psicológica es imposible. Este es el punto de palanca más crítico ahora mismo.',
  conflict: 'El equipo evita el conflicto o no lo maneja bien. Eso crea tensiones que van por debajo de la superficie y corroen la colaboración sin que nadie lo nombre directamente.',
  clarity:  'Hay ambigüedad en objetivos o roles. Cuando cada persona tiene una versión distinta de hacia dónde vamos o quién decide qué, la energía del equipo se fragmenta.',
  cohesion: 'El equipo no ha desarrollado normas sólidas ni identidad colectiva. Funciona como grupo de individuos más que como equipo con personalidad propia.',
  psafety:  'Las personas no se sienten seguras expresando ideas, errores o preocupaciones libremente. Eso limita la innovación, el aprendizaje colectivo y la confianza profunda.',
  impact:   'El equipo funciona bien internamente pero no ha desarrollado accountability mutuo ni orientación hacia afuera. Eso limita su influencia organizacional.',
};

const STAGES = [
  { name: 'Forming', sub: 'Conexión antes que contenido', ac: '#888780', al: '#F1EFE8', ad: '#2C2C2A',
    insight: 'Este equipo está en construcción inicial. La prioridad no es la productividad máxima sino la conexión y la claridad de propósito compartido.',
    recs: [
      { tag: 'Sesión', tc: '#64B450', tb: '#EBF5E6', text: 'Taller de team charter: propósito compartido, expectativas mutuas y acuerdos de trabajo desde cero.' },
      { tag: 'Assessment', tc: '#14A0B4', tb: '#E3F5F8', text: 'Momento ideal para DiSC o StrengthsFinder: conocer estilos individuales antes de que se formen patrones difíciles de cambiar.' },
      { tag: 'Experiencia', tc: '#854F0B', tb: '#FAEEDA', text: 'Reto colaborativo de bajo riesgo emocional para construir contexto compartido antes que confianza profunda.' },
    ] },
  { name: 'Storming', sub: 'Estructura antes que armonía', ac: '#993C1D', al: '#FAECE7', ad: '#4A1B0C',
    insight: 'Este equipo está en tensión activa. Esto es normal, pero necesita ser nombrado y trabajado, no ignorado con actividades recreativas.',
    recs: [
      { tag: 'Sesión', tc: '#64B450', tb: '#EBF5E6', text: 'Taller de estilos de conflicto (Thomas-Kilmann): dar lenguaje neutro al conflicto cambia la dinámica del equipo.' },
      { tag: 'Sesión', tc: '#64B450', tb: '#EBF5E6', text: 'Renegociar acuerdos de trabajo. Muchos conflictos en esta etapa son síntoma de normas que nunca se establecieron.' },
      { tag: 'Precaución', tc: '#993C1D', tb: '#FAECE7', text: 'Evita actividades puramente recreativas ahora: el equipo las vive como distracción del conflicto real.' },
    ] },
  { name: 'Norming', sub: 'Sistemas que sostienen la confianza', ac: '#854F0B', al: '#FEF3E2', ad: '#412402',
    insight: 'Este equipo se está estabilizando. Los avances son reales pero frágiles si no se codifican en normas y rituales explícitos que sobrevivan cambios de personas.',
    recs: [
      { tag: 'Sesión', tc: '#64B450', tb: '#EBF5E6', text: 'Taller de normas y rituales: documentar cómo trabajamos, procesos de decisión y protocolos de comunicación.' },
      { tag: 'Assessment', tc: '#534AB7', tb: '#E5E3FC', text: 'DiSC o StrengthsFinder colectivo para ver cómo se complementan los estilos y qué fricciones son de personalidad, no de mala fe.' },
      { tag: 'Experiencia', tc: '#854F0B', tb: '#FAEEDA', text: 'Reto de mediana complejidad que refuerce la identidad colectiva: innovación interna, reto social o experiencia con roles cruzados.' },
    ] },
  { name: 'Performing', sub: 'Reto antes que comodidad', ac: '#64B450', al: '#E1F5EE', ad: '#4A8A39',
    insight: 'Este equipo ejecuta bien. El siguiente reto es pasar de rendimiento a seguridad psicológica real: donde el equipo puede decir verdades difíciles sin costo.',
    recs: [
      { tag: 'Sesión', tc: '#534AB7', tb: '#E5E3FC', text: 'Feedback 360 y retrospectiva profunda: revisar patrones del equipo, no solo resultados de productividad.' },
      { tag: 'Experiencia', tc: '#854F0B', tb: '#FAEEDA', text: 'Reto de alta complejidad con debriefing: hackathon, design sprint o simulación de crisis.' },
      { tag: 'Assessment', tc: '#14A0B4', tb: '#E3F5F8', text: 'Working Genius (Lencioni) para identificar cómo cada persona contribuye al trabajo colectivo y dónde hay energía desperdiciada.' },
    ] },
  { name: 'High Performing', sub: 'Seguridad psicológica como marcador clave', ac: '#14A0B4', al: '#E6F1FB', ad: '#0C7A8A',
    insight: 'Este equipo ha alcanzado confianza y seguridad psicológica reales. El foco ahora es sostenerlo y expandir su impacto hacia otros equipos y la organización.',
    recs: [
      { tag: 'Sesión', tc: '#534AB7', tb: '#E5E3FC', text: 'Auditoría de seguridad psicológica (Edmondson Scale) para identificar zonas de autocensura o asimetría que aún no se ven.' },
      { tag: 'Sesión', tc: '#64B450', tb: '#EBF5E6', text: 'Sesión de visión de legado: qué queremos que digan de este equipo en 3 años. Future-back visioning.' },
      { tag: 'Multiplicador', tc: '#534AB7', tb: '#E5E3FC', text: 'Diseñar cómo este equipo puede servir a otros: comunidad de práctica, mentoría a equipos más jóvenes, exportar sus normas.' },
    ] },
  { name: 'Generative', sub: 'Equipos que multiplican impacto hacia afuera', ac: '#534AB7', al: '#EEEDFE', ad: '#26215C',
    insight: 'Este equipo opera más allá de sí mismo. El trabajo ahora es institucionalizar esa generatividad para que sobreviva cambios y rotaciones.',
    recs: [
      { tag: 'Multiplicador', tc: '#534AB7', tb: '#E5E3FC', text: 'Formalizar el rol multiplicador: programas de mentoría, playbooks de cultura o comunidades de práctica con otros equipos.' },
      { tag: 'Sesión', tc: '#64B450', tb: '#EBF5E6', text: 'Succession y knowledge transfer: documentar el ADN del equipo para que el conocimiento no se vaya cuando se va una persona.' },
      { tag: 'Experiencia', tc: '#14A0B4', tb: '#E3F5F8', text: 'Proyecto de impacto colectivo: voluntariado significativo, colaboración con otra organización o iniciativa de transferencia de conocimiento.' },
    ] },
];

const GAP_INSIGHT = 'Este equipo tiene fortalezas reales en cómo se relaciona y opera. Sin embargo, aún no ha construido las prácticas deliberadas que convierten esas fortalezas en algo sostenible cuando cambia la gente. Esa es la diferencia entre un equipo naturalmente bueno y uno intencionalmente desarrollado.';

function buildPDF({ name, org, stage, stageIndex, scores, gapped }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 0 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 612, H = 792, ML = 36, CW = W - 72;
    const st = STAGES[stageIndex];
    const bl = Object.entries(scores).reduce((a, b) => b[1] < a[1] ? b : a)[0];
    const bld = DIMS[bl];
    const date = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    // HEADER
    doc.rect(0, 0, W, 52).fill('#282828');
    doc.rect(0, 0, W, 5).fill('#64B450');
    try {
      const logoBuf = fs.readFileSync(path.join(__dirname, 'logo.png'));
      doc.image(logoBuf, ML, 13, { height: 28 });
    } catch (_) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF').text('CenterPoint', ML, 20);
    }
    doc.font('Helvetica').fontSize(7).fillColor('#94A3B8')
       .text('Where teams grow together. And move forward.', ML, 24, { width: CW, align: 'right' });

    // TITLE
    let y = 66;
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#282828').text('Diagnóstico de Equipo', ML, y, { width: CW });
    y += 28;
    doc.font('Helvetica').fontSize(9.5).fillColor('#6B7280');
    const meta = [name, org].filter(Boolean);
    if (meta.length) { doc.text(meta.join(' - '), ML, y, { width: CW }); y += 14; }
    doc.text(date, ML, y, { width: CW });
    y += 20;

    // STAGE CARD
    doc.roundedRect(ML, y, CW, 54, 4).fill(st.al);
    doc.roundedRect(ML, y, CW, 5, 2).fill(st.ac);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(st.ac)
       .text('0' + (stageIndex + 1) + ' - ' + st.name, ML + 14, y + 13, { width: CW - 28 });
    doc.font('Helvetica').fontSize(9.5).fillColor(st.ad)
       .text(st.sub, ML + 14, y + 32, { width: CW - 28 });
    y += 64;

    // INSIGHT
    const iH = doc.heightOfString(st.insight, { width: CW - 24 }) + 20;
    doc.roundedRect(ML, y, CW, iH, 3).fill('#F5F5F5');
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#374151')
       .text(st.insight, ML + 12, y + 10, { width: CW - 24 });
    y += iH + 8;

    // GAP
    if (gapped) {
      const gH = doc.heightOfString(GAP_INSIGHT, { width: CW - 22 }) + 20;
      doc.roundedRect(ML, y, CW, gH, 3).fill('#EBF5E6');
      doc.rect(ML, y, 4, gH).fill('#64B450');
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#374151')
         .text(GAP_INSIGHT, ML + 14, y + 10, { width: CW - 22 });
      y += gH + 8;
    }

    // DIMENSIONS
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6B7280').text('PERFIL DE DIMENSIONES', ML, y, { width: CW, characterSpacing: 0.5 });
    y += 7;
    doc.moveTo(ML, y).lineTo(W - ML, y).lineWidth(0.3).stroke('#E5E7EB');
    y += 6;
    const barX = ML + 195, barW = CW - 200;
    Object.entries(scores).forEach(([k, v]) => {
      const d = DIMS[k];
      const fillW = Math.max(0, Math.round(((v - 1) / 4) * barW));
      doc.font('Helvetica').fontSize(8.5).fillColor('#111').text(d.label, ML, y + 3, { width: 140, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(d.color)
         .text(parseFloat(v).toFixed(1) + '/5', ML + 145, y + 3, { width: 44, align: 'right', lineBreak: false });
      doc.roundedRect(barX, y + 5, barW, 4, 1).fill('#E5E7EB');
      if (fillW > 0) doc.roundedRect(barX, y + 5, fillW, 4, 1).fill(d.color);
      y += 16;
    });
    y += 8;

    // CRITICAL FACTOR
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6B7280').text('FACTOR CRÍTICO', ML, y, { width: CW });
    y += 8;
    const bTxt = BLOCKERS[bl];
    const bH = doc.heightOfString(bTxt, { width: CW - 20 }) + 26;
    doc.roundedRect(ML, y, CW, bH, 3).fill(bld.bg);
    doc.rect(ML, y, 4, bH).fill(bld.color);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(bld.color).text(bld.label, ML + 14, y + 9, { width: CW - 20 });
    doc.font('Helvetica').fontSize(8.5).fillColor(bld.color).text(bTxt, ML + 14, y + 22, { width: CW - 20 });
    y += bH + 10;

    // RECOMMENDATIONS
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6B7280').text('PRÓXIMOS PASOS RECOMENDADOS', ML, y, { width: CW });
    y += 7;
    doc.moveTo(ML, y).lineTo(W - ML, y).lineWidth(0.3).stroke('#E5E7EB');
    y += 6;
    st.recs.forEach(rec => {
      const rH = doc.heightOfString(rec.text, { width: CW - 58 }) + 22;
      doc.roundedRect(ML, y, CW, rH, 3).lineWidth(0.3).fillAndStroke('#FFFFFF', '#E5E7EB');
      doc.roundedRect(ML + 8, y + Math.floor((rH - 16) / 2), 38, 14, 2).fill(rec.tb);
      doc.font('Helvetica-Bold').fontSize(6).fillColor(rec.tc)
         .text(rec.tag, ML + 8, y + Math.floor((rH - 16) / 2) + 4, { width: 38, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(rec.text, ML + 52, y + 11, { width: CW - 58 });
      y += rH + 4;
    });

    // FOOTER
    doc.rect(0, H - 24, W, 24).fill('#282828');
    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
       .text('CenterPoint - Team Development Model - centerpointpr.com', 0, H - 16, { width: W, align: 'center' });

    doc.end();
  });
}

function buildEmailHtml({ name, org, stage, stageIndex, scores }) {
  const greeting = name ? 'Hola, ' + name : 'Hola';
  const orgLine = org ? '<p style="margin:0 0 4px;color:#6B7280;font-size:14px">' + org + '</p>' : '';
  const dimRows = Object.entries(scores).map(([k, v]) => {
    const pct = Math.round(((v - 1) / 4) * 100);
    return '<tr><td style="padding:6px 0;font-size:13px;color:#374151;width:180px">' + DIMS[k].label + '</td>' +
      '<td style="padding:6px 0"><div style="background:#E5E7EB;border-radius:4px;height:8px;width:180px">' +
      '<div style="background:#64B450;border-radius:4px;height:8px;width:' + Math.round(pct * 1.8) + 'px"></div></div></td>' +
      '<td style="padding:6px 0 6px 10px;font-size:13px;color:#374151;font-weight:500">' + parseFloat(v).toFixed(1) + '/5</td></tr>';
  }).join('');

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,sans-serif">' +
    '<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">' +
    '<div style="background:#282828;padding:20px 28px"><span style="font-size:15px;font-weight:600;color:#fff">CenterPoint</span>' +
    '<span style="font-size:12px;color:#94A3B8;margin-left:10px">Team Development Model</span></div>' +
    '<div style="padding:28px">' +
    '<p style="margin:0 0 16px;font-size:16px;color:#111">' + greeting + ',</p>' +
    '<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7">Gracias por completar el <strong>Diagnóstico de Equipo CenterPoint</strong>. Adjunto encontrarás tu resultado en PDF.</p>' +
    orgLine +
    '<div style="background:#F3F4F6;border-radius:10px;padding:16px 20px;margin-bottom:20px">' +
    '<p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em">Etapa del equipo</p>' +
    '<p style="margin:0;font-size:22px;font-weight:600;color:#111">0' + (stageIndex + 1) + ' - ' + stage + '</p></div>' +
    '<p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase">Perfil de dimensiones</p>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:24px"><tbody>' + dimRows + '</tbody></table>' +
    '<p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.7">¿Quieres profundizar en estos resultados? <strong>Conversemos.</strong></p>' +
    '<a href="mailto:equipo@centerpointpr.com" style="display:inline-block;background:#64B450;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500">Contactar al equipo</a>' +
    '</div><div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 28px;text-align:center">' +
    '<p style="margin:0;font-size:11px;color:#9CA3AF">CenterPoint - Team Development Model - centerpointpr.com</p>' +
    '</div></div></body></html>';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }, body: '' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let payload;
  try { payload = JSON.parse(event.body); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

  const { name, org, email, stage, stageIndex, scores, gapped, action } = payload;
  const errors = [];

  // 1. Save to Supabase (skip if action === 'email')
  if (action !== 'email') {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/diagnostic_results`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ name: name || null, org: org || null, email: email || null, stage, stage_index: stageIndex, scores, created_at: new Date().toISOString() }),
      });
      if (!res.ok) errors.push('Supabase: ' + res.status + ' ' + await res.text());
    } catch (err) { errors.push('Supabase: ' + err.message); }
  }

  // 2. Generate PDF + Send email (skip if action === 'save')
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (action !== 'save' && email && RESEND_KEY) {
    try {
      const pdfBuffer = await buildPDF({ name, org, stage, stageIndex, scores, gapped: !!gapped });
      const pdfB64 = pdfBuffer.toString('base64');
      const namePart = [org, name].filter(Boolean)[0];
      const fname = 'CenterPoint_Diagnostico' + (namePart ? '_' + namePart.replace(/\s+/g, '_') : '') + '.pdf';

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'CenterPoint <equipo@centerpointpr.com>',
          to: [email],
          subject: 'Tu diagnostico de equipo - Etapa: ' + stage,
          html: buildEmailHtml(payload),
          attachments: [{ filename: fname, content: pdfB64 }],
        }),
      });
      if (!res.ok) errors.push('Resend: ' + res.status + ' ' + await res.text());
    } catch (err) { errors.push('Email/PDF: ' + err.message); }
  }

  return {
    statusCode: errors.length ? 207 : 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: errors.length === 0, errors }),
  };
};

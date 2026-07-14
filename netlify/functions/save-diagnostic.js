const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://hlygvrgqjrfohurstvvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhseWd2cmdxanJmb2h1cnN0dnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzY3NzgsImV4cCI6MjA5ODMxMjc3OH0.pBbrxhWOLIxVLXGkeitW17EyvkjDqaBcnGke3ImPMWY';

const ES_DIMS = {
  trust:    { label: 'Confianza',               color: '#14A0B4', bg: '#E3F5F8' },
  conflict: { label: 'Gestión del conflicto',   color: '#993C1D', bg: '#FAECE7' },
  clarity:  { label: 'Claridad',                color: '#854F0B', bg: '#FAEEDA' },
  cohesion: { label: 'Pertenencia',             color: '#64B450', bg: '#EBF5E6' },
  psafety:  { label: 'Seguridad psicológica',   color: '#534AB7', bg: '#E5E3FC' },
  impact:   { label: 'Orientación externa',     color: '#888780', bg: '#F1EFE8' },
};
const EN_DIMS = {
  trust:    { label: 'Trust',                   color: '#14A0B4', bg: '#E3F5F8' },
  conflict: { label: 'Conflict management',     color: '#993C1D', bg: '#FAECE7' },
  clarity:  { label: 'Clarity',                 color: '#854F0B', bg: '#FAEEDA' },
  cohesion: { label: 'Belonging',               color: '#64B450', bg: '#EBF5E6' },
  psafety:  { label: 'Psychological safety',    color: '#534AB7', bg: '#E5E3FC' },
  impact:   { label: 'External orientation',   color: '#888780', bg: '#F1EFE8' },
};

const ES_BLOCKERS = {
  trust:    'La confianza es la base de todo. Sin ella, el conflicto se evita, los compromisos son superficiales y la seguridad psicológica es imposible. Este es el punto de palanca más crítico ahora mismo.',
  conflict: 'El equipo evita el conflicto o no lo maneja bien. Eso crea tensiones que van por debajo de la superficie y corroen la colaboración sin que nadie lo nombre directamente.',
  clarity:  'Hay ambigüedad en objetivos o roles. Cuando cada persona tiene una versión distinta de hacia dónde vamos o quién decide qué, la energía del equipo se fragmenta.',
  cohesion: 'El equipo no ha desarrollado normas sólidas ni identidad colectiva. Funciona como grupo de individuos más que como equipo con personalidad propia.',
  psafety:  'Las personas no se sienten seguras expresando ideas, errores o preocupaciones libremente. Eso limita la innovación, el aprendizaje colectivo y la confianza profunda.',
  impact:   'El equipo funciona bien internamente pero no ha desarrollado accountability mutuo ni orientación hacia afuera. Eso limita su influencia organizacional.',
};
const EN_BLOCKERS = {
  trust:    'Trust is the foundation of everything. Without it, conflict is avoided, commitments are superficial, and psychological safety is impossible. This is the most critical leverage point right now.',
  conflict: "The team avoids conflict or doesn't handle it well. This creates tensions that run beneath the surface and erode collaboration without anyone naming them directly.",
  clarity:  "There is ambiguity in goals or roles. When each person has a different version of where we're going or who decides what, the team's energy fragments.",
  cohesion: 'The team has not developed solid norms or a collective identity. It functions as a group of individuals rather than a team with its own personality.',
  psafety:  "People don't feel safe expressing ideas, mistakes, or concerns freely. This limits innovation, collective learning, and deep trust.",
  impact:   'The team functions well internally but has not developed mutual accountability or outward orientation. This limits its organizational influence.',
};

const ES_STAGES = [
  { name: 'Forming', sub: 'Conexión antes que contenido', ac: '#888780', al: '#F1EFE8', ad: '#2C2C2A',
    insight: 'Este equipo está en construcción inicial. La prioridad no es la productividad máxima sino la conexión y la claridad de propósito compartido.',
    recs: [
      { ef: 'Estructural', ec: '#0F6E56', tag: 'Sesión de trabajo', tc: '#64B450', tb: '#EBF5E6', text: 'Taller de team charter: propósito compartido, expectativas mutuas y acuerdos de trabajo desde cero.' },
      { ef: 'Estructural', ec: '#0F6E56', tag: 'Assessment',        tc: '#14A0B4', tb: '#E3F5F8', text: 'Momento ideal para DiSC o StrengthsFinder: conocer estilos individuales antes de que se formen patrones difíciles de cambiar.' },
      { ef: 'Vivencial',   ec: '#854F0B', tag: 'Experiencia',       tc: '#854F0B', tb: '#FAEEDA', text: 'Reto colaborativo de bajo riesgo emocional para construir contexto compartido antes que confianza profunda.' },
    ] },
  { name: 'Storming', sub: 'Estructura antes que armonía', ac: '#993C1D', al: '#FAECE7', ad: '#4A1B0C',
    insight: 'Este equipo está en tensión activa. Esto es normal, pero necesita ser nombrado y trabajado, no ignorado con actividades recreativas.',
    recs: [
      { ef: 'Estructural', ec: '#0F6E56', tag: 'Sesión de trabajo', tc: '#64B450', tb: '#EBF5E6', text: 'Taller de estilos de conflicto (Thomas-Kilmann): dar lenguaje neutro al conflicto cambia la dinámica del equipo.' },
      { ef: 'Estructural', ec: '#0F6E56', tag: 'Sesión de trabajo', tc: '#64B450', tb: '#EBF5E6', text: 'Renegociar acuerdos de trabajo. Muchos conflictos en esta etapa son síntoma de normas que nunca se establecieron.' },
      { tag: 'Precaución',                tc: '#993C1D', tb: '#FAECE7', text: 'Evita actividades puramente recreativas ahora: el equipo las vive como distracción del conflicto real.' },
    ] },
  { name: 'Norming', sub: 'Sistemas que sostienen la confianza', ac: '#854F0B', al: '#FEF3E2', ad: '#412402',
    insight: 'Este equipo se está estabilizando. Los avances son reales pero frágiles si no se codifican en normas y rituales explícitos que sobrevivan cambios de personas.',
    recs: [
      { ef: 'Estructural', ec: '#0F6E56', tag: 'Sesión de trabajo', tc: '#64B450', tb: '#EBF5E6', text: 'Taller de normas y rituales: documentar cómo trabajamos, procesos de decisión y protocolos de comunicación.' },
      { ef: 'Estructural', ec: '#0F6E56', tag: 'Assessment',        tc: '#534AB7', tb: '#E5E3FC', text: 'DiSC o StrengthsFinder colectivo para ver cómo se complementan los estilos y qué fricciones son de personalidad, no de mala fe.' },
      { ef: 'Vivencial',   ec: '#854F0B', tag: 'Experiencia',       tc: '#854F0B', tb: '#FAEEDA', text: 'Reto de mediana complejidad que refuerce la identidad colectiva: innovación interna, reto social o experiencia con roles cruzados.' },
      { ef: 'Vivencial',   ec: '#854F0B', tag: 'Experiencia',       tc: '#854F0B', tb: '#FAEEDA', text: 'LEGO Serious Play: construir modelos físicos para hacer visible cómo el equipo se ve a sí mismo, sus acuerdos y su identidad colectiva.' },
    ] },
  { name: 'Performing', sub: 'Reto antes que comodidad', ac: '#64B450', al: '#E1F5EE', ad: '#4A8A39',
    insight: 'Este equipo ejecuta bien. El siguiente reto es pasar de rendimiento a seguridad psicológica real: donde el equipo puede decir verdades difíciles sin costo.',
    recs: [
      { ef: 'Reflexivo',   ec: '#534AB7', tag: 'Sesión de trabajo', tc: '#534AB7', tb: '#E5E3FC', text: 'Feedback 360 y retrospectiva profunda: revisar patrones del equipo, no solo resultados de productividad.' },
      { ef: 'Vivencial',   ec: '#854F0B', tag: 'Experiencia',       tc: '#854F0B', tb: '#FAEEDA', text: 'Reto de alta complejidad con debriefing: hackathon, design sprint o simulación de crisis.' },
      { ef: 'Estructural', ec: '#0F6E56', tag: 'Assessment',        tc: '#14A0B4', tb: '#E3F5F8', text: 'Working Genius (Lencioni) para identificar cómo cada persona contribuye al trabajo colectivo y dónde hay energía desperdiciada.' },
      { ef: 'Reflexivo',   ec: '#534AB7', tag: 'Experiencia',       tc: '#854F0B', tb: '#FAEEDA', text: 'LEGO Serious Play: mapear modelos mentales del equipo, patrones de colaboración o visión estratégica a través de construcción física y debrief estructurado.' },
    ] },
  { name: 'High Performing', sub: 'Seguridad psicológica como marcador clave', ac: '#14A0B4', al: '#E6F1FB', ad: '#0C7A8A',
    insight: 'Este equipo ha alcanzado confianza y seguridad psicológica reales. El foco ahora es sostenerlo y expandir su impacto hacia otros equipos y la organización.',
    recs: [
      { ef: 'Reflexivo',     ec: '#534AB7', tag: 'Sesión de trabajo', tc: '#534AB7', tb: '#E5E3FC', text: 'Auditoría de seguridad psicológica (Edmondson Scale) para identificar zonas de autocensura o asimetría que aún no se ven.' },
      { ef: 'Reflexivo',     ec: '#534AB7', tag: 'Sesión de trabajo', tc: '#64B450', tb: '#EBF5E6', text: 'Sesión de visión de legado: qué queremos que digan de este equipo en 3 años. Future-back visioning.' },
      { ef: 'Multiplicador', ec: '#534AB7', tag: 'Proyecto',          tc: '#534AB7', tb: '#E5E3FC', text: 'Diseñar cómo este equipo puede servir a otros: comunidad de práctica, mentoría a equipos más jóvenes, exportar sus normas.' },
    ] },
  { name: 'Generative', sub: 'Equipos que multiplican impacto hacia afuera', ac: '#534AB7', al: '#EEEDFE', ad: '#26215C',
    insight: 'Este equipo opera más allá de sí mismo. El trabajo ahora es institucionalizar esa generatividad para que sobreviva cambios y rotaciones.',
    recs: [
      { ef: 'Multiplicador', ec: '#534AB7', tag: 'Proyecto',          tc: '#534AB7', tb: '#E5E3FC', text: 'Formalizar el rol multiplicador: programas de mentoría, playbooks de cultura o comunidades de práctica con otros equipos.' },
      { ef: 'Reflexivo',     ec: '#534AB7', tag: 'Sesión de trabajo', tc: '#64B450', tb: '#EBF5E6', text: 'Succession y knowledge transfer: documentar el ADN del equipo para que el conocimiento no se vaya cuando se va una persona.' },
      { ef: 'Conectivo',     ec: '#185FA5', tag: 'Experiencia',       tc: '#14A0B4', tb: '#E3F5F8', text: 'Proyecto de impacto colectivo: voluntariado significativo, colaboración con otra organización o iniciativa de transferencia de conocimiento.' },
    ] },
];

const EN_STAGES = [
  { name: 'Forming', sub: 'Connection before content', ac: '#888780', al: '#F1EFE8', ad: '#2C2C2A',
    insight: 'This team is in early formation. The priority is not maximum productivity but connection and clarity of shared purpose.',
    recs: [
      { ef: 'Structural',   ec: '#0F6E56', tag: 'Working session', tc: '#64B450', tb: '#EBF5E6', text: 'Team charter workshop: shared purpose, mutual expectations, and working agreements from scratch.' },
      { ef: 'Structural',   ec: '#0F6E56', tag: 'Assessment',      tc: '#14A0B4', tb: '#E3F5F8', text: 'Ideal moment for DiSC or StrengthsFinder: learn individual styles before patterns that are hard to change form.' },
      { ef: 'Vivential', ec: '#854F0B', tag: 'Experience',      tc: '#854F0B', tb: '#FAEEDA', text: 'Low emotional-risk collaborative challenge to build shared context before deep trust.' },
    ] },
  { name: 'Storming', sub: 'Structure before harmony', ac: '#993C1D', al: '#FAECE7', ad: '#4A1B0C',
    insight: 'This team is in active tension. This is normal, but it needs to be named and worked through, not ignored with recreational activities.',
    recs: [
      { ef: 'Structural', ec: '#0F6E56', tag: 'Working session', tc: '#64B450', tb: '#EBF5E6', text: 'Conflict styles workshop (Thomas-Kilmann): giving neutral language to conflict changes team dynamics.' },
      { ef: 'Structural', ec: '#0F6E56', tag: 'Working session', tc: '#64B450', tb: '#EBF5E6', text: 'Renegotiate working agreements. Many conflicts at this stage are symptoms of norms that were never established.' },
      { tag: 'Caution',                   tc: '#993C1D', tb: '#FAECE7', text: 'Avoid purely recreational activities now: the team experiences them as a distraction from the real conflict.' },
    ] },
  { name: 'Norming', sub: 'Systems that sustain trust', ac: '#854F0B', al: '#FEF3E2', ad: '#412402',
    insight: 'This team is stabilizing. Progress is real but fragile if not codified in explicit norms and rituals that survive changes in people.',
    recs: [
      { ef: 'Structural',   ec: '#0F6E56', tag: 'Working session', tc: '#64B450', tb: '#EBF5E6', text: 'Norms and rituals workshop: document how we work, decision processes, and communication protocols.' },
      { ef: 'Structural',   ec: '#0F6E56', tag: 'Assessment',      tc: '#534AB7', tb: '#E5E3FC', text: 'Collective DiSC or StrengthsFinder to see how styles complement each other and what frictions are personality, not bad faith.' },
      { ef: 'Vivential', ec: '#854F0B', tag: 'Experience',      tc: '#854F0B', tb: '#FAEEDA', text: 'Mid-complexity challenge that reinforces collective identity: internal innovation, social challenge, or cross-role experience.' },
      { ef: 'Vivential', ec: '#854F0B', tag: 'Experience',      tc: '#854F0B', tb: '#FAEEDA', text: 'LEGO Serious Play: build physical models to make visible how the team sees itself, its agreements, and collective identity.' },
    ] },
  { name: 'Performing', sub: 'Challenge before comfort', ac: '#64B450', al: '#E1F5EE', ad: '#4A8A39',
    insight: 'This team executes well. The next challenge is moving from performance to real psychological safety: where the team can say difficult truths without cost.',
    recs: [
      { ef: 'Reflective',   ec: '#534AB7', tag: 'Working session', tc: '#534AB7', tb: '#E5E3FC', text: '360 feedback and deep retrospective: reviewing team patterns, not just productivity results.' },
      { ef: 'Vivential', ec: '#854F0B', tag: 'Experience',      tc: '#854F0B', tb: '#FAEEDA', text: 'High-complexity challenge with debrief: hackathon, design sprint, or crisis simulation.' },
      { ef: 'Structural',   ec: '#0F6E56', tag: 'Assessment',      tc: '#14A0B4', tb: '#E3F5F8', text: 'Working Genius (Lencioni) to identify how each person contributes to collective work and where energy is wasted.' },
      { ef: 'Reflective',   ec: '#534AB7', tag: 'Experience',      tc: '#854F0B', tb: '#FAEEDA', text: 'LEGO Serious Play: map team mental models, collaboration patterns, or strategic vision through physical construction and structured debrief.' },
    ] },
  { name: 'High Performing', sub: 'Psychological safety as the key marker', ac: '#14A0B4', al: '#E6F1FB', ad: '#0C7A8A',
    insight: 'This team has achieved real trust and psychological safety. The focus now is sustaining it and expanding its impact to other teams and the organization.',
    recs: [
      { ef: 'Reflective', ec: '#534AB7', tag: 'Working session', tc: '#534AB7', tb: '#E5E3FC', text: 'Psychological safety audit (Edmondson Scale) to identify zones of self-censorship or asymmetry not yet visible.' },
      { ef: 'Reflective', ec: '#534AB7', tag: 'Working session', tc: '#64B450', tb: '#EBF5E6', text: 'Legacy vision session: what do we want others to say about this team in 3 years? Future-back visioning.' },
      { ef: 'Multiplier', ec: '#534AB7', tag: 'Project',         tc: '#534AB7', tb: '#E5E3FC', text: 'Design how this team can serve others: community of practice, mentoring younger teams, exporting its norms.' },
    ] },
  { name: 'Generative', sub: 'Teams that multiply impact outward', ac: '#534AB7', al: '#EEEDFE', ad: '#26215C',
    insight: 'This team operates beyond itself. The work now is to institutionalize that generativity so it survives changes and rotations.',
    recs: [
      { ef: 'Multiplier',  ec: '#534AB7', tag: 'Project',         tc: '#534AB7', tb: '#E5E3FC', text: 'Formalize the multiplier role: mentoring programs, culture playbooks, or communities of practice with other teams.' },
      { ef: 'Reflective',  ec: '#534AB7', tag: 'Working session', tc: '#64B450', tb: '#EBF5E6', text: "Succession and knowledge transfer: document the team's DNA so knowledge doesn't leave when people do." },
      { ef: 'Connective',  ec: '#185FA5', tag: 'Experience',      tc: '#14A0B4', tb: '#E3F5F8', text: 'Collective impact project: meaningful volunteering, collaboration with another organization, or knowledge transfer initiative.' },
    ] },
];

const ES_GAP_INSIGHT = 'Este equipo tiene fortalezas reales en cómo se relaciona y opera. Sin embargo, aún no ha construido las prácticas deliberadas que convierten esas fortalezas en algo sostenible cuando cambia la gente. Esa es la diferencia entre un equipo naturalmente bueno y uno intencionalmente desarrollado.';
const EN_GAP_INSIGHT = "This team has real strengths in how it relates and operates. However, it has not yet built the deliberate practices that turn those strengths into something sustainable when people change. That's the difference between a naturally good team and an intentionally developed one.";

const UI = {
  es: {
    pdfTitle: 'Diagnóstico de Equipo',
    secDims: 'PERFIL DE DIMENSIONES',
    secFactor: 'FACTOR CRÍTICO',
    secRecs: 'PRÓXIMOS PASOS RECOMENDADOS',
    emailSubject: (stage) => 'Tu diagnóstico de equipo - Etapa: ' + stage,
    emailGreeting: (name) => name ? 'Hola, ' + name : 'Hola',
    emailIntro: 'Gracias por completar el <strong>Diagnóstico de Equipo CenterPoint</strong>. Adjunto encontrarás tu resultado en PDF.',
    emailStageLabel: 'Etapa del equipo',
    emailDimsLabel: 'Perfil de dimensiones',
    emailCta: '¿Quieres profundizar en estos resultados? <strong>Conversemos.</strong>',
    emailBtn: 'Agendar conversación',
    emailModelBtn: 'Acceder al modelo completo',
    notifSubject: (name, stage) => 'Nuevo diagnóstico: ' + (name || 'Anónimo') + ' — ' + stage,
    notifBody: (name, org, email, stage) =>
      '<p>Nuevo diagnóstico completado.</p><ul>' +
      '<li><strong>Nombre:</strong> ' + (name || '—') + '</li>' +
      '<li><strong>Organización:</strong> ' + (org || '—') + '</li>' +
      '<li><strong>Email:</strong> ' + (email || '—') + '</li>' +
      '<li><strong>Etapa:</strong> ' + stage + '</li>' +
      '<li><strong>Idioma:</strong> Español</li></ul>',
    filename: (namePart) => 'CenterPoint_Diagnostico' + (namePart ? '_' + namePart.replace(/\s+/g, '_') : '') + '.pdf',
    htmlLang: 'es',
  },
  en: {
    pdfTitle: 'Team Diagnostic',
    secDims: 'DIMENSION PROFILE',
    secFactor: 'CRITICAL FACTOR',
    secRecs: 'RECOMMENDED NEXT STEPS',
    emailSubject: (stage) => 'Your team diagnostic - Stage: ' + stage,
    emailGreeting: (name) => name ? 'Hi, ' + name : 'Hi',
    emailIntro: 'Thank you for completing the <strong>CenterPoint Team Diagnostic</strong>. Your results are attached as a PDF.',
    emailStageLabel: 'Team stage',
    emailDimsLabel: 'Dimension profile',
    emailCta: 'Want to go deeper into these results? <strong>Let\'s talk.</strong>',
    emailBtn: 'Schedule a conversation',
    emailModelBtn: 'Access the full model',
    notifSubject: (name, stage) => 'New diagnostic (EN): ' + (name || 'Anonymous') + ' — ' + stage,
    notifBody: (name, org, email, stage) =>
      '<p>New diagnostic completed (English).</p><ul>' +
      '<li><strong>Name:</strong> ' + (name || '—') + '</li>' +
      '<li><strong>Organization:</strong> ' + (org || '—') + '</li>' +
      '<li><strong>Email:</strong> ' + (email || '—') + '</li>' +
      '<li><strong>Stage:</strong> ' + stage + '</li>' +
      '<li><strong>Language:</strong> English</li></ul>',
    filename: (namePart) => 'CenterPoint_TeamDiagnostic' + (namePart ? '_' + namePart.replace(/\s+/g, '_') : '') + '.pdf',
    htmlLang: 'en',
  },
};

function buildPDF({ name, org, stage, stageIndex, scores, gapped, lang }) {
  const L = lang === 'en' ? 'en' : 'es';
  const DIMS = L === 'en' ? EN_DIMS : ES_DIMS;
  const BLOCKERS = L === 'en' ? EN_BLOCKERS : ES_BLOCKERS;
  const STAGES = L === 'en' ? EN_STAGES : ES_STAGES;
  const GAP_INSIGHT = L === 'en' ? EN_GAP_INSIGHT : ES_GAP_INSIGHT;
  const u = UI[L];

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
    const dateLocale = L === 'en' ? 'en-US' : 'es-ES';
    const date = new Date().toLocaleDateString(dateLocale, { year: 'numeric', month: 'long', day: 'numeric' });

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
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#282828').text(u.pdfTitle, ML, y, { width: CW });
    y += 28;
    doc.font('Helvetica').fontSize(9.5).fillColor('#6B7280');
    const meta = [name, org].filter(Boolean);
    if (meta.length) { doc.text(meta.join(' - '), ML, y, { width: CW }); y += 14; }
    doc.text(date, ML, y, { width: CW });
    y += 24;

    // STAGE CARD
    doc.roundedRect(ML, y, CW, 54, 4).fill(st.al);
    doc.roundedRect(ML, y, CW, 5, 2).fill(st.ac);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(st.ac)
       .text('0' + (stageIndex + 1) + ' - ' + st.name, ML + 14, y + 13, { width: CW - 28 });
    doc.font('Helvetica').fontSize(9.5).fillColor(st.ad)
       .text(st.sub, ML + 14, y + 32, { width: CW - 28 });
    y += 70;

    // INSIGHT
    const iH = doc.heightOfString(st.insight, { width: CW - 24 }) + 24;
    doc.roundedRect(ML, y, CW, iH, 3).fill('#F5F5F5');
    doc.font('Helvetica-Oblique').fontSize(9).fillColor('#374151')
       .text(st.insight, ML + 12, y + 12, { width: CW - 24 });
    y += iH + 14;

    // GAP
    if (gapped) {
      const gH = doc.heightOfString(GAP_INSIGHT, { width: CW - 22 }) + 24;
      doc.roundedRect(ML, y, CW, gH, 3).fill('#EBF5E6');
      doc.rect(ML, y, 4, gH).fill('#64B450');
      doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#374151')
         .text(GAP_INSIGHT, ML + 14, y + 12, { width: CW - 22 });
      y += gH + 14;
    }

    // DIMENSIONS
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6B7280').text(u.secDims, ML, y, { width: CW, characterSpacing: 0.5 });
    y += 8;
    doc.moveTo(ML, y).lineTo(W - ML, y).lineWidth(0.3).stroke('#E5E7EB');
    y += 8;
    const barX = ML + 195, barW = CW - 200;
    Object.entries(scores).forEach(([k, v]) => {
      const d = DIMS[k];
      const fillW = Math.max(0, Math.round(((v - 1) / 4) * barW));
      doc.font('Helvetica').fontSize(8.5).fillColor('#111').text(d.label, ML, y + 3, { width: 140, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(d.color)
         .text(parseFloat(v).toFixed(1) + '/5', ML + 145, y + 3, { width: 44, align: 'right', lineBreak: false });
      doc.roundedRect(barX, y + 5, barW, 4, 1).fill('#E5E7EB');
      if (fillW > 0) doc.roundedRect(barX, y + 5, fillW, 4, 1).fill(d.color);
      y += 18;
    });
    y += 14;

    // CRITICAL FACTOR
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6B7280').text(u.secFactor, ML, y, { width: CW });
    y += 14;
    const bTxt = BLOCKERS[bl];
    const bH = doc.heightOfString(bTxt, { width: CW - 20 }) + 30;
    doc.roundedRect(ML, y, CW, bH, 3).fill(bld.bg);
    doc.rect(ML, y, 4, bH).fill(bld.color);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(bld.color).text(bld.label, ML + 14, y + 10, { width: CW - 20 });
    doc.font('Helvetica').fontSize(8.5).fillColor(bld.color).text(bTxt, ML + 14, y + 24, { width: CW - 20 });
    y += bH + 16;

    // RECOMMENDATIONS
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#6B7280').text(u.secRecs, ML, y, { width: CW });
    y += 8;
    doc.moveTo(ML, y).lineTo(W - ML, y).lineWidth(0.3).stroke('#E5E7EB');
    y += 8;
    st.recs.forEach(rec => {
      const rH = doc.heightOfString(rec.text, { width: CW - 58 }) + 26;
      doc.roundedRect(ML, y, CW, rH, 3).lineWidth(0.3).fillAndStroke('#FFFFFF', '#E5E7EB');
      doc.roundedRect(ML + 8, y + Math.floor((rH - 16) / 2), 38, 14, 2).fill(rec.tb);
      doc.font('Helvetica-Bold').fontSize(6).fillColor(rec.tc)
         .text(rec.tag, ML + 8, y + Math.floor((rH - 16) / 2) + 4, { width: 38, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(8.5).fillColor('#374151').text(rec.text, ML + 52, y + 13, { width: CW - 58 });
      y += rH + 6;
    });

    // FOOTER
    doc.rect(0, H - 24, W, 24).fill('#282828');
    doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
       .text('CenterPoint · centerpointpr.com · connect@centerpointpr.com', 0, H - 16, { width: W, align: 'center' });

    doc.end();
  });
}

function buildEmailHtml({ name, org, stage, stageIndex, scores, lang }) {
  const L = lang === 'en' ? 'en' : 'es';
  const DIMS = L === 'en' ? EN_DIMS : ES_DIMS;
  const u = UI[L];
  const greeting = u.emailGreeting(name);
  const orgLine = org ? '<p style="margin:0 0 4px;color:#6B7280;font-size:14px">' + org + '</p>' : '';
  const dimRows = Object.entries(scores).map(([k, v]) => {
    const pct = Math.round(((v - 1) / 4) * 100);
    return '<tr><td style="padding:6px 0;font-size:13px;color:#374151;width:180px">' + DIMS[k].label + '</td>' +
      '<td style="padding:6px 0"><div style="background:#E5E7EB;border-radius:4px;height:8px;width:180px">' +
      '<div style="background:#64B450;border-radius:4px;height:8px;width:' + Math.round(pct * 1.8) + 'px"></div></div></td>' +
      '<td style="padding:6px 0 6px 10px;font-size:13px;color:#374151;font-weight:500">' + parseFloat(v).toFixed(1) + '/5</td></tr>';
  }).join('');

  return '<!DOCTYPE html><html lang="' + u.htmlLang + '"><head><meta charset="UTF-8"></head>' +
    '<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,sans-serif">' +
    '<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">' +
    '<div style="background:#282828;padding:20px 28px"><span style="font-size:15px;font-weight:600;color:#fff">CenterPoint</span>' +
    '<span style="font-size:12px;color:#94A3B8;margin-left:10px">Team Development Model</span></div>' +
    '<div style="padding:28px">' +
    '<p style="margin:0 0 16px;font-size:16px;color:#111">' + greeting + ',</p>' +
    '<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7">' + u.emailIntro + '</p>' +
    orgLine +
    '<div style="background:#F3F4F6;border-radius:10px;padding:16px 20px;margin-bottom:20px">' +
    '<p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em">' + u.emailStageLabel + '</p>' +
    '<p style="margin:0;font-size:22px;font-weight:600;color:#111">0' + (stageIndex + 1) + ' - ' + stage + '</p></div>' +
    '<p style="margin:0 0 10px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase">' + u.emailDimsLabel + '</p>' +
    '<table style="border-collapse:collapse;width:100%;margin-bottom:24px"><tbody>' + dimRows + '</tbody></table>' +
    '<p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.7">' + u.emailCta + '</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">' +
    '<a href="https://calendly.com/connect-centerpointpr/new-meeting" style="display:inline-block;background:#64B450;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500">' + u.emailBtn + '</a>' +
    '<a href="https://drive.google.com/file/d/1ADoq_YV69xYbNVpDUpZrq_zkI8EwQq34/view?usp=sharing" style="display:inline-block;background:#fff;color:#282828;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:500;border:1.5px solid #D1D5DB">' + u.emailModelBtn + '</a>' +
    '</div>' +
    '<p style="margin:0;font-size:12px;color:#9CA3AF">O escríbenos a <a href="mailto:connect@centerpointpr.com" style="color:#6B7280">connect@centerpointpr.com</a></p>' +
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

  const { name, org, company, team, email, stage, stageIndex, scores, gapped, action, responses, pracResponses, lang } = payload;
  const L = lang === 'en' ? 'en' : 'es';
  const u = UI[L];
  const errors = [];

  // 1. Save to Supabase (always)
  {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/diagnostic_results`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ name: name || null, org: org || null, email: email || null, stage, stage_index: stageIndex, scores, responses: responses || null, prac_responses: pracResponses || null, created_at: new Date().toISOString() }),
      });
      if (!res.ok) { const t = await res.text(); console.error('Supabase error:', res.status, t); errors.push('Supabase: ' + res.status + ' ' + t); }
    } catch (err) { errors.push('Supabase: ' + err.message); }
  }

  // 2. Create Notion page (always, internal CenterPoint use — kept in Spanish)
  const NOTION_KEY = process.env.NOTION_API_KEY;
  const NOTION_DB = process.env.NOTION_DATABASE_ID || '39c016076b0e808e9f22f0368e5f290e';
  if (NOTION_KEY) {
    try {
      const QS_LABELS = [
        'Las personas se sienten seguras admitiendo errores',
        'Los miembros se muestran como son',
        'Los desacuerdos se abordan de forma directa',
        'Los conflictos terminan siendo productivos',
        'Todos tienen claras las prioridades y expectativas',
        'Está claro quién decide qué',
        'El equipo tiene formas de trabajar conocidas y respetadas',
        'Los miembros se sienten parte del equipo',
        'Las personas pueden expresar ideas diferentes al líder',
        'Señalar un problema es valorado',
        'Las personas cumplen compromisos entre ellas',
        'El equipo comparte lo que aprende hacia afuera',
      ];
      const PS_LABELS = [
        'Sesión facilitada sobre cómo trabajan juntos',
        'Assessment de estilos (DiSC, StrengthsFinder, etc.)',
        'Acuerdos de trabajo explícitos y documentados',
        'Proceso formal de retroalimentación entre pares',
        'Han compartido conocimiento con otros equipos',
      ];
      const SCORE_LABELS = { 1: '1 – Casi nunca', 2: '2 – Pocas veces', 3: '3 – A veces', 4: '4 – Frecuentemente', 5: '5 – Siempre' };
      const PRAC_LABELS = { 1: 'Sí', 2: 'No', 3: 'En proceso' };
      const date = new Date().toISOString().split('T')[0];

      const dimBlocks = Object.entries(scores).map(([k, v]) => ({
        object: 'block', type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: (ES_DIMS[k]?.label || k) + ': ' + parseFloat(v).toFixed(1) + '/5' } }] }
      }));

      const respBlocks = (responses || []).map((v, i) => ({
        object: 'block', type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: 'P' + (i + 1) + '. ' + (QS_LABELS[i] || '') + ' → ' + (SCORE_LABELS[v] || v) } }] }
      }));

      const pracBlocks = (pracResponses || []).map((v, i) => ({
        object: 'block', type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [{ type: 'text', text: { content: (PS_LABELS[i] || 'P' + (i + 1)) + ' → ' + (PRAC_LABELS[v] || v) } }] }
      }));

      const blocks = [
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Información' } }] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: 'Email: ' + (email || '—') } }] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: 'Fecha: ' + date } }] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: 'Etapa: ' + stage } }] } },
        { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: 'Idioma: ' + (L === 'en' ? 'Inglés' : 'Español') } }] } },
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Dimensiones' } }] } },
        ...dimBlocks,
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Respuestas — Preguntas de dimensiones' } }] } },
        ...respBlocks,
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: 'Respuestas — Prácticas del equipo' } }] } },
        ...pracBlocks,
      ];

      await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${NOTION_KEY}`, 'Content-Type': 'application/json', 'Notion-Version': '2022-06-28' },
        body: JSON.stringify({
          parent: { database_id: NOTION_DB },
          properties: {
            title: { title: [{ type: 'text', text: { content: name || 'Anónimo · ' + date } }] },
            ...(company ? { 'Organización': { rich_text: [{ type: 'text', text: { content: company } }] } } : {}),
            ...(team ? { 'Equipo o Departamento': { rich_text: [{ type: 'text', text: { content: team } }] } } : {}),
            ...(email ? { 'Email': { email } } : {}),
            ...(stage ? { 'Etapa': { select: { name: stage } } } : {}),
            'Confianza':              { number: scores.trust    ? parseFloat(parseFloat(scores.trust).toFixed(1))    : null },
            'Gestión del conflicto':  { number: scores.conflict ? parseFloat(parseFloat(scores.conflict).toFixed(1)) : null },
            'Claridad':               { number: scores.clarity  ? parseFloat(parseFloat(scores.clarity).toFixed(1))  : null },
            'Pertenencia':            { number: scores.cohesion ? parseFloat(parseFloat(scores.cohesion).toFixed(1)) : null },
            'Seguridad psicológica':  { number: scores.psafety  ? parseFloat(parseFloat(scores.psafety).toFixed(1))  : null },
            'Orientación externa':    { number: scores.impact   ? parseFloat(parseFloat(scores.impact).toFixed(1))   : null },
          },
          children: blocks,
        }),
      }).then(r => { if (!r.ok) r.text().then(t => console.error('Notion error:', t)); });
    } catch (err) { console.error('Notion:', err.message); }
  }

  // 3. Generate PDF + Send email (skip if action === 'save')
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (action !== 'save' && email && RESEND_KEY) {
    try {
      const pdfBuffer = await buildPDF({ name, org, stage, stageIndex, scores, gapped: !!gapped, lang: L });
      const pdfB64 = pdfBuffer.toString('base64');
      const namePart = [org, name].filter(Boolean)[0];
      const fname = u.filename(namePart);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'CenterPoint <connect@centerpointpr.com>',
          to: [email],
          subject: u.emailSubject(stage),
          html: buildEmailHtml({ name, org, stage, stageIndex, scores, lang: L }),
          attachments: [{ filename: fname, content: pdfB64 }],
        }),
      });
      if (!res.ok) errors.push('Resend: ' + res.status + ' ' + await res.text());

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'CenterPoint Diagnóstico <connect@centerpointpr.com>',
          to: ['connect@centerpointpr.com'],
          subject: u.notifSubject(name, stage),
          html: u.notifBody(name, org, email, stage),
        }),
      }).catch(() => {});
    } catch (err) { errors.push('Email/PDF: ' + err.message); }
  }

  return {
    statusCode: errors.length ? 207 : 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: errors.length === 0, errors }),
  };
};
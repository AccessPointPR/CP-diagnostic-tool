const SUPABASE_URL = 'https://hlygvrgqjrfohurstvvj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhseWd2cmdxanJmb2h1cnN0dnZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3MzY3NzgsImV4cCI6MjA5ODMxMjc3OH0.pBbrxhWOLIxVLXGkeitW17EyvkjDqaBcnGke3ImPMWY';

const DIMS_ES = {
  trust: 'Confianza',
  conflict: 'Gestión del conflicto',
  clarity: 'Claridad',
  cohesion: 'Cohesión',
  psafety: 'Seguridad psicológica',
  impact: 'Impacto colectivo',
};

function buildEmailHtml({ name, org, email, stage, stageIndex, scores }) {
  const greeting = name ? `Hola, ${name}` : 'Hola';
  const orgLine = org ? `<p style="margin:0 0 4px;color:#6B7280;font-size:14px">${org}</p>` : '';

  const dimRows = Object.entries(scores)
    .map(([k, v]) => {
      const pct = Math.round(((v - 1) / 4) * 100);
      return `
      <tr>
        <td style="padding:6px 0;font-size:13px;color:#374151;width:200px">${DIMS_ES[k]}</td>
        <td style="padding:6px 0">
          <div style="background:#E5E7EB;border-radius:4px;height:8px;width:200px">
            <div style="background:#64B450;border-radius:4px;height:8px;width:${pct * 2}px"></div>
          </div>
        </td>
        <td style="padding:6px 0 6px 10px;font-size:13px;color:#374151;font-weight:500">${parseFloat(v).toFixed(1)} / 5</td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">
    <div style="background:#282828;padding:20px 28px">
      <span style="font-size:15px;font-weight:600;color:#fff;letter-spacing:.03em">CenterPoint</span>
      <span style="font-size:12px;color:#94A3B8;margin-left:10px">Team Development Model</span>
    </div>
    <div style="padding:28px">
      <p style="margin:0 0 20px;font-size:16px;color:#111">${greeting},</p>
      <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7">
        Gracias por completar el <strong>Diagnóstico de Equipo CenterPoint</strong>. Aquí tienes tu resultado:
      </p>

      ${orgLine}
      <div style="background:#F3F4F6;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em">Etapa del equipo</p>
        <p style="margin:0;font-size:22px;font-weight:600;color:#111">0${stageIndex + 1} · ${stage}</p>
      </div>

      <p style="margin:0 0 12px;font-size:11px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em">Perfil de dimensiones</p>
      <table style="border-collapse:collapse;width:100%;margin-bottom:24px">
        <tbody>${dimRows}</tbody>
      </table>

      <p style="margin:0 0 20px;font-size:13px;color:#6B7280;line-height:1.7">
        ¿Quieres profundizar en estos resultados y diseñar una intervención a la medida de tu equipo?
        <strong>Conversemos.</strong>
      </p>
      <a href="mailto:equipo@centerpointpr.com" style="display:inline-block;background:#64B450;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500">
        Contactar al equipo →
      </a>
    </div>
    <div style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:16px 28px;text-align:center">
      <p style="margin:0;font-size:11px;color:#9CA3AF">CenterPoint · Team Development Model · centerpointpr.com</p>
    </div>
  </div>
</body>
</html>`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { name, org, email, stage, stageIndex, scores } = payload;
  const errors = [];

  // 1. Save to Supabase
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/diagnostic_results`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: name || null,
        org: org || null,
        email: email || null,
        stage,
        stage_index: stageIndex,
        scores,
        created_at: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      errors.push(`Supabase: ${res.status} ${text}`);
    }
  } catch (err) {
    errors.push(`Supabase fetch error: ${err.message}`);
  }

  // 2. Send email via Resend
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (email && RESEND_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'CenterPoint <equipo@centerpointpr.com>',
          to: [email],
          subject: `Tu diagnóstico de equipo — Etapa: ${stage}`,
          html: buildEmailHtml(payload),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        errors.push(`Resend: ${res.status} ${text}`);
      }
    } catch (err) {
      errors.push(`Resend fetch error: ${err.message}`);
    }
  }

  return {
    statusCode: errors.length ? 207 : 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ ok: errors.length === 0, errors }),
  };
};

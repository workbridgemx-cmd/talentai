exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const { text, filename, apiKey, config } = JSON.parse(event.body);

    if (!apiKey || apiKey.length < 20) {
      return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: 'API Key inválida o vacía' }) };
    }
    if (!text || text.trim().length < 80) {
      return { statusCode: 400, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: 'Texto del CV muy corto o vacío' }) };
    }

    const cfg = config || {};
    const visas = (cfg.visas || 'PERM,NIW,EB-1,EB-2,EB-3,H-1B,L-1,O-1,TN,E-2,Asylum,Refugee,TPS,DACA,Humanitarian,Removal Defense,Consular Processing,Business Immigration,Family Petitions').replace(/\n/g, ',');
    const roles = (cfg.roles || 'Legal Assistant,Immigration Paralegal,Intake Specialist,Case Manager,Recruiter,HR Generalist,Sales Representative,Customer Service,Executive Assistant,Virtual Assistant,Marketing Specialist,Project Manager,Software Developer,Data Analyst,Accountant').replace(/\n/g, ',');
    const tools = (cfg.tools || 'Clio,Litify,MyCase,Docketwise,Salesforce,HubSpot,Monday.com,Asana').replace(/\n/g, ',');
    const extra = cfg.extra || '';
    const w = { exp: cfg.wExp||35, tec: cfg.wTec||25, idi: cfg.wIdi||10, est: cfg.wEst||10, soft: cfg.wSoft||10, edu: cfg.wEdu||10 };

    const prompt = `Eres un especialista senior en reclutamiento. Analiza el siguiente CV y devuelve ÚNICAMENTE un objeto JSON válido sin markdown ni backticks.

CV:
${text.substring(0, 7000)}

Áreas a evaluar:
- Visas/inmigración: ${visas}
- Roles: ${roles}
- Herramientas: ${tools}
- Áreas adicionales: ${extra}

Devuelve exactamente este JSON:
{"nombre":"...","ubicacion":"Ciudad, Estado, País","disponibilidad":"Remoto|Híbrido|Presencial|Cualquier modalidad","zona_horaria":"...","contacto":"email o teléfono","seniority":"Entry Level|Junior|Semi Senior|Senior|Lead|Manager|Director|Executive","anos_experiencia":0,"estabilidad":"Alta|Media|Baja","cambios_empleo":0,"tiempo_promedio_empresa":"...","score_global":0,"score_experiencia":0,"score_tecnico":0,"score_idiomas":0,"score_estabilidad":0,"score_softskills":0,"score_educacion":0,"grado":"A+|A|B|C|D","resumen_profesional":"2 oraciones máximo.","visas_experiencia":["solo tipos con experiencia real"],"perfiles_rol":["roles que aplican"],"idiomas":[{"idioma":"...","nivel":"Nativo|C2|C1|B2|B1|A2|A1"}],"habilidades_tecnicas":["herramientas que domina"],"soft_skills":["hasta 6"],"empleos":[{"empresa":"...","puesto":"...","periodo":"...","duracion":"...","industria":"..."}],"educacion":[{"nivel":"...","carrera":"...","institucion":"...","ano":"..."}],"vacantes_compatibles":[{"vacante":"...","compatibilidad":90}],"fortalezas":["hasta 3"],"areas_oportunidad":["hasta 2"],"riesgos":["hasta 2"],"tags":["tag1","tag2","tag3"]}

Score 0-100: experiencia ${w.exp}%, técnico ${w.tec}%, idiomas ${w.idi}%, estabilidad ${w.est}%, soft skills ${w.soft}%, educación ${w.edu}%.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: false, error: err.error?.message || 'Error API ' + response.status })
      };
    }

    const data = await response.json();
    const raw = data.content.map(b => b.text || '').join('');
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    parsed._filename = filename || '';

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, data: parsed })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, error: err.message })
    };
  }
};

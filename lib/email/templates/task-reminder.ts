export const TASK_REMINDER_TEMPLATE_VARIABLES = [
  { name: "{{userName}}", description: "Nom du destinataire" },
  { name: "{{digestDate}}", description: "Date du rappel" },
  { name: "{{overdueCount}}", description: "Nombre de tâches en retard" },
  { name: "{{dueTodayCount}}", description: "Nombre de tâches à faire aujourd'hui" },
  { name: "{{upcomingCount}}", description: "Nombre de tâches à venir" },
  { name: "{{taskRows}}", description: "Liste HTML des tâches" },
  { name: "{{tasksUrl}}", description: "Lien vers les projets" },
];

export const DEFAULT_TASK_REMINDER_TEMPLATE_SUBJECT =
  "Vos tâches : {{overdueCount}} en retard, {{dueTodayCount}} à faire aujourd'hui";

export const DEFAULT_TASK_REMINDER_TEMPLATE_HTML = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f4f7f6;font-family:Arial,sans-serif;color:#15201E">
  <div style="max-width:620px;margin:32px auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dce7e3">
    <div style="padding:28px 32px;background:#1F4D47;color:#ffffff">
      <p style="margin:0 0 8px;font-size:13px;opacity:.8">RAPPEL DE TÂCHES</p>
      <h1 style="margin:0;font-size:24px">Bonjour {{userName}},</h1>
    </div>
    <div style="padding:28px 32px">
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6">Voici votre point de suivi du {{digestDate}}.</p>
      <div style="padding:14px 16px;background:#f1f6f4;border-radius:10px;margin-bottom:20px;font-size:14px;line-height:1.7">
        <strong>{{overdueCount}}</strong> en retard &nbsp;·&nbsp; <strong>{{dueTodayCount}}</strong> à faire aujourd'hui &nbsp;·&nbsp; <strong>{{upcomingCount}}</strong> à venir
      </div>
      {{taskRows}}
      <p style="margin:24px 0 0"><a href="{{tasksUrl}}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#1F4D47;color:#ffffff;text-decoration:none;font-weight:bold">Ouvrir mes tâches</a></p>
    </div>
  </div>
</body></html>`;

const handlebars = require('handlebars');

// Base template with common styling
const baseTemplate = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{title}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
        }
        .content {
            padding: 30px;
        }
        .content h2 {
            color: #4f46e5;
            margin-top: 0;
        }
        .info-box {
            background-color: #f8fafc;
            border-left: 4px solid #4f46e5;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .deadline-warning {
            background-color: #fef3c7;
            border-left-color: #f59e0b;
            color: #92400e;
        }
        .deadline-urgent {
            background-color: #fee2e2;
            border-left-color: #ef4444;
            color: #dc2626;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .footer {
            background-color: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .footer a {
            color: #4f46e5;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Smart Skill Matrix</h1>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>Cet email a été envoyé automatiquement par Smart Skill Matrix.</p>
            <p>Si vous avez des questions, contactez <a href="mailto:support@smartskillmatrix.com">notre support</a>.</p>
        </div>
    </div>
</body>
</html>
`;

// Objective deadline reminder template
const objectiveDeadlineTemplate = `
<h2>⏰ Rappel d'échéance - Objectif</h2>
<p>Bonjour {{userName}},</p>
<p>Nous vous informons que votre objectif <strong>"{{objectiveTitle}}"</strong> approche de son échéance.</p>

<div class="info-box {{urgencyClass}}">
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📊 Progression actuelle :</strong> {{progress}}%<br>
    <strong>⏱️ Temps restant :</strong> {{timeRemaining}}
    {{#if skillName}}<strong>📚 Compétence cible :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
</div>

{{#if isUrgent}}
<p><strong>⚠️ Attention :</strong> Cet objectif est urgent et nécessite votre attention immédiate.</p>
{{/if}}

<p>Veuillez mettre à jour votre progression ou contacter votre manager si vous rencontrez des difficultés.</p>

<a href="{{mainAppUrl}}/employee/targets" class="button">Voir mes objectifs</a>
`;

// Manager notification template
const managerNotificationTemplate = `
<h2>👥 Notification Manager - Objectif en retard</h2>
<p>Bonjour {{managerName}},</p>
<p>Nous vous informons qu'un membre de votre équipe a un objectif qui approche de son échéance.</p>

<div class="info-box {{urgencyClass}}">
    <strong>👤 Employé :</strong> {{employeeName}}<br>
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📊 Progression :</strong> {{progress}}%<br>
    <strong>⏱️ Temps restant :</strong> {{timeRemaining}}
    {{#if skillName}}<strong>📚 Compétence cible :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
    {{#if teamName}}<strong>👥 Équipe :</strong> {{teamName}}{{/if}}
</div>

{{#if isUrgent}}
<p><strong>⚠️ Action requise :</strong> Cet objectif est urgent. Veuillez contacter l'employé pour l'aider à le finaliser.</p>
{{/if}}

<a href="{{mainAppUrl}}/manager/teams" class="button">Gérer mes équipes</a>
`;

// Skill request notification template
const skillRequestTemplate = `
<h2>🎯 Demande de compétence</h2>
<p>Bonjour {{userName}},</p>
<p>Votre demande de compétence a été {{status}}.</p>

<div class="info-box">
    <strong>📚 Compétence :</strong> {{skillName}}<br>
    <strong>📊 Niveau demandé :</strong> {{targetLevel}}<br>
    <strong>📅 Date de demande :</strong> {{requestDate}}
    {{#if approvedLevel}}<strong>✅ Niveau approuvé :</strong> {{approvedLevel}}{{/if}}
    {{#if reason}}<strong>📝 Raison :</strong> {{reason}}{{/if}}
    {{#if managerName}}<strong>👨‍💼 Traité par :</strong> {{managerName}}{{/if}}
</div>

{{#if isApproved}}
<p>🎉 Félicitations ! Votre demande a été approuvée. Vous pouvez maintenant ajouter cette compétence à votre profil.</p>
<a href="{{mainAppUrl}}/employee/skills" class="button">Ajouter la compétence</a>
{{else}}
<p>Votre demande a été rejetée. {{#if reason}}Raison : {{reason}}{{/if}}</p>
<a href="{{mainAppUrl}}/employee/requests" class="button">Voir mes demandes</a>
{{/if}}
`;

// Objective assigned template
const objectiveAssignedTemplate = `
<h2>📋 Nouvel objectif assigné</h2>
<p>Bonjour {{userName}},</p>
<p>Un nouvel objectif vous a été assigné.</p>

<div class="info-box">
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    {{#if skillName}}<strong>📚 Compétence cible :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
    {{#if managerName}}<strong>👨‍💼 Assigné par :</strong> {{managerName}}{{/if}}
    {{#if teamName}}<strong>👥 Équipe :</strong> {{teamName}}{{/if}}
</div>

<p>Vous pouvez commencer à travailler sur cet objectif et mettre à jour votre progression régulièrement.</p>

<a href="{{mainAppUrl}}/employee/targets" class="button">Voir mes objectifs</a>
`;

// Team assignment template
const teamAssignmentTemplate = `
<h2>👥 Affectation d'équipe</h2>
<p>Bonjour {{userName}},</p>
<p>Vous avez été {{action}} {{teamName}}.</p>

<div class="info-box">
    <strong>👥 Équipe :</strong> {{teamName}}<br>
    <strong>📅 Date :</strong> {{assignmentDate}}
    {{#if managerName}}<strong>👨‍💼 Manager :</strong> {{managerName}}{{/if}}
    {{#if departmentName}}<strong>🏢 Département :</strong> {{departmentName}}{{/if}}
    {{#if teamDescription}}<strong>📝 Description :</strong> {{teamDescription}}{{/if}}
</div>

{{#if isAdded}}
<p>Bienvenue dans cette équipe ! Vous pouvez maintenant collaborer avec vos nouveaux collègues.</p>
{{else}}
<p>Vous n'êtes plus membre de cette équipe.</p>
{{/if}}

<a href="{{mainAppUrl}}/employee/teams" class="button">Voir mes équipes</a>
`;

// Additional templates for new email types
const skillRequestSubmittedTemplate = `
<h2>📬 Nouvelle demande de compétence</h2>
<p>Bonjour {{userName}},</p>
<p>Un employé de votre équipe a soumis une nouvelle demande de compétence.</p>
<div class="info-box">
    <strong>👤 Employé :</strong> {{employeeName}}<br>
    <strong>📚 Compétence demandée :</strong> {{skillName}}<br>
    <strong>📊 Niveau demandé :</strong> {{targetLevel}}/5<br>
    <strong>📅 Date de demande :</strong> {{requestDate}}<br>
    {{#if reason}}<strong>📝 Raison :</strong> {{reason}}{{/if}}
</div>
<p>Veuillez examiner et traiter cette demande dans les plus brefs délais.</p>
<a href="{{mainAppUrl}}/manager/requests" class="button">Examiner la demande</a>
`;

const skillRequestApprovedTemplate = `
<h2>✅ Demande de compétence approuvée</h2>
<p>Bonjour {{userName}},</p>
<p>Excellente nouvelle ! Votre demande de compétence a été approuvée.</p>
<div class="info-box">
    <strong>📚 Compétence :</strong> {{skillName}}<br>
    <strong>📊 Niveau demandé :</strong> {{targetLevel}}/5<br>
    <strong>✅ Niveau approuvé :</strong> {{approvedLevel}}/5<br>
    <strong>📅 Date de demande :</strong> {{requestDate}}
    {{#if managerName}}<strong>👨‍💼 Approuvé par :</strong> {{managerName}}{{/if}}
</div>
<p>Vous pouvez maintenant utiliser cette compétence dans vos objectifs et profils.</p>
<a href="{{mainAppUrl}}/employee/skills" class="button">Voir mes compétences</a>
`;

const skillRequestRejectedTemplate = `
<h2>❌ Demande de compétence rejetée</h2>
<p>Bonjour {{userName}},</p>
<p>Votre demande de compétence a été rejetée.</p>
<div class="info-box">
    <strong>📚 Compétence :</strong> {{skillName}}<br>
    <strong>📊 Niveau demandé :</strong> {{targetLevel}}/5<br>
    <strong>📅 Date de demande :</strong> {{requestDate}}<br>
    <strong>📝 Raison :</strong> {{rejectionReason}}
    {{#if managerName}}<strong>👨‍💼 Rejeté par :</strong> {{managerName}}{{/if}}
</div>
<p>Vous pouvez soumettre une nouvelle demande avec des justifications supplémentaires.</p>
<a href="{{mainAppUrl}}/employee/requests" class="button">Nouvelle demande</a>
`;

const teamRemovalTemplate = `
<h2>👥 Retrait d'équipe</h2>
<p>Bonjour {{userName}},</p>
<p>Vous avez été retiré de l'équipe suivante :</p>
<div class="info-box">
    <strong>Équipe :</strong> {{teamName}}<br>
    <strong>Manager :</strong> {{managerName}}
</div>
<p>Si vous pensez qu'il s'agit d'une erreur, contactez votre manager.</p>
<a href="{{mainAppUrl}}/employee/teams" class="button">Voir mes équipes</a>
`;

const newManagerAssignedTemplate = `
<h2>👨‍💼 Nouveau manager assigné</h2>
<p>Bonjour {{userName}},</p>
<p>Un nouveau manager a été assigné à votre équipe :</p>
<div class="info-box">
    <strong>Équipe :</strong> {{teamName}}<br>
    <strong>Nouveau manager :</strong> {{newManagerName}}
</div>
<p>N'hésitez pas à contacter votre nouveau manager pour toute question.</p>
<a href="{{mainAppUrl}}/employee/teams" class="button">Voir mon équipe</a>
`;

const objectiveOverdueTemplate = `
<h2>🚨 Objectif en retard</h2>
<p>Bonjour {{userName}},</p>
<p>Votre objectif est en retard :</p>
<div class="info-box urgent">
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📊 Progression :</strong> {{progress}}%<br>
    <strong>⏰ Retard :</strong> {{daysOverdue}} jour(s)
    {{#if skillName}}<strong>📚 Compétence :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
    {{#if managerName}}<strong>👨‍💼 Manager :</strong> {{managerName}}{{/if}}
</div>
<p>Veuillez mettre à jour votre progression ou contacter votre manager.</p>
<a href="{{mainAppUrl}}/employee/objectives" class="button">Voir mes objectifs</a>
`;

const objectiveCompletedTemplate = `
<h2>🎉 Objectif terminé</h2>
<p>Bonjour {{userName}},</p>
<p>Un employé a terminé un objectif :</p>
<div class="info-box success">
    <strong>👤 Employé :</strong> {{employeeName}}<br>
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>📅 Date de completion :</strong> {{completionDate}}
    {{#if skillName}}<strong>📚 Compétence :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
    {{#if teamName}}<strong>👥 Équipe :</strong> {{teamName}}{{/if}}
</div>
<p>Félicitations pour cette réussite !</p>
<a href="{{mainAppUrl}}/manager/objectives" class="button">Voir les objectifs</a>
`;

const objectiveUpdatedTemplate = `
<h2>📝 Objectif mis à jour</h2>
<p>Bonjour {{userName}},</p>
<p>Un objectif a été mis à jour :</p>
<div class="info-box">
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>👤 Mis à jour par :</strong> {{updatedBy}}<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📊 Progression :</strong> {{progress}}%<br>
    <strong>📝 Détails :</strong> {{updateDetails}}
    {{#if skillName}}<strong>📚 Compétence :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
</div>
<p>Consultez les modifications dans l'application.</p>
<a href="{{mainAppUrl}}/employee/objectives" class="button">Voir mes objectifs</a>
`;

const progressUpdatePendingTemplate = `
<h2>⏳ Demande de mise à jour de progression</h2>
<p>Bonjour {{userName}},</p>
<p>Un employé a soumis une demande de mise à jour de progression :</p>
<div class="info-box">
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>👤 Employé :</strong> {{employeeName}}<br>
    <strong>📊 Progression :</strong> {{progress}}%<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📝 Notes :</strong> {{notes}}
    {{#if skillName}}<strong>📚 Compétence :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
</div>
<p>Veuillez examiner et approuver cette demande.</p>
<a href="{{mainAppUrl}}/manager/objectives" class="button">Examiner la demande</a>
`;

const progressUpdateApprovedTemplate = `
<h2>✅ Progression approuvée</h2>
<p>Bonjour {{userName}},</p>
<p>Votre demande de mise à jour de progression a été approuvée :</p>
<div class="info-box success">
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>👨‍💼 Manager :</strong> {{managerName}}<br>
    <strong>📊 Progression :</strong> {{progress}}%<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📝 Notes :</strong> {{notes}}
    {{#if skillName}}<strong>📚 Compétence :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
</div>
<p>Félicitations ! Continuez votre excellent travail.</p>
<a href="{{mainAppUrl}}/employee/objectives" class="button">Voir mes objectifs</a>
`;

const progressUpdateRejectedTemplate = `
<h2>❌ Progression rejetée</h2>
<p>Bonjour {{userName}},</p>
<p>Votre demande de mise à jour de progression a été rejetée :</p>
<div class="info-box error">
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>👨‍💼 Manager :</strong> {{managerName}}<br>
    <strong>📊 Progression :</strong> {{progress}}%<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📝 Notes :</strong> {{notes}}
    {{#if skillName}}<strong>📚 Compétence :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
</div>
<div class="info-box">
    <strong>❌ Raison du rejet :</strong> {{rejectionReason}}
</div>
<p>Veuillez revoir votre demande et la soumettre à nouveau avec les informations demandées.</p>
<a href="{{mainAppUrl}}/employee/objectives" class="button">Voir mes objectifs</a>
`;

const teamManagerChangedTemplate = `
<h2>{{#if isNewManager}}👨‍💼 Nouvelle équipe à gérer{{else}}👥 Gestion d'équipe modifiée{{/if}}</h2>
<p>Bonjour {{userName}},</p>
{{#if isNewManager}}
<p>Vous êtes maintenant manager de l'équipe suivante :</p>
<div class="info-box success">
    <strong>Équipe :</strong> {{teamName}}<br>
    <strong>Ancien manager :</strong> {{oldManagerName}}
</div>
{{else}}
<p>Vous n'êtes plus manager de l'équipe suivante :</p>
<div class="info-box">
    <strong>Équipe :</strong> {{teamName}}<br>
    <strong>Nouveau manager :</strong> {{newManagerName}}
</div>
{{/if}}
<p>Gérez votre équipe efficacement !</p>
<a href="{{mainAppUrl}}/manager/teams" class="button">Voir mes équipes</a>
`;

const departmentAssignmentTemplate = `
<h2>🏢 Assignation à un département</h2>
<p>Bonjour {{userName}},</p>
<p>Vous avez été assigné à un nouveau département :</p>
<div class="info-box">
    <strong>Département :</strong> {{departmentName}}<br>
    <strong>Manager :</strong> {{managerName}}
</div>
<p>Bienvenue dans votre nouveau département !</p>
<a href="{{mainAppUrl}}/employee/departments" class="button">Voir mes départements</a>
`;

const departmentRemovalTemplate = `
<h2>🏢 Retrait d'un département</h2>
<p>Bonjour {{userName}},</p>
<p>Vous avez été retiré du département suivant :</p>
<div class="info-box">
    <strong>Département :</strong> {{departmentName}}<br>
    <strong>Manager :</strong> {{managerName}}
</div>
<p>Si vous pensez qu'il s'agit d'une erreur, contactez votre manager.</p>
<a href="{{mainAppUrl}}/employee/departments" class="button">Voir mes départements</a>
`;

const departmentManagerChangedTemplate = `
<h2>{{#if isNewManager}}👨‍💼 Nouveau département à gérer{{else}}🏢 Gestion de département modifiée{{/if}}</h2>
<p>Bonjour {{userName}},</p>
{{#if isNewManager}}
<p>Vous êtes maintenant manager du département suivant :</p>
<div class="info-box success">
    <strong>Département :</strong> {{departmentName}}<br>
    <strong>Ancien manager :</strong> {{oldManagerName}}
</div>
{{else}}
<p>Vous n'êtes plus manager du département suivant :</p>
<div class="info-box">
    <strong>Département :</strong> {{departmentName}}<br>
    <strong>Nouveau manager :</strong> {{newManagerName}}
</div>
{{/if}}
<p>Gérez votre département efficacement !</p>
<a href="{{mainAppUrl}}/manager/departments" class="button">Voir mes départements</a>
`;

const weeklySummaryTemplate = `
<h2>📊 Résumé hebdomadaire</h2>
<p>Bonjour {{userName}},</p>
<p>Voici le résumé de la semaine pour vos équipes :</p>
<div class="info-box">
    <strong>Objectifs en cours :</strong> {{summaryData.activeObjectives}}<br>
    <strong>Objectifs terminés :</strong> {{summaryData.completedObjectives}}<br>
    <strong>Demandes en attente :</strong> {{summaryData.pendingRequests}}
</div>
<p>Continuez le bon travail !</p>
<a href="{{mainAppUrl}}/manager/dashboard" class="button">Voir le tableau de bord</a>
`;

const managerLateObjectiveTemplate = `
<h2>🚨 Objectif en retard - Action requise</h2>
<p>Bonjour {{managerName}},</p>
<p>Un objectif de votre équipe est en retard et nécessite votre attention immédiate.</p>

<div class="info-box deadline-urgent">
    <strong>👤 Employé :</strong> {{employeeName}}<br>
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📊 Progression actuelle :</strong> {{progress}}%<br>
    <strong>⏰ Temps écoulé :</strong> {{timeProgress}}%<br>
    <strong>🚨 Statut :</strong> {{status}}
    {{#if skillName}}<strong>📚 Compétence cible :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
    {{#if teamName}}<strong>👥 Équipe :</strong> {{teamName}}{{/if}}
</div>

<p><strong>⚠️ Action requise :</strong> Cet objectif est en retard. Veuillez contacter l'employé pour l'aider à le finaliser ou ajuster les délais si nécessaire.</p>

<a href="{{mainAppUrl}}/manager/teams" class="button">Gérer mes équipes</a>
`;

const managerDeadlineMissedTemplate = `
<h2>🚨 Échéance dépassée - Objectif non terminé</h2>
<p>Bonjour {{managerName}},</p>
<p>Un objectif de votre équipe a dépassé sa date limite sans être terminé.</p>

<div class="info-box deadline-urgent">
    <strong>👤 Employé :</strong> {{employeeName}}<br>
    <strong>📋 Titre :</strong> {{objectiveTitle}}<br>
    <strong>📝 Description :</strong> {{objectiveDescription}}<br>
    <strong>📅 Échéance :</strong> {{deadline}}<br>
    <strong>📊 Progression actuelle :</strong> {{progress}}%<br>
    <strong>⏰ Jours de retard :</strong> {{daysOverdue}} jour(s)<br>
    <strong>🚨 Statut :</strong> Échéance dépassée
    {{#if skillName}}<strong>📚 Compétence cible :</strong> {{skillName}} (Niveau {{targetLevel}}){{/if}}
    {{#if category}}<strong>🏷️ Catégorie :</strong> {{category}}{{/if}}
    {{#if teamName}}<strong>👥 Équipe :</strong> {{teamName}}{{/if}}
</div>

<p><strong>🚨 Action urgente requise :</strong> Cet objectif a dépassé sa date limite. Veuillez immédiatement contacter l'employé pour évaluer la situation et décider des prochaines étapes.</p>

<a href="{{mainAppUrl}}/manager/teams" class="button">Gérer mes équipes</a>
`;

const jobTitleObjectiveAssignedTemplate = `
<h2>🎯 Nouvel objectif de titre de poste assigné</h2>
<p>Bonjour {{userName}},</p>
<p>Un nouvel objectif de titre de poste vous a été assigné :</p>

<div class="info-box success">
    <strong>🎯 Titre de poste :</strong> {{jobTitle}}<br>
    <strong>👨‍💼 Assigné par :</strong> {{assignerName}}<br>
    <strong>📝 Notes :</strong> {{notes}}<br>
    <strong>📅 Date d'assignation :</strong> {{assignmentDate}}
</div>

<p>Cet objectif vous permettra de progresser vers le titre de poste souhaité. Consultez les compétences requises et commencez à travailler dessus.</p>

<a href="{{mainAppUrl}}/employee/job-titles" class="button">Voir mes objectifs de titre de poste</a>
`;

// Compile templates
const templates = {
  // Objective templates
  objectiveDeadline: handlebars.compile(baseTemplate.replace('{{content}}', objectiveDeadlineTemplate)),
  objectiveAssigned: handlebars.compile(baseTemplate.replace('{{content}}', objectiveAssignedTemplate)),
  objectiveUpdated: handlebars.compile(baseTemplate.replace('{{content}}', objectiveUpdatedTemplate)),
  objectiveCompleted: handlebars.compile(baseTemplate.replace('{{content}}', objectiveCompletedTemplate)),
  objectiveOverdue: handlebars.compile(baseTemplate.replace('{{content}}', objectiveOverdueTemplate)),
  
  // Skill request templates
  skillRequest: handlebars.compile(baseTemplate.replace('{{content}}', skillRequestTemplate)),
  skillRequestSubmitted: handlebars.compile(baseTemplate.replace('{{content}}', skillRequestSubmittedTemplate)),
  skillRequestApproved: handlebars.compile(baseTemplate.replace('{{content}}', skillRequestApprovedTemplate)),
  skillRequestRejected: handlebars.compile(baseTemplate.replace('{{content}}', skillRequestRejectedTemplate)),
  
  // Team templates
  teamAssignment: handlebars.compile(baseTemplate.replace('{{content}}', teamAssignmentTemplate)),
  teamRemoval: handlebars.compile(baseTemplate.replace('{{content}}', teamRemovalTemplate)),
  teamManagerChanged: handlebars.compile(baseTemplate.replace('{{content}}', teamManagerChangedTemplate)),
  newManagerAssigned: handlebars.compile(baseTemplate.replace('{{content}}', newManagerAssignedTemplate)),
  
  // Department templates
  departmentAssignment: handlebars.compile(baseTemplate.replace('{{content}}', departmentAssignmentTemplate)),
  departmentRemoval: handlebars.compile(baseTemplate.replace('{{content}}', departmentRemovalTemplate)),
  departmentManagerChanged: handlebars.compile(baseTemplate.replace('{{content}}', departmentManagerChangedTemplate)),
  
  // Progress update templates
  progressUpdatePending: handlebars.compile(baseTemplate.replace('{{content}}', progressUpdatePendingTemplate)),
  progressUpdateApproved: handlebars.compile(baseTemplate.replace('{{content}}', progressUpdateApprovedTemplate)),
  progressUpdateRejected: handlebars.compile(baseTemplate.replace('{{content}}', progressUpdateRejectedTemplate)),
  
  // Manager notification templates
  managerNotification: handlebars.compile(baseTemplate.replace('{{content}}', managerNotificationTemplate)),
  managerLateObjective: handlebars.compile(baseTemplate.replace('{{content}}', managerLateObjectiveTemplate)),
  managerDeadlineMissed: handlebars.compile(baseTemplate.replace('{{content}}', managerDeadlineMissedTemplate)),
  
  // System templates
  weeklySummary: handlebars.compile(baseTemplate.replace('{{content}}', weeklySummaryTemplate)),
  
  // Job title templates
  jobTitleObjectiveAssigned: handlebars.compile(baseTemplate.replace('{{content}}', jobTitleObjectiveAssignedTemplate))
};

module.exports = templates;



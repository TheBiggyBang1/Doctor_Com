import { useEffect, useState } from "react";

type Language = "fr" | "en";

const copy = {
  en: {
    home: "Back to Doctor Com",
    eyebrow: "DOCTOR COM · 5 SENS ADVERTISING",
    title: "Privacy policy",
    updated: "Last updated: October 13, 2026",
    intro:
      "This policy explains how 5 Sens Advertising (“5 Sens”, “we”, or “us”) collects and uses personal data when you use the Doctor Com website, questionnaire, and mobile app. The mobile app displays the website in a WebView and uses the same data practices.",
    sections: [
      {
        heading: "1. Who is responsible",
        paragraphs: [
          "5 Sens Advertising is responsible for the personal data described in this policy. For privacy questions or requests, contact us at",
        ],
        email: "contact@5sens.tn",
      },
      {
        heading: "2. Data we collect",
        paragraphs: [
          "Information you provide about your business: business name, industry, country, city, size, website and selected social networks; your marketing objectives, target customers and audience profile, target geography, current channels, satisfaction rating, competitors, previous marketing investment, budget range and currency, preferred frequency, and desired timing.",
          "Contact and request information: your name, role, email address, phone number, selected language, consent choice, email-verification status, questionnaire progress and submitted answers. Please do not include sensitive personal information, medical information, or information about other people that is not needed for your request.",
          "Information needed to operate the service: an essential, HTTP-only cookie that identifies your questionnaire draft, and a short-lived cookie used to verify your email. Our hosting and network providers may also process technical connection information, such as your IP address, browser, device, and request time, in their ordinary operation of the service.",
          "The app does not request access to your contacts, camera, microphone, or precise location. We do not use the app to collect health information. We do not use advertising or analytics SDKs in the app.",
        ],
      },
      {
        heading: "3. How we use data",
        paragraphs: [
          "We use your answers to save and resume your questionnaire, verify the email address you provide, assess your request, calculate an internal lead score, prepare and deliver a tailored communication plan, and respond to or follow up with you about your request and related 5 Sens services.",
          "We use your email address to send a one-time verification code. If your submission meets our high-priority criteria, we also send relevant contact and business details to our team so it can follow up.",
          "The information requested in the questionnaire is voluntary, but we need the required answers and contact details to prepare and deliver the requested plan. We do not make decisions with legal or similarly significant effects solely by automated means.",
        ],
      },
      {
        heading: "4. How and with whom we share data",
        paragraphs: [
          "We do not sell or rent personal data. We share only what is needed with people authorized by 5 Sens and service providers acting on our behalf:",
          "Google Sheets stores completed questionnaire submissions, including the answers, contact information, consent choice, lead score, and submission time. Resend delivers email verification codes and, for high-priority submissions, sends a lead notification to our team. Anthropic processes questionnaire information needed to generate the communication plan. Our website and server hosting providers process data needed to host and secure the service.",
          "These providers process data under their own service terms and privacy policies. Depending on the provider and infrastructure used, data may be processed outside Tunisia, including in the United States. We may also disclose information when required by law or to protect the rights, safety, and security of our users or service.",
          "We do not authorize these providers to use questionnaire information for their own advertising. Their handling of data is also subject to their applicable retention, security, and legal obligations.",
        ],
      },
      {
        heading: "5. Storage and retention",
        paragraphs: [
          "Questionnaire drafts, email-verification state, and generated reports are held temporarily in server memory. They are cleared when the server process restarts. The draft cookie expires after 30 days by default; the email-verification cookie and code expire after 10 minutes.",
          "Completed submissions are stored in a Google Sheet and are manually deleted no later than six months after submission. If you ask us to delete your data sooner, we will handle the request as described below. Copies held by service providers, such as email delivery records or provider backups, may remain for the periods set by those providers.",
          "We retain information for longer only where necessary to meet a legal obligation, resolve a dispute, or establish or defend a legal claim.",
        ],
      },
      {
        heading: "6. Security",
        paragraphs: [
          "We use safeguards intended to protect data, including HTTPS for production connections, access controls for service accounts, and HTTP-only cookies for draft and email-verification tokens. Access to submissions is limited to authorized people who need them to handle requests.",
          "No website, transmission, or storage method can be guaranteed completely secure. Please do not send information that is unnecessary or sensitive.",
        ],
      },
      {
        heading: "7. Your privacy rights",
        paragraphs: [
          "Subject to the law that applies to you, you may ask us to confirm whether we process your data, access it, correct it, delete it, restrict or object to certain processing, receive a copy in a portable format, or withdraw consent where processing is based on consent. You may also complain to your applicable data protection authority.",
          "To make a request, email contact@5sens.tn. Please tell us which right you wish to exercise and provide enough information for us to locate your submission. We may ask you to verify your identity before acting. Deleting the draft cookie in your browser may also prevent you from resuming an unfinished questionnaire.",
        ],
      },
      {
        heading: "8. Children and policy updates",
        paragraphs: [
          "Doctor Com is a business communication service and is not directed to children. Do not submit information about a child.",
          "We may update this policy when our practices or legal requirements change. We will publish the current version here and update the date above.",
        ],
      },
    ],
  },
  fr: {
    home: "Retour à Doctor Com",
    eyebrow: "DOCTOR COM · 5 SENS ADVERTISING",
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : 13 octobre 2026",
    intro:
      "Cette politique explique comment 5 Sens Advertising (« 5 Sens », « nous ») recueille et utilise les données personnelles lorsque vous utilisez le site, le questionnaire et l’application mobile Doctor Com. L’application mobile affiche le site dans une WebView et applique les mêmes pratiques de traitement.",
    sections: [
      {
        heading: "1. Responsable du traitement",
        paragraphs: [
          "5 Sens Advertising est responsable des données personnelles décrites dans cette politique. Pour toute question ou demande relative à la confidentialité, contactez-nous à",
        ],
        email: "contact@5sens.tn",
      },
      {
        heading: "2. Données recueillies",
        paragraphs: [
          "Informations fournies sur votre entreprise : nom, secteur, pays, ville, taille, site web et réseaux sociaux sélectionnés ; objectifs marketing, clientèle et profil cible, zone géographique visée, canaux utilisés, niveau de satisfaction, concurrents, investissements marketing antérieurs, fourchette et devise du budget, fréquence souhaitée et délais envisagés.",
          "Coordonnées et informations sur la demande : nom, fonction, adresse email, numéro de téléphone, langue choisie, choix de consentement, vérification de l’adresse email, progression du questionnaire et réponses envoyées. N’incluez pas de données personnelles sensibles, de données médicales ou d’informations sur des tiers qui ne sont pas nécessaires à votre demande.",
          "Informations nécessaires au fonctionnement du service : un cookie indispensable, inaccessible au JavaScript, qui identifie votre brouillon, ainsi qu’un cookie temporaire de vérification de votre adresse email. Nos prestataires d’hébergement et de réseau peuvent également traiter des informations techniques de connexion, telles que l’adresse IP, le navigateur, l’appareil et l’heure des requêtes, dans le cadre normal du service.",
          "L’application ne demande pas l’accès à vos contacts, à l’appareil photo, au microphone ou à votre position précise. Elle ne recueille pas de données de santé. Nous n’utilisons pas de SDK publicitaire ou analytique dans l’application.",
        ],
      },
      {
        heading: "3. Utilisation des données",
        paragraphs: [
          "Nous utilisons vos réponses pour enregistrer et reprendre le questionnaire, vérifier l’adresse email fournie, évaluer votre demande, calculer un score interne de prospect, préparer et fournir un plan de communication personnalisé, et répondre à votre demande ou assurer son suivi au sujet des services associés de 5 Sens.",
          "Votre adresse email sert à vous envoyer un code de vérification à usage unique. Si votre demande répond à nos critères de priorité élevée, nous transmettons également à notre équipe les coordonnées et informations professionnelles pertinentes afin qu’elle puisse assurer le suivi.",
          "Les informations demandées sont facultatives, mais les réponses et coordonnées obligatoires sont nécessaires pour préparer et fournir le plan demandé. Aucune décision ayant un effet juridique ou similaire n’est prise uniquement par un moyen automatisé.",
        ],
      },
      {
        heading: "4. Partage des données",
        paragraphs: [
          "Nous ne vendons ni ne louons les données personnelles. Nous les communiquons uniquement aux personnes autorisées par 5 Sens et aux prestataires agissant pour notre compte, dans la mesure nécessaire :",
          "Google Sheets stocke les questionnaires envoyés, y compris les réponses, coordonnées, choix de consentement, score de prospect et date d’envoi. Resend envoie les codes de vérification et, pour les demandes prioritaires, une notification contenant des informations de contact à notre équipe. Anthropic traite les informations du questionnaire nécessaires à la génération du plan de communication. Nos prestataires d’hébergement du site et du serveur traitent les données nécessaires à l’hébergement et à la sécurité du service.",
          "Ces prestataires traitent les données selon leurs conditions de service et politiques de confidentialité. Selon le prestataire et l’infrastructure utilisés, les données peuvent être traitées hors de Tunisie, notamment aux États-Unis. Nous pouvons également divulguer des informations lorsque la loi l’exige ou afin de protéger les droits, la sécurité des utilisateurs ou du service.",
          "Nous n’autorisons pas ces prestataires à utiliser les réponses au questionnaire à des fins publicitaires propres. Le traitement par ces prestataires reste également soumis à leurs propres règles de conservation, de sécurité et obligations légales.",
        ],
      },
      {
        heading: "5. Stockage et durée de conservation",
        paragraphs: [
          "Les brouillons, l’état de vérification email et les rapports générés sont conservés temporairement dans la mémoire du serveur. Ils sont effacés au redémarrage du processus serveur. Le cookie de brouillon expire après 30 jours par défaut ; le cookie et le code de vérification expirent après 10 minutes.",
          "Les demandes finalisées sont stockées dans une feuille Google Sheets et supprimées manuellement au plus tard six mois après leur envoi. Si vous demandez une suppression plus tôt, nous traiterons votre demande comme décrit ci-dessous. Des copies détenues par des prestataires, par exemple des traces d’envoi d’emails ou des sauvegardes, peuvent subsister pendant les durées définies par ces prestataires.",
          "Nous ne conservons les informations plus longtemps que si cela est nécessaire pour respecter une obligation légale, régler un litige ou établir ou défendre un droit en justice.",
        ],
      },
      {
        heading: "6. Sécurité",
        paragraphs: [
          "Nous mettons en œuvre des mesures destinées à protéger les données, notamment HTTPS pour les connexions de production, des contrôles d’accès aux comptes de service et des cookies inaccessibles au JavaScript pour les jetons de brouillon et de vérification email. L’accès aux demandes est limité aux personnes autorisées qui en ont besoin pour les traiter.",
          "Aucun site, moyen de transmission ou de stockage ne peut garantir une sécurité absolue. N’envoyez pas d’informations inutiles ou sensibles.",
        ],
      },
      {
        heading: "7. Vos droits",
        paragraphs: [
          "Sous réserve du droit qui vous est applicable, vous pouvez demander confirmation du traitement de vos données, y accéder, les rectifier, les supprimer, limiter certains traitements ou vous y opposer, en recevoir une copie dans un format portable, ou retirer votre consentement lorsque le traitement repose sur celui-ci. Vous pouvez également saisir l’autorité de protection des données compétente.",
          "Pour exercer un droit, écrivez à contact@5sens.tn. Indiquez le droit souhaité et les informations permettant de retrouver votre demande. Nous pouvons vous demander de vérifier votre identité avant d’agir. La suppression du cookie de brouillon dans votre navigateur peut aussi empêcher la reprise d’un questionnaire inachevé.",
        ],
      },
      {
        heading: "8. Mineurs et mises à jour",
        paragraphs: [
          "Doctor Com est un service de communication destiné aux entreprises et ne s’adresse pas aux enfants. Ne transmettez pas d’informations concernant un enfant.",
          "Nous pouvons mettre à jour cette politique en cas d’évolution de nos pratiques ou du droit applicable. La version en vigueur sera publiée ici et la date ci-dessus sera actualisée.",
        ],
      },
    ],
  },
} as const;

export default function PrivacyPolicy() {
  const [language, setLanguage] = useState<Language>("en");
  const text = copy[language];

  useEffect(() => {
    document.title = `${text.title} | Doctor Com`;
    document.documentElement.lang = language;
  }, [language, text.title]);

  return (
    <main className="privacy-policy" lang={language}>
      <header className="privacy-policy__header">
        <a className="privacy-policy__home" href="/">{text.home}</a>
        <nav aria-label="Language" className="privacy-policy__languages">
          {(["en", "fr"] as const).map((item) => (
            <button
              aria-pressed={language === item}
              key={item}
              onClick={() => setLanguage(item)}
              type="button"
            >
              {item.toUpperCase()}
            </button>
          ))}
        </nav>
      </header>
      <article className="privacy-policy__article">
        <p className="privacy-policy__eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p className="privacy-policy__updated">{text.updated}</p>
        <p className="privacy-policy__intro">{text.intro}</p>
        {text.sections.map((section) => (
          <section className="privacy-policy__section" key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {"email" in section && (
              <p>
                <a href={`mailto:${section.email}`}>{section.email}</a>.
              </p>
            )}
          </section>
        ))}
        <footer className="privacy-policy__footer">
          <a href="/">{text.home}</a>
        </footer>
      </article>
    </main>
  );
}

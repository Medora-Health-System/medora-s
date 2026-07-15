/**
 * US enterprise registration packet legal section library (v2).
 * Status: SOURCE_GROUNDED_PENDING_LEGAL_APPROVAL — not facility-approved legal final copy.
 * Do not copy legacy Priority ER / third-party copyrighted packets.
 */

export type LocalizedPair = { en: string; fr: string; es?: string };

export type UsPacketSectionDef = {
  key: string;
  sortOrder: number;
  title: LocalizedPair;
  conciseSummary: LocalizedPair;
  fullBody: LocalizedPair;
  sourceLabel?: string;
  sourceUrl?: string;
  authorityType?: "FEDERAL" | "STATE" | "FACILITY_POLICY" | "INTERNAL";
  contentVersion: string;
  acknowledgmentRequired?: boolean;
  acknowledgmentText?: LocalizedPair;
  separateSignatureRequired?: boolean;
  /** Packet template codes that include this section by default. */
  packetTypes: Array<"FREESTANDING_ER" | "URGENT_CARE" | "CLINIC" | "HOSPITAL">;
  /** Optional SHOW_IF condition key. */
  showIf?: string;
};

const L = (en: string, fr: string, es?: string): LocalizedPair =>
  es ? { en, fr, es } : { en, fr };

/** Shared core sections — adapted frameworks, pending legal approval. */
export const US_CORE_PACKET_SECTIONS_V2: UsPacketSectionDef[] = [
  {
    key: "demographics",
    sortOrder: 10,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Patient Identification and Demographics", "Identification et données démographiques", "Identificación y datos demográficos"),
    conciseSummary: L(
      "Confirm your legal name, date of birth, contact information, and address so we can identify you safely and communicate about your care.",
      "Confirmez votre nom légal, date de naissance, coordonnées et adresse afin de vous identifier en toute sécurité et de communiquer au sujet de vos soins.",
    ),
    fullBody: L(
      "Please review the patient identification information on this package. Tell staff immediately if any information is incorrect. Optional demographic fields (such as preferred name, gender identity, pronouns, preferred language, or interpreter need) appear only when enabled by this facility. Sensitive fields such as Social Security number, race, ethnicity, religion, or employer are never universally required and appear only under a facility-approved policy.",
      "Veuillez examiner les informations d'identification du patient sur ce dossier. Informez immédiatement le personnel si une information est incorrecte. Les champs démographiques facultatifs (nom préféré, identité de genre, pronoms, langue préférée ou besoin d'interprète) n'apparaissent que s'ils sont activés par cet établissement. Les champs sensibles (numéro de sécurité sociale, race, ethnie, religion ou employeur) ne sont jamais obligatoires pour tous et n'apparaissent que selon une politique approuvée par l'établissement.",
    ),
    authorityType: "INTERNAL",
    contentVersion: "2.0.0",
  },
  {
    key: "emergencyContact",
    sortOrder: 15,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Emergency Contact and Responsible Party", "Contact d'urgence et partie responsable", "Contacto de emergencia y parte responsable"),
    conciseSummary: L(
      "Provide an emergency contact and, when applicable, a responsible party or legal representative who may help with care decisions or billing communications.",
      "Fournissez un contact d'urgence et, le cas échéant, une partie responsable ou un représentant légal pouvant aider pour les décisions de soins ou la facturation.",
    ),
    fullBody: L(
      "Emergency contact and responsible-party information helps the facility reach someone if you cannot communicate. For minors or patients with a legal guardian or healthcare agent, identify the representative relationship. This section does not appoint an insurance appeal representative or authorize release of records beyond what is needed for treatment, payment, and healthcare operations unless a separate authorization is completed.",
      "Les informations de contact d'urgence et de partie responsable aident l'établissement à joindre quelqu'un si vous ne pouvez pas communiquer. Pour les mineurs ou les patients disposant d'un tuteur légal ou d'un mandataire de soins, précisez la relation. Cette section ne désigne pas un représentant pour les recours d'assurance et n'autorise pas la communication de dossiers au-delà de ce qui est nécessaire au traitement, au paiement et aux opérations de soins, sauf autorisation distincte.",
    ),
    authorityType: "INTERNAL",
    contentVersion: "2.0.0",
  },
  {
    key: "insurance",
    sortOrder: 20,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Insurance and Coordination of Benefits", "Assurance et coordination des prestations", "Seguro y coordinación de beneficios"),
    conciseSummary: L(
      "Confirm primary and secondary coverage information so available benefits can be billed accurately. Tell us about other coverage that may apply.",
      "Confirmez les informations de couverture primaire et secondaire afin que les prestations disponibles puissent être facturées correctement. Indiquez toute autre couverture applicable.",
    ),
    fullBody: L(
      "I acknowledge that the insurance information provided is accurate to the best of my knowledge. I understand that coordination of benefits rules may determine which plan pays first. If I have Medicare, Medicaid, workers' compensation, motor-vehicle, or liability coverage, I will inform staff. Pharmacy benefit information is collected only when required by this facility's workflow. Providing insurance information does not guarantee coverage or payment amounts.",
      "Je reconnais que les informations d'assurance fournies sont exactes au mieux de ma connaissance. Je comprends que les règles de coordination des prestations peuvent déterminer quel régime paie en premier. Si j'ai une couverture Medicare, Medicaid, d'accident du travail, automobile ou responsabilité, j'en informerai le personnel. Les informations sur les prestations pharmaceutiques ne sont recueillies que si le flux de travail de l'établissement l'exige. Fournir des informations d'assurance ne garantit ni couverture ni montants de paiement.",
    ),
    authorityType: "INTERNAL",
    contentVersion: "2.0.0",
    acknowledgmentRequired: true,
    acknowledgmentText: L(
      "I confirm the insurance and other-coverage information above is accurate to the best of my knowledge.",
      "Je confirme que les informations d'assurance et d'autres couvertures ci-dessus sont exactes au mieux de ma connaissance.",
    ),
  },
  {
    key: "consent",
    sortOrder: 30,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Consent for Evaluation and Treatment", "Consentement à l'évaluation et au traitement", "Consentimiento para evaluación y tratamiento"),
    conciseSummary: L(
      "I authorize the facility and its clinical professionals to evaluate and treat me, including medically appropriate examinations, diagnostic testing, medications, procedures, and other services discussed with me.",
      "J'autorise l'établissement et ses professionnels cliniques à m'évaluer et me soigner, y compris les examens, tests diagnostiques, médicaments, procédures et autres services médicalement appropriés discutés avec moi.",
    ),
    fullBody: L(
      "I consent to evaluation and treatment by this facility and its employed or credentialed clinicians, including medically appropriate examinations, laboratory and imaging studies, medications, and therapeutic interventions discussed with me. I understand medicine is not an exact science and no specific outcome is guaranteed. I may ask questions and, when legally and clinically permissible, refuse or withdraw consent. Emergencies may require care before full discussion is possible. Separate informed consent is required for procedures that this facility designates as needing procedure-specific consent. This consent does not authorize research, marketing photography, or unrelated optional authorizations.",
      "Je consens à l'évaluation et au traitement par cet établissement et ses cliniciens salariés ou accrédités, y compris les examens médicalement appropriés, analyses de laboratoire et imagerie, médicaments et interventions thérapeutiques discutés avec moi. Je comprends que la médecine n'est pas une science exacte et qu'aucun résultat précis n'est garanti. Je peux poser des questions et, lorsque la loi et la clinique le permettent, refuser ou retirer mon consentement. Les urgences peuvent exiger des soins avant une discussion complète. Un consentement éclairé distinct est requis pour les procédures que l'établissement désigne comme nécessitant un consentement spécifique. Ce consentement n'autorise pas la recherche, la photographie marketing ni d'autres autorisations facultatives non liées.",
    ),
    sourceLabel: "Facility treatment consent framework (pending legal approval)",
    authorityType: "FACILITY_POLICY",
    contentVersion: "2.0.0",
    acknowledgmentRequired: true,
  },
  {
    key: "aob",
    sortOrder: 40,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Assignment of Benefits and Financial Responsibility", "Cession des prestations et responsabilité financière", "Cesión de beneficios y responsabilidad financiera"),
    conciseSummary: L(
      "I authorize billing of available coverage and understand I may be responsible for deductibles, copays, coinsurance, and non-covered charges subject to applicable law.",
      "J'autorise la facturation des couvertures disponibles et comprends que je peux être responsable des franchises, tickets modérateurs, coassurances et frais non couverts, sous réserve du droit applicable.",
    ),
    fullBody: L(
      "I assign payable medical benefits to this facility and authorize direct payment for covered services where permitted. I authorize release of the minimum necessary information for billing and payment. I understand I remain financially responsible for deductibles, copayments, coinsurance, and non-covered charges to the extent allowed by federal and state law, including surprise-billing protections when they apply. Separate professional, laboratory, radiology, pathology, or vendor bills may be issued when configured for this facility. Estimates are not guarantees. This section does not waive No Surprises Act protections and does not replace a separate NSA notice or consent document when required.",
      "Je cède les prestations médicales payables à cet établissement et autorise le paiement direct des services couverts lorsque cela est permis. J'autorise la communication des informations minimales nécessaires à la facturation et au paiement. Je comprends que je reste financièrement responsable des franchises, tickets modérateurs, coassurances et frais non couverts dans la mesure permise par le droit fédéral et étatique, y compris les protections contre la facturation surprise lorsqu'elles s'appliquent. Des factures distinctes (professionnels, laboratoire, radiologie, pathologie ou fournisseurs) peuvent être émises selon la configuration de l'établissement. Les estimations ne sont pas des garanties. Cette section ne renonce pas aux protections de la No Surprises Act et ne remplace pas un avis ou consentement NSA distinct lorsque requis.",
    ),
    sourceLabel: "CMS No Surprises resources (notice kept separate)",
    sourceUrl: "https://www.cms.gov/nosurprises/policies-and-resources/overview-of-rules-fact-sheets",
    authorityType: "FEDERAL",
    contentVersion: "2.0.0",
    acknowledgmentRequired: true,
  },
  {
    key: "facilityDisclosure",
    sortOrder: 45,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Facility and Care Setting Disclosure", "Divulgation sur l'établissement et le cadre de soins", "Divulgación del establecimiento y entorno de atención"),
    conciseSummary: L(
      "This package uses the active facility name and facility-approved disclosures for care setting, affiliation, billing entities, and contacts.",
      "Ce dossier utilise le nom de l'établissement actif et les divulgations approuvées concernant le cadre de soins, l'affiliation, les entités de facturation et les contacts.",
    ),
    fullBody: L(
      "Facility identity, care-setting status (for example freestanding emergency, urgent care, clinic, or hospital), hospital affiliation, network participation, physician ownership, independent-contractor status, Medicare/Medicaid participation, facility or observation fees, transfer capabilities, complaint contacts, and price-transparency resources are provided only from facility-approved configuration. No hard-coded third-party brand, obsolete fee range, or unconfigured participation claim is used. Ask staff for the current facility fee schedule or estimate when amounts apply. Contact details for privacy, billing, and grievances are those configured for this facility.",
      "L'identité de l'établissement, le statut du cadre de soins (urgence autonome, soins urgents, clinique ou hôpital), l'affiliation hospitalière, la participation au réseau, la propriété médicale, le statut de contractant indépendant, la participation Medicare/Medicaid, les frais d'établissement ou d'observation, les capacités de transfert, les contacts de réclamation et les ressources de transparence des prix ne proviennent que de la configuration approuvée par l'établissement. Aucune marque tierce codée en dur, ancienne fourchette de tarifs ou affirmation de participation non configurée n'est utilisée. Demandez au personnel le barème ou l'estimation en vigueur lorsque des montants s'appliquent. Les coordonnées de confidentialité, facturation et réclamations sont celles configurées pour cet établissement.",
    ),
    authorityType: "FACILITY_POLICY",
    contentVersion: "2.0.0",
  },
  {
    key: "privacy",
    sortOrder: 50,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("HIPAA Notice of Privacy Practices Acknowledgment", "Accusé de réception de l'avis de confidentialité HIPAA", "Acuse de recibo del Aviso de prácticas de privacidad HIPAA"),
    conciseSummary: L(
      "I acknowledge that I have been offered the Notice of Privacy Practices describing how health information may be used and disclosed and how I may exercise my privacy rights.",
      "Je reconnais qu'on m'a offert l'Avis de pratiques de confidentialité décrivant comment les informations de santé peuvent être utilisées et divulguées et comment exercer mes droits.",
    ),
    fullBody: L(
      "NOTICE OF PRIVACY PRACTICES — ACKNOWLEDGMENT AND SUMMARY (framework based on the HHS model for healthcare providers; facility-specific contacts and effective date come from facility configuration).\n\nThis facility may use and disclose protected health information for treatment, payment, and healthcare operations as permitted by HIPAA. Other uses and disclosures may include public-health and safety activities, health oversight, workers' compensation, organ donation, medical examiners/coroners, certain law-enforcement purposes, judicial and administrative proceedings, and other purposes required or permitted by law. You have rights to access and obtain a copy of your records, request amendments, request restrictions, request confidential communications, receive an accounting of certain disclosures, and file a complaint with the facility privacy contact or HHS OCR. You may receive a paper copy of the full Notice upon request. Opening or expanding this section records that the full notice text was made available; it does not by itself prove you read every word. Facility privacy officer contact details are those configured for this facility — not a third-party brand contact.\n\nFull HHS model guidance: https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/privacy-practices-health-care-provider/",
      "AVIS DE PRATIQUES DE CONFIDENTIALITÉ — ACCUSÉ ET RÉSUMÉ (cadre fondé sur le modèle HHS pour les prestataires; les contacts et la date d'effet propres à l'établissement proviennent de sa configuration).\n\nCet établissement peut utiliser et divulguer des informations de santé protégées pour le traitement, le paiement et les opérations de soins comme le permet HIPAA. D'autres utilisations et divulgations peuvent inclure la santé publique et la sécurité, la surveillance sanitaire, les accidents du travail, le don d'organes, les médecins légistes, certaines finalités policières, les procédures judiciaires/administratives, et d'autres finalités exigées ou permises par la loi. Vous avez le droit d'accéder à vos dossiers et d'en obtenir une copie, de demander des corrections, des restrictions, des communications confidentielles, un historique de certaines divulgations, et de déposer une plainte auprès du contact de confidentialité de l'établissement ou de l'OCR du HHS. Vous pouvez recevoir une copie papier de l'Avis complet sur demande. Ouvrir ou développer cette section enregistre que le texte complet a été mis à disposition; cela ne prouve pas à lui seul que vous avez lu chaque mot. Les coordonnées du responsable de la confidentialité sont celles configurées pour cet établissement — pas celles d'une marque tierce.\n\nGuidance modèle HHS: https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/privacy-practices-health-care-provider/",
    ),
    sourceLabel: "HHS Model Notice of Privacy Practices (provider)",
    sourceUrl: "https://www.hhs.gov/hipaa/for-professionals/privacy/guidance/privacy-practices-health-care-provider/",
    authorityType: "FEDERAL",
    contentVersion: "2.0.0",
    acknowledgmentRequired: true,
    acknowledgmentText: L(
      "I acknowledge that I have been offered the Notice of Privacy Practices and that a full copy is available to me.",
      "Je reconnais qu'on m'a offert l'Avis de pratiques de confidentialité et qu'une copie complète m'est disponible.",
    ),
  },
  {
    key: "rights",
    sortOrder: 60,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Patient Rights and Responsibilities", "Droits et responsabilités du patient", "Derechos y responsabilidades del paciente"),
    conciseSummary: L(
      "You have rights to respectful, informed, private care and responsibilities to provide accurate information and treat others respectfully.",
      "Vous avez le droit à des soins respectueux, éclairés et confidentiels, et la responsabilité de fournir des informations exactes et de traiter autrui avec respect.",
    ),
    fullBody: L(
      "Rights may include: respectful nondiscriminatory care; participation in decisions; understandable information; informed consent; refusal of treatment when legally permitted; privacy and confidentiality; access to records; communication and interpreter assistance; advance-directive information when applicable; safe care free from abuse; complaint and grievance processes; information about charges; visitation or support-person rights when applicable; transfer information; and choice regarding research participation. Responsibilities may include providing accurate information, asking questions, following agreed care plans when able, respecting staff and others, following safety policies, providing insurance/payment information, informing staff of changes, and meeting financial responsibilities subject to applicable law. Facility-specific rights policies control; this text is a framework pending legal approval and is not an automatic adoption of any third-party bill of rights page.",
      "Les droits peuvent inclure: des soins respectueux et non discriminatoires; la participation aux décisions; des informations compréhensibles; le consentement éclairé; le refus de traitement lorsque la loi le permet; la confidentialité; l'accès aux dossiers; l'aide à la communication et à l'interprétation; les informations sur les directives anticipées le cas échéant; des soins sûrs sans abus; les procédures de plainte; l'information sur les frais; les droits de visite ou de personne de soutien le cas échéant; les informations de transfert; et le choix concernant la recherche. Les responsabilités peuvent inclure fournir des informations exactes, poser des questions, suivre les plans de soins convenus lorsque possible, respecter le personnel et autrui, respecter les politiques de sécurité, fournir les informations d'assurance/paiement, informer le personnel des changements, et assumer les responsabilités financières sous réserve du droit applicable. Les politiques propres à l'établissement prévalent; ce texte est un cadre en attente d'approbation juridique.",
    ),
    sourceLabel: "CMS Emergency Room Rights / facility policy framework",
    sourceUrl: "https://www.cms.gov/priorities/your-patient-rights/emergency-room-rights",
    authorityType: "FEDERAL",
    contentVersion: "2.0.0",
    acknowledgmentRequired: true,
  },
  {
    key: "advanceDirectives",
    sortOrder: 65,
    packetTypes: ["FREESTANDING_ER", "HOSPITAL", "URGENT_CARE", "CLINIC"],
    title: L("Advance Directives", "Directives anticipées", "Directivas anticipadas"),
    conciseSummary: L(
      "Tell us whether you have an advance directive and whether you want information or to provide a copy.",
      "Indiquez si vous avez des directives anticipées et si vous souhaitez des informations ou fournir une copie.",
    ),
    fullBody: L(
      "An advance directive states your preferences about future healthcare decisions and may name a healthcare agent. Tell staff if you have an advance directive, want information, or wish to provide a copy. Emergency and freestanding settings may have different operational limits than inpatient hospitals; this notice does not claim identical inpatient obligations without facility legal confirmation. If you cannot respond, staff will document that status.",
      "Une directive anticipée exprime vos préférences pour de futures décisions de soins et peut désigner un mandataire. Informez le personnel si vous en avez une, souhaitez des informations ou fournir une copie. Les cadres d'urgence et autonomes peuvent avoir des limites opérationnelles différentes des hôpitaux avec hospitalisation; cet avis n'affirme pas des obligations identiques sans confirmation juridique de l'établissement. Si vous ne pouvez pas répondre, le personnel documentera cet état.",
    ),
    authorityType: "FACILITY_POLICY",
    contentVersion: "2.0.0",
  },
  {
    key: "personalBelongings",
    sortOrder: 70,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "HOSPITAL"],
    title: L("Personal Belongings and Valuables", "Effets personnels et objets de valeur", "Pertenencias personales y objetos de valor"),
    conciseSummary: L(
      "Please secure valuables. Ask staff about any facility safekeeping process that is available.",
      "Veuillez sécuriser vos objets de valeur. Demandez au personnel s'il existe une procédure de consignation.",
    ),
    fullBody: L(
      "Patients are encouraged to keep only essential items and to secure valuables. When this facility offers safekeeping, staff will document inventory according to facility policy. This notice does not create an unlawful blanket waiver of liability; applicable law and facility policy control.",
      "Les patients sont encouragés à ne conserver que l'essentiel et à sécuriser les objets de valeur. Lorsque l'établissement propose une consignation, le personnel documentera l'inventaire selon la politique. Cet avis ne crée pas une renonciation générale illégale à la responsabilité; le droit applicable et la politique de l'établissement prévalent.",
    ),
    authorityType: "FACILITY_POLICY",
    contentVersion: "2.0.0",
  },
  {
    key: "communications",
    sortOrder: 75,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Communications and Patient Portal Consent", "Consentement aux communications et au portail patient", "Consentimiento de comunicaciones y portal del paciente"),
    conciseSummary: L(
      "Choose how we may contact you about care, appointments, and billing. Marketing consent is separate and optional.",
      "Choisissez comment nous pouvons vous contacter pour les soins, rendez-vous et facturation. Le consentement marketing est distinct et facultatif.",
    ),
    fullBody: L(
      "You may consent to telephone, voicemail, SMS, email, and/or patient-portal messages for care coordination, appointment/follow-up, and billing communications as offered by this facility. Unencrypted electronic communication carries privacy risks. You may withdraw communication preferences prospectively. This section does not authorize marketing communications; marketing requires a separate optional authorization when offered.",
      "Vous pouvez consentir au téléphone, messagerie vocale, SMS, e-mail et/ou messages du portail patient pour la coordination des soins, le suivi des rendez-vous et la facturation, selon l'offre de l'établissement. Les communications électroniques non chiffrées comportent des risques pour la confidentialité. Vous pouvez retirer vos préférences pour l'avenir. Cette section n'autorise pas le marketing; le marketing exige une autorisation facultative distincte lorsqu'elle est proposée.",
    ),
    authorityType: "FACILITY_POLICY",
    contentVersion: "2.0.0",
    acknowledgmentRequired: false,
  },
  {
    key: "safetyPolicy",
    sortOrder: 80,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "HOSPITAL"],
    title: L("Weapons, Contraband, and Safety Policy", "Politique sur les armes, objets interdits et sécurité", "Política de armas, contrabando y seguridad"),
    conciseSummary: L(
      "Weapons and prohibited items are not allowed. Safety searches and law-enforcement involvement follow facility policy and applicable law.",
      "Les armes et objets interdits ne sont pas autorisés. Les fouilles de sécurité et l'implication des forces de l'ordre suivent la politique de l'établissement et le droit applicable.",
    ),
    fullBody: L(
      "For the safety of patients, visitors, and staff, weapons and other prohibited items are not permitted on facility premises except as required by law. Facility staff may implement safety screening consistent with facility policy. Disposition of contraband and any law-enforcement involvement follow applicable law and facility policy. This acknowledgment is facility-configurable and not copied from any third-party legacy packet.",
      "Pour la sécurité des patients, visiteurs et du personnel, les armes et autres objets interdits ne sont pas permis dans les locaux, sauf obligation légale. Le personnel peut appliquer un contrôle de sécurité conforme à la politique. La disposition des objets interdits et toute implication policière suivent le droit applicable et la politique. Cet accusé est configurable par établissement et n'est pas copié d'un dossier tiers historique.",
    ),
    authorityType: "FACILITY_POLICY",
    contentVersion: "2.0.0",
    acknowledgmentRequired: true,
  },
  {
    key: "grievance",
    sortOrder: 85,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Grievance and Complaint Information", "Informations sur les plaintes et réclamations", "Información de quejas y reclamaciones"),
    conciseSummary: L(
      "You may file a complaint with the facility and, when applicable, with state or federal agencies. Contacts come from facility configuration.",
      "Vous pouvez déposer une plainte auprès de l'établissement et, le cas échéant, auprès d'organismes étatiques ou fédéraux. Les contacts proviennent de la configuration de l'établissement.",
    ),
    fullBody: L(
      "You may raise concerns with facility leadership, a patient advocate, compliance, or the privacy officer using facility-configured contact information. Privacy complaints may also be filed with HHS OCR. Texas facilities may provide Texas HHSC complaint information when applicable. CMS or other state contacts appear only when configured for this facility. Contact details are versioned through facility configuration and are never taken from a third-party brand packet.",
      "Vous pouvez faire part de préoccupations à la direction, à un défenseur des patients, à la conformité ou au responsable de la confidentialité via les contacts configurés. Les plaintes de confidentialité peuvent aussi être déposées auprès de l'OCR du HHS. Les établissements du Texas peuvent fournir les informations de plainte HHSC le cas échéant. Les contacts CMS ou étatiques n'apparaissent que s'ils sont configurés. Les coordonnées sont versionnées via la configuration et ne proviennent jamais d'un dossier de marque tierce.",
    ),
    authorityType: "FACILITY_POLICY",
    contentVersion: "2.0.0",
  },
  {
    key: "nondiscrimination",
    sortOrder: 90,
    packetTypes: ["FREESTANDING_ER", "URGENT_CARE", "CLINIC", "HOSPITAL"],
    title: L("Nondiscrimination and Language Assistance", "Non-discrimination et aide linguistique", "No discriminación y asistencia lingüística"),
    conciseSummary: L(
      "This facility does not discriminate and provides language assistance and disability accommodations as required and configured.",
      "Cet établissement ne discrimine pas et fournit une aide linguistique et des aménagements pour handicap selon les exigences et la configuration.",
    ),
    fullBody: L(
      "When Section 1557 or other nondiscrimination requirements apply to this facility as configured, the facility provides notice of nondiscrimination, disability accommodations, and language assistance, including interpreter access. Accessibility and language-assistance contacts are those configured for this facility. Applicability is facility-configurable and subject to legal review.",
      "Lorsque l'article 1557 ou d'autres exigences de non-discrimination s'appliquent à cet établissement selon sa configuration, l'établissement fournit un avis de non-discrimination, des aménagements pour handicap et une aide linguistique, y compris l'accès à un interprète. Les contacts d'accessibilité et d'aide linguistique sont ceux configurés pour l'établissement. L'applicabilité est configurable et soumise à revue juridique.",
    ),
    authorityType: "FEDERAL",
    contentVersion: "2.0.0",
  },
  {
    key: "medicareMedicaid",
    sortOrder: 95,
    packetTypes: ["FREESTANDING_ER"],
    showIf: "FREESTANDING_ER",
    title: L("Medicare and Medicaid Participation Notice", "Avis de participation Medicare et Medicaid", "Aviso de participación en Medicare y Medicaid"),
    conciseSummary: L(
      "Medicare and Medicaid participation for this facility is stated only from facility-approved configuration — never assumed.",
      "La participation Medicare et Medicaid de cet établissement n'est indiquée que selon la configuration approuvée — jamais présumée.",
    ),
    fullBody: L(
      "Medicare and/or Medicaid participation status is determined solely by this facility's approved registration disclosure configuration. If participation is configured as DOES_NOT_PARTICIPATE, you may be responsible for charges to the extent allowed by law and you should ask about hospital-based alternatives that may accept these programs. If participation is PARTICIPATES, billing follows applicable program rules. If status is NOT_CONFIGURED, staff must not assert non-participation; ask the facility for the current written status before relying on any participation statement. No obsolete fee amounts from legacy forms are included.",
      "Le statut de participation Medicare et/ou Medicaid est déterminé uniquement par la configuration de divulgation d'inscription approuvée de cet établissement. Si la participation est configurée comme DOES_NOT_PARTICIPATE, vous pouvez être responsable des frais dans la mesure permise par la loi et vous devriez vous renseigner sur des alternatives hospitalières pouvant accepter ces programmes. Si la participation est PARTICIPATES, la facturation suit les règles applicables. Si le statut est NOT_CONFIGURED, le personnel ne doit pas affirmer une non-participation; demandez le statut écrit actuel avant de vous fier à toute affirmation. Aucun montant obsolète provenant de formulaires historiques n'est inclus.",
    ),
    authorityType: "FACILITY_POLICY",
    contentVersion: "2.0.0",
    acknowledgmentRequired: true,
  },
  {
    key: "emtalaNotice",
    sortOrder: 100,
    packetTypes: ["HOSPITAL"],
    showIf: "EMTALA_APPLICABLE",
    title: L("EMTALA Emergency Care Notice", "Avis EMTALA sur les soins d'urgence", "Aviso EMTALA de atención de emergencia"),
    conciseSummary: L(
      "When EMTALA applies to this facility configuration, you have rights to a medical screening examination and stabilizing treatment for emergency medical conditions within the facility's capability.",
      "Lorsque l'EMTALA s'applique à la configuration de cet établissement, vous avez droit à un examen médical de dépistage et à un traitement de stabilisation des urgences dans les capacités de l'établissement.",
    ),
    fullBody: L(
      "When this facility's EmtalaApplicability setting is HOSPITAL_EMERGENCY_DEPARTMENT or HOSPITAL_AFFILIATED_OFF_CAMPUS_ED (or otherwise configured as EMTALA-applicable), federal EMTALA rules may require a medical screening examination and stabilizing treatment for emergency medical conditions within the capability and capacity of the facility, regardless of ability to pay. Independent freestanding emergency facilities are not automatically treated as EMTALA hospitals; language is selected only through approved facility configuration. Source: CMS EMTALA guidance.",
      "Lorsque le paramètre EmtalaApplicability de cet établissement est HOSPITAL_EMERGENCY_DEPARTMENT ou HOSPITAL_AFFILIATED_OFF_CAMPUS_ED (ou autrement configuré comme applicable à l'EMTALA), les règles fédérales EMTALA peuvent exiger un examen médical de dépistage et un traitement de stabilisation des urgences dans les capacités de l'établissement, indépendamment de la capacité de payer. Les urgences autonomes indépendantes ne sont pas automatiquement traitées comme des hôpitaux EMTALA; le libellé n'est choisi que via la configuration approuvée. Source: guidance CMS EMTALA.",
    ),
    sourceLabel: "CMS EMTALA",
    sourceUrl: "https://www.cms.gov/medicare/regulations-guidance/legislation/emergency-medical-treatment-labor-act",
    authorityType: "FEDERAL",
    contentVersion: "2.0.0",
  },
];

export const SPECIALIZED_PACKET_TEMPLATE_CODES = [
  "ROI_AUTHORIZATION",
  "INSURANCE_APPEAL_REPRESENTATIVE",
  "NO_SURPRISES_NOTICE",
  "NO_SURPRISES_NOTICE_AND_CONSENT",
  "GOOD_FAITH_ESTIMATE_ACK",
  "WORKERS_COMP_AUTHORIZATION",
  "MVA_TPL_ASSIGNMENT",
  "FINANCIAL_ASSISTANCE_APPLICATION",
  "TELEHEALTH_CONSENT",
  "RESEARCH_CONSENT",
  "MARKETING_PHOTO_AUTHORIZATION",
  "MINOR_CONSENT",
  "PROCEDURE_SPECIFIC_CONSENT",
  "AMA_REFUSAL",
  "TRANSFER_ACKNOWLEDGMENT",
] as const;

export function sectionsForPacketType(
  code: "FREESTANDING_ER" | "URGENT_CARE" | "CLINIC" | "HOSPITAL",
): UsPacketSectionDef[] {
  return US_CORE_PACKET_SECTIONS_V2.filter((s) => s.packetTypes.includes(code)).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

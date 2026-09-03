/**
 * MEDUI.ES.1E — Core Platform / Auth / Registration / Patient Chart
 * Governed Spanish overlay for the 1E scope.
 *
 * Each key path maps to a professionally reviewed Spanish translation.
 * Only keys within the 1E scope boundary are included.
 *
 * DO NOT add ED, inpatient, orders, MAR, pharmacy, lab, imaging,
 * clinic, dental, billing, or print keys here.
 */

export const MEDUI_ES_1E_OVERLAY: Record<string, string> = {
  // ──────────────────────────────────────────────
  // common.*
  // ──────────────────────────────────────────────
  "common.yes": "Sí",
  "common.no": "No",
  "common.loading": "Cargando…",
  "common.redirecting": "Redirigiendo…",
  "common.unauthorizedRedirect": "No tiene acceso a esta página.",
  "common.logout": "Cerrar sesión",
  "common.userFallback": "Usuario",
  "common.settings": "Configuración",
  "common.create": "Crear",
  "common.cancel": "Cancelar",
  "common.confirm": "Confirmar",
  "common.save": "Guardar",
  "common.edit": "Editar",
  "common.delete": "Eliminar",
  "common.activate": "Activar",
  "common.deactivate": "Desactivar",
  "common.dash": "—",
  "common.refresh": "Actualizar",
  "common.view": "Ver",
  "common.saving": "Guardando…",
  "common.searching": "Buscando…",
  "common.noResults": "Sin resultados",
  "common.nir": "ID",
  "common.type": "Tipo",
  "common.arrival": "Llegada",
  "common.actions": "Acciones",
  "common.priority": "Prioridad",
  "common.search": "Buscar",
  "common.back": "Volver",
  "common.searchMedicationPlaceholder": "Buscar un medicamento",
  "common.minCharsSearch": "Escriba al menos 2 caracteres",
  "common.loadError": "No se pudo cargar.",
  "common.searchPatient": "Buscar un paciente",
  "common.apply": "Aplicar",
  "common.offlineBanner": "Sin conexión",
  "common.syncingBanner": "Sincronizando…",
  "common.loadingEncounters": "Cargando consultas…",
  "common.name": "Nombre",
  "common.ageSex": "Edad / sexo",
  "common.contact": "Contacto",
  "common.posology": "Posología",
  "common.prescriber": "Prescriptor",
  "common.nurseAbbr": "Enf.",
  "common.assigned": "Asignado",
  "common.esiIndex": "Índice ESI",

  // ──────────────────────────────────────────────
  // appShell.*
  // ──────────────────────────────────────────────
  "appShell.msppMinistryTitle":
    "MINISTÈRE DE LA SANTÉ PUBLIQUE ET DE LA POPULATION",
  "appShell.sidebarCollapse": "Contraer menú",
  "appShell.sidebarExpand": "Expandir menú",
  "appShell.mobileMenuOpen": "Abrir menú de navegación",
  "appShell.mobileMenuClose": "Cerrar menú de navegación",
  "appShell.mobileMenuBackdrop": "Cerrar menú de navegación",
  "appShell.mobileNavDrawerLabel": "Navegación",
  "appShell.primaryNavigation": "Navegación principal",
  "appShell.authRecovery.title": "No se pudo verificar la sesión",
  "appShell.authRecovery.body":
    "Medora no pudo confirmar su sesión. Sus datos están seguros — reintente o inicie sesión nuevamente.",
  "appShell.authRecovery.autoRetryHint":
    "Reintentando automáticamente. También puede usar los botones a continuación.",
  "appShell.authRecovery.retry": "Reintentar",
  "appShell.authRecovery.goToLogin": "Ir al inicio de sesión",
  "appShell.authRecovery.reloadApp": "Recargar aplicación",
  "appShell.connectivity.reconnecting": "Reconectando…",

  // ──────────────────────────────────────────────
  // nav.*
  // ──────────────────────────────────────────────
  "nav.trackboard": "Tablero clínico",
  "nav.emergencyTriage": "Triaje de emergencias",
  "nav.registration": "Registro",
  "nav.radWorklist": "Lista de radiología",
  "nav.labWorklist": "Lista de laboratorio",
  "nav.pharmacyQueue": "Farmacia",
  "nav.pharmacyWorklist": "Lista de farmacia",
  "nav.pharmacyInventory": "Inventario",
  "nav.pharmacyDispense": "Dispensar",
  "nav.pharmacyLowStock": "Stock bajo",
  "nav.pharmacyExpiring": "Próximo a vencer",
  "nav.fracture": "Fractura",
  "nav.publicHealth": "Salud pública",
  "nav.vaccinations": "Inmunizaciones",
  "nav.diseaseReports": "Reporte de enfermedades",
  "nav.admin": "Administración",
  "nav.adminUsers": "Usuarios y acceso",
  "nav.adminAudit": "Registro de auditoría",
  "nav.adminGoLive": "Preparación para producción",
  "nav.adminExports": "Monitoreo de exportaciones",
  "nav.adminRoi": "Divulgación de expediente (ROI)",
  "nav.adminRoiMonitoring": "Monitoreo de ROI (plataforma)",
  "nav.adminBackupReadiness": "Respaldo y recuperación",
  "nav.adminSystemHealth": "Estado del sistema",
  "nav.adminCompliance": "Cumplimiento de auditoría",
  "nav.adminReports": "Informes de emergencias",
  "nav.adminMsppAccess": "Acceso MSPP (nacional)",
  "nav.msppDashboard": "MSPP — Panel",
  "nav.msppSurveillanceNationale": "MSPP — Vigilancia nacional",
  "nav.msppAlertesEscalades": "MSPP — Alertas y escalaciones",
  "nav.msppGestionAlertes": "MSPP — Gestión de alertas",
  "nav.msppNotificationCenter": "MSPP — Centro de notificaciones",
  "nav.msppRapport": "MSPP — Informes",
  "nav.msppBulletin": "MSPP — Boletín semanal",
  "nav.msppExports": "MSPP — Exportaciones",
  "nav.msppValidation": "MSPP — Validación",
  "nav.msppAuditHistory": "MSPP — Historial de validación",
  "nav.msppValidationAnalytics": "MSPP — Análisis de validación",

  // ──────────────────────────────────────────────
  // navGroups.*
  // ──────────────────────────────────────────────
  "navGroups.accueil": "Inicio",
  "navGroups.soins_dossiers": "Atención y expedientes",
  "navGroups.pharmacie": "Farmacia",
  "navGroups.examens": "Laboratorio e imagen",
  "navGroups.facturation": "Facturación",
  "navGroups.sante_publique": "Salud pública",
  "navGroups.mspp_surveillance": "Vigilancia",
  "navGroups.mspp_validation": "Validación",
  "navGroups.mspp_supervision": "Supervisión",
  "navGroups.mspp_surveillance_nationale": "Vigilancia nacional",
  "navGroups.mspp_alertes": "Alertas",
  "navGroups.mspp_gestion_alertes": "Gestión de alertas",
  "navGroups.mspp_communication": "Comunicaciones",
  "navGroups.mspp_exports": "Exportaciones",
  "navGroups.admin": "Administración",

  // ──────────────────────────────────────────────
  // landingHome.*
  // ──────────────────────────────────────────────
  "landingHome.previewAdmin": "Página de administración",
  "landingHome.previewProvider": "Espacio de trabajo del médico",
  "landingHome.previewNursing": "Enfermería",
  "landingHome.previewPharmacy": "Farmacia",
  "landingHome.previewRegistration": "Registro y admisión",
  "landingHome.previewLabWorklist": "Lista de laboratorio",
  "landingHome.previewRadWorklist": "Lista de radiología",
  "landingHome.previewBilling": "Facturación",
  "landingHome.previewFracture": "Fractura",
  "landingHome.previewTrackboard": "Tablero clínico",

  // ──────────────────────────────────────────────
  // auth.login.*
  // ──────────────────────────────────────────────
  "auth.login.title": "Iniciar sesión",
  "auth.login.subtitle":
    "Ingrese sus credenciales para acceder al expediente.",
  "auth.login.usernameLabel": "Nombre de usuario",
  "auth.login.usernamePlaceholder": "Correo electrónico o nombre de usuario",
  "auth.login.passwordLabel": "Contraseña",
  "auth.login.forgotPasswordLink": "¿Olvidó su contraseña?",
  "auth.login.submit": "Iniciar sesión",
  "auth.login.submitting": "Iniciando sesión…",
  "auth.login.suspenseLoading": "Cargando…",
  "auth.login.errorFallback":
    "No se pudo iniciar sesión. Intente nuevamente.",
  "auth.login.errorNetwork":
    "No se pudo iniciar sesión. Verifique su conexión e intente nuevamente.",
  "auth.login.languageLabel": "Idioma",
  "auth.login.languageToggleAria": "Elegir idioma de inicio de sesión",
  "auth.login.langFr": "Francés",
  "auth.login.langEn": "Inglés",

  // ──────────────────────────────────────────────
  // auth.forgotPassword.*
  // ──────────────────────────────────────────────
  "auth.forgotPassword.brandTagline":
    "Expediente clínico y seguimiento de atención para centros de salud con recursos limitados.",
  "auth.forgotPassword.title": "Olvidé mi contraseña",
  "auth.forgotPassword.subtitle":
    "Ingrese su dirección de correo electrónico. Si existe una cuenta, le enviaremos un enlace para restablecer su contraseña.",
  "auth.forgotPassword.emailLabel": "Correo electrónico",
  "auth.forgotPassword.emailPlaceholder": "usted@ejemplo.org",
  "auth.forgotPassword.submit": "Enviar enlace de restablecimiento",
  "auth.forgotPassword.submitting": "Enviando…",
  "auth.forgotPassword.successBody":
    "Si existe una cuenta con esta dirección, se ha enviado un enlace de restablecimiento. Revise su bandeja de entrada (y spam).",
  "auth.forgotPassword.backToSignIn": "← Volver al inicio de sesión",
  "auth.forgotPassword.errorGeneric":
    "Ocurrió un error. Intente nuevamente.",
  "auth.forgotPassword.serviceUnavailable":
    "Servicio no disponible. Intente más tarde.",

  // ──────────────────────────────────────────────
  // auth.resetPassword.*
  // ──────────────────────────────────────────────
  "auth.resetPassword.brandTagline":
    "Elija una nueva contraseña para su cuenta.",
  "auth.resetPassword.title": "Restablecer contraseña",
  "auth.resetPassword.subtitle":
    "Ingrese y confirme su nueva contraseña (al menos 8 caracteres).",
  "auth.resetPassword.newPasswordLabel": "Nueva contraseña",
  "auth.resetPassword.confirmPasswordLabel": "Confirmar contraseña",
  "auth.resetPassword.submit": "Restablecer contraseña",
  "auth.resetPassword.submitting": "Guardando…",
  "auth.resetPassword.successBody":
    "Su contraseña ha sido restablecida. Ahora puede iniciar sesión.",
  "auth.resetPassword.goToSignIn": "Ir al inicio de sesión",
  "auth.resetPassword.returnToSignIn": "Volver al inicio de sesión",
  "auth.resetPassword.backToSignIn": "← Volver al inicio de sesión",
  "auth.resetPassword.mismatch": "Las contraseñas no coinciden.",
  "auth.resetPassword.minLength":
    "La contraseña debe tener al menos 8 caracteres.",
  "auth.resetPassword.invalidLinkFallback":
    "Este enlace es inválido o ha expirado. Solicite uno nuevo.",
  "auth.resetPassword.invalidParamsTitle": "Enlace inválido",
  "auth.resetPassword.invalidParamsBody":
    "Este enlace de restablecimiento es inválido o incompleto. Solicite un nuevo enlace desde la página «Olvidé mi contraseña».",
  "auth.resetPassword.requestNewLink": "Solicitar un nuevo enlace",
  "auth.resetPassword.serviceUnavailable":
    "Servicio no disponible. Intente más tarde.",

  // ──────────────────────────────────────────────
  // auth.settings.*
  // ──────────────────────────────────────────────
  "auth.settings.title": "Configuración",
  "auth.settings.changePasswordHeading": "Cambiar contraseña",
  "auth.settings.currentPasswordLabel": "Contraseña actual",
  "auth.settings.newPasswordLabel": "Nueva contraseña",
  "auth.settings.confirmPasswordLabel": "Confirmar nueva contraseña",
  "auth.settings.submit": "Actualizar contraseña",
  "auth.settings.submitting": "Guardando…",
  "auth.settings.mismatch": "Las contraseñas no coinciden.",
  "auth.settings.minLength":
    "La contraseña debe tener al menos 8 caracteres.",
  "auth.settings.errorGeneric": "Ocurrió un error.",
  "auth.settings.serverError": "Error del servidor.",
  "auth.settings.success": "Contraseña actualizada.",

  // ──────────────────────────────────────────────
  // auth.mfa.*
  // ──────────────────────────────────────────────
  "auth.mfa.title": "Verificación en dos pasos",
  "auth.mfa.challengeIntro":
    "Ingrese el código de 6 dígitos de su aplicación de autenticación.",
  "auth.mfa.enrollmentRequiredIntro":
    "Su rol requiere verificación en dos pasos. Configure una aplicación de autenticación para continuar.",
  "auth.mfa.codeLabel": "Código de 6 dígitos",
  "auth.mfa.codePlaceholder": "123456",
  "auth.mfa.submit": "Verificar",
  "auth.mfa.submitting": "Verificando…",
  "auth.mfa.useRecoveryCode": "Usar un código de recuperación",
  "auth.mfa.useTotpCode": "Volver al código de 6 dígitos",
  "auth.mfa.recoveryCodeLabel": "Código de recuperación",
  "auth.mfa.recoveryCodePlaceholder": "XXXX-XXXX-XXXX",
  "auth.mfa.backToLogin": "← Volver al inicio de sesión",
  "auth.mfa.errorInvalid": "Código inválido o expirado.",
  "auth.mfa.errorGeneric":
    "La verificación falló. Intente nuevamente.",
  "auth.mfa.setupTitle": "Configurar verificación en dos pasos",
  "auth.mfa.setupIntro":
    "Escanee el código QR con una aplicación de autenticación (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden Authenticator, Authy).",
  "auth.mfa.setupCannotScan": "¿No puede escanear?",
  "auth.mfa.setupSecretLabel": "Ingrese este código manualmente",
  "auth.mfa.setupVerifyHeading": "Confirme con el primer código",
  "auth.mfa.setupVerifyHelper":
    "Abra su aplicación de autenticación e ingrese el código mostrado.",
  "auth.mfa.setupRegenerate": "Generar un nuevo secreto",
  "auth.mfa.setupCancel": "Cancelar",
  "auth.mfa.recoveryCodesTitle": "Códigos de recuperación",
  "auth.mfa.recoveryCodesIntro":
    "Guarde estos códigos en un lugar seguro. Cada código puede usarse una sola vez. Le permiten iniciar sesión si pierde acceso a su aplicación de autenticación.",
  "auth.mfa.recoveryCodesWarning":
    "⚠ Estos códigos no se mostrarán nuevamente. Descárguelos o cópielos antes de cerrar esta ventana.",
  "auth.mfa.recoveryCodesCopy": "Copiar",
  "auth.mfa.recoveryCodesCopied": "Copiado",
  "auth.mfa.recoveryCodesDownload": "Descargar (.txt)",
  "auth.mfa.recoveryCodesDone": "He guardado mis códigos",
  "auth.mfa.manageTitle": "Verificación en dos pasos",
  "auth.mfa.manageIntroDisabled":
    "La verificación en dos pasos agrega una capa adicional de protección a su cuenta.",
  "auth.mfa.manageIntroEnabled":
    "La verificación en dos pasos está activa en su cuenta.",
  "auth.mfa.manageStatusEnabled": "Activada",
  "auth.mfa.manageStatusDisabled": "Desactivada",
  "auth.mfa.manageRequiredBadge": "Requerida para su rol",
  "auth.mfa.manageEnable": "Activar verificación en dos pasos",
  "auth.mfa.manageDisable": "Desactivar",
  "auth.mfa.manageDisableConfirmTitle":
    "Desactivar verificación en dos pasos",
  "auth.mfa.manageDisableConfirmBody":
    "Ingrese un código de 6 dígitos para confirmar. Esto debilita la protección de su cuenta.",
  "auth.mfa.manageRegenerate": "Regenerar códigos de recuperación",
  "auth.mfa.manageRegenerateConfirmTitle":
    "Regenerar códigos de recuperación",
  "auth.mfa.manageRegenerateConfirmBody":
    "Ingrese un código de 6 dígitos para confirmar. Los códigos de recuperación existentes quedarán inutilizables inmediatamente.",
  "auth.mfa.manageLastVerified": "Última verificación:",
  "auth.mfa.manageNever": "Nunca",
  "auth.mfa.manageGenericError":
    "Ocurrió un error. Intente nuevamente.",
  "auth.mfa.manageDisabledSuccess":
    "Verificación en dos pasos desactivada.",
  "auth.mfa.manageRegeneratedSuccess":
    "Nuevos códigos de recuperación generados.",
  "auth.mfa.adminResetTitle": "Restablecer MFA de un usuario",
  "auth.mfa.adminResetIntro":
    "Restablece los factores MFA del usuario y revoca todas sus sesiones activas. Use esto para ayudar a un usuario que perdió acceso a su aplicación de autenticación.",
  "auth.mfa.adminResetUserIdLabel": "ID de usuario (UUID)",
  "auth.mfa.adminResetSubmit": "Restablecer MFA",
  "auth.mfa.adminResetSubmitting": "Restableciendo…",
  "auth.mfa.adminResetSuccess": "MFA restablecido y sesiones revocadas.",

  // ──────────────────────────────────────────────
  // auth.errors.*
  // ──────────────────────────────────────────────
  "auth.errors.MFA_INVALID_CODE":
    "Código de autenticación inválido o expirado.",
  "auth.errors.MFA_GRANT_INVALID":
    "Este paso de inicio de sesión expiró o es inválido. Vuelva e inicie sesión nuevamente.",
  "auth.errors.MFA_REPLAY_DETECTED":
    "Ese código ya fue utilizado. Espere un nuevo código de su aplicación.",
  "auth.errors.MFA_NOT_ENABLED":
    "La verificación en dos pasos no está activa en esta cuenta.",
  "auth.errors.MFA_ALREADY_ENABLED":
    "La verificación en dos pasos ya está habilitada.",
  "auth.errors.MFA_CHALLENGE_TOKEN_REQUIRED":
    "Token de verificación faltante. Vuelva e inicie sesión nuevamente.",
  "auth.errors.MFA_SERVER_MISCONFIGURED":
    "El servicio de inicio de sesión está mal configurado. Contacte a su administrador.",
  "auth.errors.INVALID_TOTP_FORMAT": "Ingrese un código de 6 dígitos.",
  "auth.errors.INVALID_REQUEST_BODY": "Solicitud inválida.",
  "auth.errors.USER_INVALID":
    "Esta cuenta no puede continuar el inicio de sesión.",
  "auth.errors.INVALID_CREDENTIALS":
    "Correo electrónico o contraseña incorrectos.",
  "auth.errors.RATE_LIMITED":
    "Demasiados intentos. Intente más tarde.",
  "auth.errors.AUTH_REQUEST_FAILED":
    "La solicitud falló. Intente nuevamente.",
  "auth.errors.SERVER_UNAVAILABLE":
    "Servicio no disponible. Intente más tarde.",
  "auth.errors.INVALID_SERVER_RESPONSE":
    "Respuesta del servidor inválida. Intente más tarde.",
  "auth.errors.UNEXPECTED_ERROR":
    "Ocurrió un error. Intente nuevamente.",
  "auth.errors.MFA_ENROLLMENT_NOT_STARTED":
    "Configure la verificación en dos pasos nuevamente (escanee el código QR) antes de ingresar un código.",
  "auth.errors.MFA_TOTP_REQUIRED":
    "Ingrese el código de 6 dígitos de su aplicación de autenticación.",
  "auth.errors.MFA_AUTH_REQUIRED": "Se requiere iniciar sesión.",
  "auth.errors.MFA_TOTP_OR_RECOVERY_REQUIRED":
    "Proporcione un código de 6 dígitos o un código de recuperación.",
  "auth.errors.RECOVERY_CODE_INVALID":
    "Formato de código de recuperación inválido.",

  // ──────────────────────────────────────────────
  // patientsListPage.*
  // ──────────────────────────────────────────────
  "patientsListPage.subtitleSearchFacility":
    "Buscar por nombre, identificación nacional o teléfono en este centro.",
  "patientsListPage.searchLabel": "Buscar",
  "patientsListPage.searchPlaceholder":
    "Buscar por nombre, identificación nacional o teléfono…",
  "patientsListPage.emptySearchTitle": "No se encontraron pacientes",
  "patientsListPage.emptySearchHint":
    "Intente con otro nombre, número o identificador.",
  "patientsListPage.colNir": "ID",
  "patientsListPage.colName": "Nombre",
  "patientsListPage.colAgeSex": "Edad / sexo",
  "patientsListPage.colDob": "Fecha de nacimiento",
  "patientsListPage.colPhone": "Teléfono",
  "patientsListPage.newPatient": "Nuevo paciente",
  "patientsListPage.openChart": "Abrir expediente",
  "patientsListPage.createEncounter": "Crear consulta",
  "patientsListPage.duplicateCheckOffline":
    "La verificación de duplicados es limitada sin conexión",
  "patientsListPage.errFacilityIdRequired":
    "Se requiere el identificador del centro",
  "patientsListPage.errContactRequired":
    "Se requiere teléfono o correo electrónico",
  "patientsListPage.errDobInvalid": "Fecha de nacimiento inválida",
  "patientsListPage.errDobFuture":
    "La fecha de nacimiento no puede ser futura",
  "patientsListPage.errCreatePatient": "No se pudo crear el paciente",
  "patientsListPage.postCreateBannerTitle": "Paciente guardado",
  "patientsListPage.postCreateBannerHint": "¿Qué desea hacer ahora?",
  "patientsListPage.postCreateGoChart": "Expediente del paciente",
  "patientsListPage.postCreateGoFacesheet": "Hoja de datos",
  "patientsListPage.postCreateGoInsurance": "Seguro principal",
  "patientsListPage.postCreateBannerSubhint":
    "Consejo: agregue primero el seguro principal, luego el secundario. Use la hoja de datos para verificar antes de iniciar una visita.",
  "patientsListPage.postCreateGoPrimaryInsurance":
    "Seguro principal (recomendado primero)",
  "patientsListPage.postCreateGoSecondaryInsurance": "Seguro secundario",
  "patientsListPage.postCreateEncountersList": "Lista de consultas",
  "patientsListPage.postCreateContinueRegistration":
    "Abrir espacio de trabajo de registro",
  "patientsListPage.postCreateDismiss": "Cerrar",
  "patientsListPage.queuedCreateBody":
    "Creación guardada sin conexión. El expediente se sincronizará cuando se restablezca la conexión.",
  "patientsListPage.titleNewPatient": "Nuevo paciente",
  "patientsListPage.hintDobSex":
    "Ingrese la fecha de nacimiento y el sexo — la edad se calcula automáticamente.",
  "patientsListPage.sectionIdentity": "Identidad",
  "patientsListPage.labelFirstName": "Nombre *",
  "patientsListPage.labelLastName": "Apellido *",
  "patientsListPage.labelDob": "Fecha de nacimiento *",
  "patientsListPage.labelSex": "Sexo *",
  "patientsListPage.labelAge": "Edad",
  "patientsListPage.sectionContact": "Contacto",
  "patientsListPage.labelPhone": "Teléfono",
  "patientsListPage.labelEmail": "Correo electrónico",
  "patientsListPage.labelAddress": "Dirección",
  "patientsListPage.labelAddressLine1": "Línea de dirección 1",
  "patientsListPage.labelAddressLine2": "Línea de dirección 2",
  "patientsListPage.labelCity": "Ciudad",
  "patientsListPage.labelPostalCode": "Código postal",
  "patientsListPage.labelStateProvince": "Estado / región",
  "patientsListPage.labelCountry": "País",
  "patientsListPage.sectionIdentifiers": "Identificadores",
  "patientsListPage.labelNationalId": "Identificación nacional",
  "patientsListPage.sectionMore": "Información adicional",
  "patientsListPage.labelEmergency": "Contacto de emergencia",
  "patientsListPage.labelEmergencyName":
    "Nombre del contacto de emergencia",
  "patientsListPage.labelEmergencyRelationship": "Parentesco",
  "patientsListPage.labelEmergencyPhone":
    "Teléfono del contacto de emergencia",
  "patientsListPage.labelAdminNotes": "Notas administrativas",
  "patientsListPage.similarPatientsTitle":
    "Pacientes similares encontrados",
  "patientsListPage.similarPatientsHint":
    "Revise antes de crear un nuevo expediente",
  "patientsListPage.checkingDuplicates": "Verificando…",
  "patientsListPage.continueAnyway": "Continuar de todas formas",
  "patientsListPage.openExistingChart": "Abrir expediente existente",
  "patientsListPage.btnSubmitCreating": "Creando…",
  "patientsListPage.btnCreatePatient": "Crear paciente",
  "patientsListPage.btnSavePatient": "Guardar paciente",
  "patientsListPage.ageMonthLabel": "mes",
  "patientsListPage.ageMonthsLabel": "meses",
  "patientsListPage.ageDayLabel": "día",
  "patientsListPage.ageDaysLabel": "días",

  // ──────────────────────────────────────────────
  // patientProfile.*
  // ──────────────────────────────────────────────
  "patientProfile.pageTitle": "Perfil del paciente",
  "patientProfile.pageSubtitle":
    "Datos de registro y demográficos de este paciente.",
  "patientProfile.backToChart": "Volver al expediente",
  "patientProfile.loadError": "No se pudo cargar este paciente.",
  "patientProfile.saveError": "No se pudieron guardar los cambios.",
  "patientProfile.saveSuccess": "Perfil guardado.",
  "patientProfile.saving": "Guardando…",
  "patientProfile.saveButton": "Guardar perfil",
  "patientProfile.cancelButton": "Cancelar",
  "patientProfile.validationError":
    "Revise los campos resaltados e intente nuevamente.",
  "patientProfile.accessDenied": "No tiene acceso a esta página.",
  "patientProfile.mrnReadOnly": "NHC (solo lectura)",
  "patientProfile.labelMiddleName": "Segundo nombre",
  "patientProfile.labelPreferredLanguage": "Idioma preferido",
  "patientProfile.sectionAddress": "Dirección",
  "patientProfile.sectionEmergency": "Contacto de emergencia",
  "patientProfile.sectionAdmin": "Administrativo",
  "patientProfile.linkViewProfile": "Perfil del paciente",
  "patientProfile.linkEditProfile": "Editar perfil",

  // ──────────────────────────────────────────────
  // registrationHome.*
  // ──────────────────────────────────────────────
  "registrationHome.title": "Registro",
  "registrationHome.tagline":
    "Un espacio de trabajo para búsqueda, pasos de registro, verificación de datos y visitas — con seguimientos a continuación.",
  "registrationHome.quickActions": "",
  "registrationHome.cardNewPatientTitle": "Nuevo paciente",
  "registrationHome.cardNewPatientHint": "Crear un registro de paciente",
  "registrationHome.cardNewVisitTitle": "Nueva visita",
  "registrationHome.cardNewVisitHint":
    "Lista de consultas; iniciar una visita desde el expediente del paciente",
  "registrationHome.cardInsuranceTitle": "Seguro",
  "registrationHome.cardInsuranceHint":
    "Cobertura de seguro principal y secundario",
  "registrationHome.cardDocumentCenterTitle": "Centro de documentos",
  "registrationHome.cardDocumentCenterHint":
    "Subir tarjetas de seguro, identificaciones, formularios de consentimiento, referencias y documentos de registro",
  "registrationHome.cardBillingHint": "Facturación y registros financieros",
  "registrationHome.patientsEncountersSection": "Pacientes y consultas",
  "registrationHome.patientChartToolsSection":
    "Continuar registro (buscar paciente)",
  "registrationHome.patientChartToolsIntro":
    "Busque un paciente por nombre o teléfono, luego abra la hoja de datos o edite el seguro principal y secundario en el expediente.",
  "registrationHome.patientChartToolsSearchPlaceholder":
    "Nombre, teléfono o NHC…",
  "registrationHome.patientChartToolsSearch": "Buscar",
  "registrationHome.patientChartToolsSearching": "Buscando…",
  "registrationHome.patientChartToolsNoResults":
    "No hay pacientes que coincidan.",
  "registrationHome.patientChartToolsSelectHint":
    "Seleccione un paciente, luego continúe con expediente, seguro, hoja de datos o visita.",
  "registrationHome.continueRegistrationTitle": "Continuar registro",
  "registrationHome.continueRegistrationIntro":
    "Abra el expediente para agregar seguro (principal primero, luego secundario), revise la hoja de datos e inicie una visita cuando esté listo.",
  "registrationHome.registrationSearchError":
    "No se pudo completar la búsqueda. Intente nuevamente.",
  "registrationHome.openFaceSheet": "Abrir hoja de datos",
  "registrationHome.openInsuranceOnChart":
    "Seguro (principal y secundario)",
  "registrationHome.openPatientChart": "Abrir expediente del paciente",
  "registrationHome.startEncounterHint":
    "Iniciar una visita desde el expediente",
  "registrationHome.noPatientChartAccess":
    "Su cuenta no puede abrir este expediente de paciente. Solicite acceso a un administrador.",
  "registrationHome.upcomingFollowUps": "Seguimientos próximos",
  "registrationHome.upcomingFollowUpsIntro":
    "Revise y gestione los seguimientos por fecha.",
  "registrationHome.openFollowUps": "Abrir seguimientos",
  "registrationHome.viewChart": "Ver expediente",
  "registrationHome.viewAllPrefix": "Ver todos",

  // ──────────────────────────────────────────────
  // registrationWorkspace.*
  // ──────────────────────────────────────────────
  "registrationWorkspace.title": "Espacio de trabajo de registro",
  "registrationWorkspace.subtitle":
    "Busque o cree un paciente, luego complete el seguro en el expediente, verifique la hoja de datos e inicie una visita — sin salir de este flujo.",
  "registrationWorkspace.searchHeading": "Buscar o registrar un paciente",
  "registrationWorkspace.newPatientCta": "Nuevo paciente",
  "registrationWorkspace.workspaceHeading": "Paciente activo",
  "registrationWorkspace.clearPatient": "Limpiar selección",
  "registrationWorkspace.loadingPatient":
    "Cargando detalles de registro…",
  "registrationWorkspace.loadError": "No se pudo cargar el paciente.",
  "registrationWorkspace.loadInsuranceError":
    "No se pudo cargar el resumen de seguro. Aún puede abrir el expediente.",
  "registrationWorkspace.stepSelect":
    "1 · Seleccione o cree el paciente",
  "registrationWorkspace.stepInsurance":
    "2 · Seguro principal y secundario (abajo o en el expediente)",
  "registrationWorkspace.stepFacesheet": "3 · Verificar hoja de datos",
  "registrationWorkspace.stepVisit": "4 · Iniciar o abrir visita",
  "registrationWorkspace.identityHeading": "Identidad",
  "registrationWorkspace.contactHeading": "Contacto y dirección",
  "registrationWorkspace.insuranceStatusHeading":
    "Seguro (resumen de solo lectura)",
  "registrationWorkspace.primaryLabel": "Principal",
  "registrationWorkspace.secondaryLabel": "Secundario",
  "registrationWorkspace.statusOnFile": "Registrado",
  "registrationWorkspace.statusMissing": "No registrado",
  "registrationWorkspace.insuranceSummaryHint":
    "El estado se actualiza después de guardar abajo o volver a esta página.",
  "registrationWorkspace.inlineInsuranceHeading":
    "Seguro (editar aquí)",
  "registrationWorkspace.inlineInsuranceIntro":
    "Ingrese primero la cobertura principal, luego la secundaria si es necesario. El mismo editor está disponible en el expediente del paciente.",
  "registrationWorkspace.actionEditInsurance":
    "Editar seguro en el expediente",
  "registrationWorkspace.actionChartInsuranceAnchor":
    "Abrir sección de seguro en el expediente",
  "registrationWorkspace.actionOpenFacesheet":
    "Abrir hoja de datos (verificar)",
  "registrationWorkspace.actionOpenChart": "Abrir expediente del paciente",
  "registrationWorkspace.actionEncounters": "Consultas y visitas",
  "registrationWorkspace.encounterGuidance":
    "Abra el expediente para iniciar o continuar una visita, o use la lista de consultas para encontrar una visita abierta.",
  "registrationWorkspace.openEncounterBillingLabel":
    "Clasificación de facturación (visita abierta)",
  "registrationWorkspace.dobShort": "FN",
  "registrationWorkspace.mrnShort": "NHC",
  "registrationWorkspace.noAddress": "Sin dirección registrada",

  // ──────────────────────────────────────────────
  // chartInsuranceSummary.*
  // ──────────────────────────────────────────────
  "chartInsuranceSummary.heading": "Seguro (resumen)",
  "chartInsuranceSummary.editInRegistration": "Editar en Registro",
  "chartInsuranceSummary.primaryLabel": "Principal",
  "chartInsuranceSummary.secondaryLabel": "Secundario",
  "chartInsuranceSummary.payerLabel": "Pagador",
  "chartInsuranceSummary.planLabel": "Plan",
  "chartInsuranceSummary.memberIdLabel": "ID de afiliado",
  "chartInsuranceSummary.noneOnFile": "No registrado",

  // ──────────────────────────────────────────────
  // encounterChrome (1E-scoped: patient header, core labels, sex, tabs, encounter types/statuses)
  // ──────────────────────────────────────────────
  "encounterChrome.ageYearsSuffix": "años",
  "encounterChrome.noVitalsLine": "Sin signos vitales registrados",
  "encounterChrome.encounterTypes.OUTPATIENT": "Consulta ambulatoria",
  "encounterChrome.encounterTypes.INPATIENT": "Observación y estancia corta",
  "encounterChrome.encounterTypes.EMERGENCY": "Departamento de Emergencias",
  "encounterChrome.encounterTypes.URGENT_CARE": "Atención de urgencias",
  "encounterChrome.encounterStatuses.OPEN": "Abierta",
  "encounterChrome.encounterStatuses.CLOSED": "Cerrada",
  "encounterChrome.encounterStatuses.CANCELLED": "Cancelada",
  "encounterChrome.patientSex.MALE": "Masculino",
  "encounterChrome.patientSex.FEMALE": "Femenino",
  "encounterChrome.patientSex.OTHER": "Otro",
  "encounterChrome.patientSex.UNKNOWN": "Desconocido",
  "encounterChrome.sexAtBirth.M": "Masculino",
  "encounterChrome.sexAtBirth.F": "Femenino",
  "encounterChrome.sexAtBirth.X": "Otro",
  "encounterChrome.sexAtBirth.U": "Desconocido",
  "encounterChrome.sexAtBirth.HOMME": "Masculino",
  "encounterChrome.sexAtBirth.FEMME": "Femenino",
  "encounterChrome.sexAtBirth.AUTRE": "Otro",
  "encounterChrome.sexAtBirth.INCONNU": "Desconocido",
  "encounterChrome.sexAtBirth.MALE": "Masculino",
  "encounterChrome.sexAtBirth.FEMALE": "Femenino",
  "encounterChrome.sexAtBirth.OTHER": "Otro",
  "encounterChrome.sexAtBirth.UNKNOWN": "Desconocido",
  "encounterChrome.tabs.summary": "Resumen",
  "encounterChrome.tabs.triage": "Signos vitales",
  "encounterChrome.tabs.nursing": "Evaluación de enfermería",
  "encounterChrome.tabs.clinic": "Documentación del médico",
  "encounterChrome.tabs.diagnostics": "Diagnósticos",
  "encounterChrome.tabs.orders": "Órdenes",
  "encounterChrome.tabs.mar": "Administración de medicamentos",
  "encounterChrome.tabs.results": "Resultados",
  "encounterChrome.tabs.observationSummary": "Resumen de observación",
  "encounterChrome.tabs.clinicalTimeline": "Línea de tiempo clínica",
  "encounterChrome.tabs.commandTimeline": "Línea de tiempo",
  "encounterChrome.tabs.notes": "Notas de enfermería",
  "encounterChrome.tabs.pathways": "Vías clínicas",
  "encounterChrome.tabs.history": "Historial",
  "encounterChrome.loadingOpeningEncounter": "Abriendo consulta…",
  "encounterChrome.notFoundTitle": "Consulta no encontrada",
  "encounterChrome.notFoundBodyEstablishment":
    "Esta consulta no se encuentra en el centro activo, fue eliminada o el enlace es antiguo (otro centro).",
  "encounterChrome.notFoundBodyGeneric":
    "Esta consulta no existe, fue eliminada o no tiene acceso a este centro.",
  "encounterChrome.backToEncounterList": "Volver a la lista de consultas",
  "encounterChrome.loadFailedTitle": "No se pudo cargar la consulta.",
  "encounterChrome.errLoadEncounter": "No se pudo cargar la consulta.",
  "encounterChrome.labelRoom": "Sala",
  "encounterChrome.labelAge": "Edad",
  "encounterChrome.labelSex": "Sexo",
  "encounterChrome.labelDob": "Fecha de nacimiento",
  "encounterChrome.labelNirMrn": "NHC",
  "encounterChrome.labelStatus": "Estado",
  "encounterChrome.labelChiefComplaint": "Motivo de consulta",
  "encounterChrome.labelEncounterType": "Tipo de consulta",
  "encounterChrome.labelVisitDiagnoses": "Diagnósticos (visita)",
  "encounterChrome.labelPrescriptions": "Recetas",
  "encounterChrome.labelOrdersTotal": "Órdenes",
  "encounterChrome.labelFollowUp": "Seguimiento",
  "encounterChrome.labelAssignedPhysician": "Médico asignado",
  "encounterChrome.labelOpenedAt": "Abierta",
  "encounterChrome.backToPatientChart": "Volver al expediente del paciente",
  "encounterChrome.finishEncounter": "Finalizar consulta",
  "encounterChrome.lastVitals": "Últimos signos vitales",
  "encounterChrome.allergyPrefix": "Alergia",
  "encounterChrome.vitalsRecordedAt": "Registrados",
  "encounterChrome.quickActions": "",
  "encounterChrome.patientHeader.labelAge": "Edad",
  "encounterChrome.patientHeader.labelSex": "Sexo",
  "encounterChrome.patientHeader.labelNirMrn": "NHC",
  "encounterChrome.patientHeader.labelDob": "Fecha de nacimiento",
  "encounterChrome.patientHeader.labelPhone": "Teléfono",
  "encounterChrome.patientHeader.openEncounter":
    "Abrir consulta — {type} ({status})",
  "encounterChrome.patientHeader.clinicalTeamOnly":
    "La documentación del médico de esta visita está reservada para el equipo de atención.",
  "encounterChrome.patientHeader.openEncounterLink": "Abrir consulta",
  "encounterChrome.patientHeader.detailRequiresRole":
    "Los detalles requieren un rol clínico o de facturación.",
  "encounterChrome.patientHeader.noOpenEncounter":
    "Sin consulta abierta.",
  "encounterChrome.patientHeader.lastVitals": "Últimos signos vitales",
  "encounterChrome.patientHeader.loading": "Cargando…",
  "encounterChrome.patientHeader.noVitals":
    "Sin signos vitales registrados",
  "encounterChrome.patientHeader.frontDeskNoVitals":
    "Recepción — los signos vitales y detalles clínicos no se muestran aquí.",
  "encounterChrome.patientHeader.editPatient": "Editar perfil",

  // ──────────────────────────────────────────────
  // patientQuickActions.*
  // ──────────────────────────────────────────────
  "patientQuickActions.sectionTitle": "",
  "patientQuickActions.noOpenEncounter": "Sin consulta abierta",
  "patientQuickActions.addDiagnosis": "Agregar diagnóstico",
  "patientQuickActions.createOrder": "Crear receta",
  "patientQuickActions.patientSummary": "Resumen del paciente",
  "patientQuickActions.accessDenied": "Acceso no autorizado",
  "patientQuickActions.enterVitals": "Ingresar signos vitales",
  "patientQuickActions.viewEncounters": "Ver consultas",
  "patientQuickActions.addNote": "Agregar nota",
  "patientQuickActions.addFollowUp": "Agregar seguimiento",
  "patientQuickActions.openEncounterOrStart": "Abrir consulta",
  "patientQuickActions.startEncounter": "Iniciar consulta",
  "patientQuickActions.chartLoading": "Cargando expediente…",
  "patientQuickActions.prescRightRequired":
    "Se requiere derecho de prescripción",
  "patientQuickActions.openOrCreateEncounter": "Abrir o crear una consulta",
  "patientQuickActions.viewResults": "Ver resultados",
  "patientQuickActions.newEncounter": "Nueva consulta",
  "patientQuickActions.editPatientInfo": "Editar perfil",

  // ──────────────────────────────────────────────
  // patientConsultationsTab.*
  // ──────────────────────────────────────────────
  "patientConsultationsTab.loadError":
    "No se pudieron cargar las consultas.",
  "patientConsultationsTab.loading": "Cargando consultas…",
  "patientConsultationsTab.facilityUnavailable":
    "Centro no disponible. Recargue la página o seleccione un centro desde el encabezado.",
  "patientConsultationsTab.retry": "Reintentar",
  "patientConsultationsTab.outpatientOnly": "Solo visitas ambulatorias",
  "patientConsultationsTab.startEncounter": "Iniciar consulta",
  "patientConsultationsTab.hintClinicalOnly":
    "La apertura de la consulta clínica completa está limitada al equipo de atención y módulos autorizados.",
  "patientConsultationsTab.hintRoleRequired":
    "Abrir los detalles requiere un rol clínico o de facturación. La lista permanece visible para recepción.",
  "patientConsultationsTab.colDate": "Fecha",
  "patientConsultationsTab.colType": "Tipo",
  "patientConsultationsTab.colStatus": "Estado",
  "patientConsultationsTab.colRoom": "Sala",
  "patientConsultationsTab.colReason": "Motivo",
  "patientConsultationsTab.colAction": "Acción",
  "patientConsultationsTab.openEncounter": "Abrir consulta",
  "patientConsultationsTab.closedEncounterLock":
    "Consulta cerrada — bloqueada",
  "patientConsultationsTab.closedAt": "Cerrada {datetime}",
  "patientConsultationsTab.create.title": "Iniciar consulta",
  "patientConsultationsTab.create.hint":
    "Elija el tipo de visita; las etiquetas siguen los flujos estándar.",
  "patientConsultationsTab.create.typeLabel": "Tipo *",
  "patientConsultationsTab.create.roomLabel": "Sala",
  "patientConsultationsTab.create.physicianOptional":
    "Médico asignado (opcional)",
  "patientConsultationsTab.create.visitReason":
    "Motivo de visita (opcional)",
  "patientConsultationsTab.create.intakeSectionTitle":
    "Llegada (opcional)",
  "patientConsultationsTab.create.intakeArrival": "Hora de llegada",
  "patientConsultationsTab.create.intakeMode": "Modo de llegada",
  "patientConsultationsTab.create.intakeAcuity":
    "Agudeza inicial (1–5)",
  "patientConsultationsTab.create.visitReasonPlaceholder":
    "Ej. seguimiento de hipertensión",
  "patientConsultationsTab.create.notesLabel": "Notas",
  "patientConsultationsTab.create.createFailed":
    "No se pudo crear la consulta.",
  "patientConsultationsTab.create.creating": "Creando…",
  "patientConsultationsTab.create.submit": "Iniciar consulta",
  "patientConsultationsTab.create.successOffline":
    "Consulta guardada sin conexión.",
  "patientConsultationsTab.create.successCreated": "Consulta iniciada.",
  "patientConsultationsTab.create.syncWhenOnline":
    "El expediente se sincronizará cuando se restablezca la conexión.",
};

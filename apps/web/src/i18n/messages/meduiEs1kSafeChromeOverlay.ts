/**
 * MEDUI.ES.1K — Reachable public Spanish chrome deferred from 1J.B.
 *
 * In-scope:
 * - encounterChrome.modals (discharge / admission / close-encounter UI chrome)
 * - printOutput.rx (prescription print chrome; not medication identity)
 *
 * Out of scope:
 * - frozen legal/source packet and EMTALA bodies
 * - providerDocumentationComplaintIntel template source
 * - remaining encounterChrome observation/orders tab chrome (classified, not this overlay)
 */

export const MEDUI_ES_1K_EMPTY_OVERLAY_PATHS: readonly string[] = [
  "encounterChrome.modals.observationDischargeReminderTitle",
];

export const MEDUI_ES_1K_OVERLAY: Record<string, string> = {
  "encounterChrome.modals.admissionField.admissionDiagnosis": "Diagnóstico de admisión",
  "encounterChrome.modals.admissionField.admissionReason": "Motivo de admisión",
  "encounterChrome.modals.admissionField.careLevel": "Nivel de atención",
  "encounterChrome.modals.admissionField.careLevelPlaceholder": "Texto libre o selección de sugerencias",
  "encounterChrome.modals.admissionField.conditionAtAdmission": "Estado al ingreso",
  "encounterChrome.modals.admissionField.initialPlan": "Plan inicial",
  "encounterChrome.modals.admissionField.responsiblePhysician": "Médico responsable",
  "encounterChrome.modals.admissionField.serviceUnit": "Servicio / unidad",
  "encounterChrome.modals.admissionIntro":
    "Documente la decisión de admisión en observación / estancia corta desde este encuentro. El alta del encuentro (flujo aparte) cierra la visita; la admisión registra la decisión y el plan inicial en este expediente.",
  "encounterChrome.modals.admissionNeedOneField": "Ingrese al menos un campo del paquete de admisión antes de guardar.",
  "encounterChrome.modals.admissionSaveFailed": "No se pudo guardar el paquete de admisión.",
  "encounterChrome.modals.admissionSaveQueued":
    "El paquete de admisión se guardó en este dispositivo y está pendiente de sincronización con el servidor. Aún no está confirmado en el servidor.",
  "encounterChrome.modals.admissionTitle": "Paquete de admisión",
  "encounterChrome.modals.backToChart": "Volver al expediente",
  "encounterChrome.modals.cancel": "Cancelar",
  "encounterChrome.modals.closeAnyway": "Finalizar de todos modos",
  "encounterChrome.modals.closeDischargeSaveFailed": "No se pudo guardar el resumen de alta.",
  "encounterChrome.modals.closeDocumentCheckFailed": "No se pudo verificar la documentación antes de cerrar.",
  "encounterChrome.modals.closeEncounterBody": "¿Está seguro de que desea finalizar este encuentro?",
  "encounterChrome.modals.closeEncounterFailed": "No se pudo finalizar el encuentro.",
  "encounterChrome.modals.closeEncounterTitle": "Finalizar encuentro",
  "encounterChrome.modals.closeSuccessDespiteDeficiencies":
    "Encuentro finalizado. El cierre se registró con deficiencias de documentación reconocidas.",
  "encounterChrome.modals.continueToClose": "Continuar para finalizar",
  "encounterChrome.modals.dischargeField.dischargeInstructions": "Indicaciones de alta",
  "encounterChrome.modals.dischargeField.disposition": "Disposición",
  "encounterChrome.modals.dischargeField.exitCondition": "Estado al alta",
  "encounterChrome.modals.dischargeField.followUp": "Seguimiento recomendado",
  "encounterChrome.modals.dischargeField.medicationsGiven": "Medicamentos suministrados / recetados",
  "encounterChrome.modals.dischargeField.patientDestination": "Destino del paciente",
  "encounterChrome.modals.dischargeField.returnIfWorse": "Precauciones para reconsultar",
  "encounterChrome.modals.dischargeIntro":
    "Los campos de enfermería y médicos se muestran según el rol (enfermería: estado, destino, modalidad; médico: disposición, indicaciones, medicamentos, seguimiento). Los campos no autorizados son de solo lectura.",
  "encounterChrome.modals.dischargeMode": "Disposición de alta",
  "encounterChrome.modals.dischargeTitle": "Resumen de alta",
  "encounterChrome.modals.dischargeTitleObservation": "Paquete de alta de observación",
  "encounterChrome.modals.documentationDeficiencies.ADMISSION_SUMMARY": "Paquete de admisión (observación / estancia corta)",
  "encounterChrome.modals.documentationDeficiencies.CHIEF_COMPLAINT": "Motivo de consulta o razón de la visita",
  "encounterChrome.modals.documentationDeficiencies.DISCHARGE_SUMMARY": "Paquete de alta estructurado",
  "encounterChrome.modals.documentationDeficiencies.NURSING_ASSESSMENT": "Evaluación de enfermería",
  "encounterChrome.modals.documentationDeficiencies.PROVIDER_DOCUMENTATION":
    "Evaluación médica (al menos uno de: impresión clínica, plan de tratamiento o documentación de HPI/ROS/examen físico/MDM)",
  "encounterChrome.modals.documentationDeficiencyLead": "Faltan o están incompletos los siguientes elementos:",
  "encounterChrome.modals.documentationDeficiencyTitle": "Documentación incompleta",
  "encounterChrome.modals.finish": "Finalizar",
  "encounterChrome.modals.goToTab": "Ir a: {tab}",
  "encounterChrome.modals.localDraftRestored": "Borrador restaurado en este dispositivo.",
  "encounterChrome.modals.localDraftSaved": "Borrador guardado localmente.",
  "encounterChrome.modals.observationDischargeReminderActiveMedsReviewed":
    "Órdenes de medicamentos activos revisadas contra el expediente",
  "encounterChrome.modals.observationDischargeReminderCourse":
    "Curso de observación resumido en la documentación del médico (MDM / impresión, según corresponda)",
  "encounterChrome.modals.observationDischargeReminderFootnote":
    "Solo un recordatorio. Confirme la duración de la estancia, reevaluaciones, signos vitales, resultados pendientes, medicamentos activos, MAR, documentación de PRN, IV/infusiones y el curso de observación en su documentación firmada antes del alta.",
  "encounterChrome.modals.observationDischargeReminderIvInfusionsAccounted":
    "Líquidos IV / infusiones detenidos o contabilizados en la documentación",
  "encounterChrome.modals.observationDischargeReminderLos":
    "Duración de la estancia / pernocta / trayectoria ≥24 h revisada en el expediente",
  "encounterChrome.modals.observationDischargeReminderMarComplete":
    "MAR completo para las administraciones programadas en líneas activas (o brechas explicadas)",
  "encounterChrome.modals.observationDischargeReminderPendingResults":
    "Resultados pendientes revisados o seguimiento documentado",
  "encounterChrome.modals.observationDischargeReminderPrnDocumented": "Respuestas PRN documentadas cuando aplique",
  "encounterChrome.modals.observationDischargeReminderReassessments":
    "Reevaluaciones de médico y enfermería de observación al día (o brechas explicadas en la nota)",
  "encounterChrome.modals.observationDischargeReminderTitle": "",
  "encounterChrome.modals.observationDischargeReminderVitals":
    "Signos vitales recientes revisados (o justificación documentada en el expediente)",
  "encounterChrome.modals.openAdmissionPacket": "Abrir paquete de admisión",
  "encounterChrome.modals.openDischargeSummary": "Abrir resumen de alta",
  "encounterChrome.modals.readOnly": "(solo lectura)",
  "encounterChrome.modals.saveAdmission": "Guardar paquete de admisión",
  "encounterChrome.modals.selectPlaceholder": "— Seleccionar —",
  "printOutput.rx.cancelledWatermark": "Receta cancelada",
  "printOutput.rx.colDirections": "Indicaciones",
  "printOutput.rx.colMedication": "Medicamento",
  "printOutput.rx.colQuantity": "Cantidad",
  "printOutput.rx.colRefills": "Resurtidos",
  "printOutput.rx.colRoute": "Vía",
  "printOutput.rx.colStrength": "Concentración",
  "printOutput.rx.contact": "Contacto",
  "printOutput.rx.documentEmpty": "El documento de impresión está vacío.",
  "printOutput.rx.documentH2": "Receta",
  "printOutput.rx.emptyBlocked": "Impresión bloqueada: no hay líneas de medicamento para imprimir.",
  "printOutput.rx.facility": "Establecimiento",
  "printOutput.rx.facilityIdentityMissing":
    "La identidad del establecimiento está incompleta. Agregue el nombre y los datos de contacto antes de imprimir la receta.",
  "printOutput.rx.fax": "Fax",
  "printOutput.rx.footerPrinted": "Medora-S — Receta impresa el {date}",
  "printOutput.rx.htmlTitle": "Receta",
  "printOutput.rx.license": "Licencia / ID",
  "printOutput.rx.medicationFallback": "Medicamento (etiqueta no definida)",
  "printOutput.rx.nirPrefix": "ID",
  "printOutput.rx.patient": "Paciente",
  "printOutput.rx.phone": "Teléfono",
  "printOutput.rx.prescribedDate": "Fecha de la receta",
  "printOutput.rx.prescriber": "Prescriptor",
  "printOutput.rx.renderFailed": "No se pudo preparar la receta para impresión.",
};

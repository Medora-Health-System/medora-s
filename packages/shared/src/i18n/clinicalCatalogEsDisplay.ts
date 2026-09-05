/**
 * MEDUI.TRILANG.1 — Governed Spanish display labels for clinical catalogs.
 *
 * Prisma remains EN/FR (+ canonical code). This overlay is display-only.
 * Search may match EN/FR/ES aliases; display uses the active locale only.
 */

import { pickCatalogDisplayLabelForProductUi, type CatalogDisplayLabelFields } from "./productUiLocale.js";

export const CLINICAL_CATALOG_ES_LAB: Record<string, string> = {
  "ABG": "Gasometría arterial",
  "ALT": "ALT",
  "AMYLASE": "Amilasa",
  "AST": "AST",
  "BILI": "Bilirrubina",
  "BLOOD_CULTURE": "Hemocultivo",
  "BMP": "Panel metabólico básico",
  "BNP": "BNP",
  "CBC": "Hemograma completo",
  "CBC_DIFF": "Hemograma con diferencial",
  "CHIKUNGUNYA": "Chikungunya",
  "CMP": "Panel metabólico completo",
  "COVID": "COVID-19",
  "CREAT": "Creatinina",
  "CROSSMATCH": "Prueba cruzada",
  "CRP": "Proteína C reactiva",
  "CULT_URINE": "Urocultivo",
  "DDIMER": "Dímero D",
  "DENGUE_NS1": "Dengue NS1",
  "D_DIMER": "Dímero D",
  "ESR": "Velocidad de sedimentación globular",
  "ETHANOL": "Etanol",
  "FREE_T4": "T4 libre",
  "GLU": "Glucosa",
  "GLUCOSE_POC": "Glucosa (punto de atención)",
  "GROUPAGE_ABO": "Grupo ABO / Rh",
  "HB": "Hemoglobina",
  "HBA1C": "Hemoglobina glucosilada (HbA1c)",
  "HCG_BETA": "β-hCG sérica",
  "HCG_URINE": "hCG en orina",
  "HEP_B_RAPID": "Hepatitis B (prueba rápida)",
  "HEP_C_AB": "Hepatitis C (anticuerpos)",
  "HIV": "VIH",
  "INFLUENZA_AB": "Influenza A/B",
  "INR": "INR",
  "K": "Potasio",
  "LACTATE": "Lactato",
  "LIPASE": "Lipasa",
  "LIPID": "Perfil lipídico",
  "LIPID_PANEL": "Panel lipídico",
  "MAGNESIUM": "Magnesio",
  "MALARIA": "Malaria",
  "MALARIA_RDT": "Malaria (prueba rápida)",
  "NA": "Sodio",
  "NFS_DIFF": "Hemograma con diferencial",
  "PHOSPHORUS": "Fósforo",
  "PROCALCITONIN": "Procalcitonina",
  "PTT": "PTT",
  "PT_INR": "TP / INR",
  "RAPID_STREP": "Estreptococo rápido",
  "RSV": "VRS",
  "SERUM_HCG": "hCG sérica",
  "STOOL": "Coprocultivo / coprológico",
  "TCA": "TCA",
  "TP_INR": "TP / INR",
  "TROP": "Troponina",
  "TROPONIN": "Troponina",
  "TSH": "TSH",
  "TYPE_SCREEN": "Grupo y pesquisa de anticuerpos",
  "TYPHOID_IgM": "Fiebre tifoidea IgM",
  "UA": "Análisis de orina",
  "UREA": "Urea",
  "URINE_CULTURE": "Urocultivo",
  "URINE_DRUG_SCREEN": "Toxicológico en orina",
  "URINE_HCG": "hCG en orina",
  "VBG": "Gasometría venosa",
  "VDRL": "VDRL",
  "WOUND_CULTURE": "Cultivo de herida",
};

export const CLINICAL_CATALOG_ES_IMAGING: Record<string, string> = {
  "CTA_ABDOMEN_PELVIS": "Angio-TC de abdomen y pelvis",
  "CTA_CHEST": "Angio-TC de tórax",
  "CTA_HEAD_NECK": "Angio-TC de cabeza y cuello",
  "CTA_LOWER_EXTREMITY_LEFT": "Angio-TC izquierda(lower extremity)",
  "CTA_LOWER_EXTREMITY_RIGHT": "Angio-TC derecha(lower extremity)",
  "CTA_UPPER_EXTREMITY_LEFT": "Angio-TC izquierda(upper extremity)",
  "CTA_UPPER_EXTREMITY_RIGHT": "Angio-TC derecha(upper extremity)",
  "CT_ABD": "TC de abdomen",
  "CT_ABDOMEN_PELVIS": "TC de abdomen y pelvis",
  "CT_ABDOMEN_PELVIS_W_IV_CONTRAST": "TC de pelvis",
  "CT_ABDOMEN_PELVIS_W_WO_CONTRAST": "TC de pelvis",
  "CT_BRAIN_PERFUSION": "TC de cerebro(perfusion)",
  "CT_CERVICAL_SPINE": "TC de columna cervical",
  "CT_CHEST": "TC de tórax",
  "CT_CHEST_ABDOMEN_PELVIS_TRAUMA": "TC de tórax, abdomen y pelvis (trauma)",
  "CT_CHEST_CTA": "Angio-TC de tórax",
  "CT_CHEST_W_IV_CONTRAST": "TC de tórax(with iv contrast)",
  "CT_CHEST_W_WO_CONTRAST": "TC de tórax",
  "CT_FACIAL_WO_CONTRAST": "TC sin contraste(facial bones)",
  "CT_FOOT_LEFT_WO_CONTRAST": "TC de pie izquierda sin contraste",
  "CT_FOOT_RIGHT_WO_CONTRAST": "TC de pie derecha sin contraste",
  "CT_HEAD": "TC de cráneo",
  "CT_HEAD_WO_CONTRAST": "TC de cráneo sin contraste",
  "CT_HEAD_W_CONTRAST": "TC de cráneo(with iv contrast)",
  "CT_HIP_LEFT_WO_CONTRAST": "TC de cadera izquierda sin contraste",
  "CT_HIP_RIGHT_WO_CONTRAST": "TC de cadera derecha sin contraste",
  "CT_KNEE_LEFT_WO_CONTRAST": "TC de rodilla izquierda sin contraste",
  "CT_KNEE_RIGHT_WO_CONTRAST": "TC de rodilla derecha sin contraste",
  "CT_LOWER_EXTREMITY_LEFT_WO_CONTRAST": "TC izquierda sin contraste(lower extremity)",
  "CT_LOWER_EXTREMITY_LEFT_W_IV_CONTRAST": "TC izquierda",
  "CT_LOWER_EXTREMITY_RIGHT_WO_CONTRAST": "TC derecha sin contraste(lower extremity)",
  "CT_LOWER_EXTREMITY_RIGHT_W_IV_CONTRAST": "TC derecha",
  "CT_MAXILLOFACIAL_WO_CONTRAST": "TC sin contraste(maxillofacial)",
  "CT_MAXILLOFACIAL_W_IV_CONTRAST": "TC",
  "CT_ORBITS_WO_CONTRAST": "TC de órbita sin contraste(s)",
  "CT_PELVIS_WO_CONTRAST": "TC de pelvis(without iv contrast)",
  "CT_PELVIS_W_WO_CONTRAST": "TC de pelvis",
  "CT_SINUSES_WO_CONTRAST": "TC de senos paranasales sin contraste(es)",
  "CT_SPINE_LUMBAR": "TC de columna lumbar",
  "CT_STN_WO_CONTRAST": "TC de partes blandas sin contraste(neck)",
  "CT_STN_W_IV_CONTRAST": "TC de partes blandas(neck with iv contrast)",
  "CT_STN_W_WO_CONTRAST": "TC de partes blandas",
  "CT_TSPINE_WO_CONTRAST": "TC de columna sin contraste(thoracic)",
  "CT_UPPER_EXTREMITY_LEFT_WO_CONTRAST": "TC izquierda sin contraste(upper extremity)",
  "CT_UPPER_EXTREMITY_LEFT_W_IV_CONTRAST": "TC izquierda",
  "CT_UPPER_EXTREMITY_RIGHT_WO_CONTRAST": "TC derecha sin contraste(upper extremity)",
  "CT_UPPER_EXTREMITY_RIGHT_W_IV_CONTRAST": "TC derecha",
  "DOPPLER_VEIN": "Doppler venoso",
  "FL_ESOPHAGRAM": "Estudio(esophagram)",
  "FL_LINE_PLACEMENT": "Estudio",
  "FL_LUMBAR_PUNCTURE": "Estudio de lumbar",
  "FL_TUBE_PLACEMENT": "Estudio",
  "MRA_BRAIN": "Estudio de cerebro(mra)",
  "MRA_CAROTID_WO_CONTRAST": "Estudio sin contraste(mra carotid)",
  "MRA_CAROTID_W_CONTRAST": "Estudio con contraste(mra carotid)",
  "MRA_LE_LEFT_W_CONTRAST": "Estudio izquierda con contraste(mra lower extremity)",
  "MRA_LE_RIGHT_W_CONTRAST": "Estudio derecha con contraste(mra lower extremity)",
  "MRI_BRAIN": "RM cerebral",
  "MRI_BRAIN_W_CONTRAST": "RM de cerebro con contraste",
  "MRI_BRAIN_W_WO_CONTRAST": "RM de cerebro sin contraste(with and)",
  "MRI_CHOLANGIOGRAM": "Colangiografía por RM",
  "MRI_CSPINE_WO_CONTRAST": "RM de columna cervical sin contraste",
  "MRI_CSPINE_W_CONTRAST": "RM de columna cervical con contraste",
  "MRI_CSPINE_W_WO_CONTRAST": "RM de columna cervical sin contraste(with and)",
  "MRI_HIP_BILATERAL_WO_CONTRAST": "RM de cadera bilateral sin contraste",
  "MRI_HIP_LEFT_WO_CONTRAST": "RM de cadera izquierda sin contraste",
  "MRI_HIP_RIGHT_WO_CONTRAST": "RM de cadera derecha sin contraste",
  "MRI_KNEE_LEFT": "RM de rodilla izquierda",
  "MRI_KNEE_RIGHT": "RM de rodilla derecha",
  "MRI_LOWER_EXTREMITY_LEFT_W_WO_CONTRAST": "RM izquierda sin contraste(lower extremity with and)",
  "MRI_LOWER_EXTREMITY_RIGHT_W_WO_CONTRAST": "RM derecha sin contraste(lower extremity with and)",
  "MRI_LSPINE_WO_CONTRAST": "RM de columna lumbar sin contraste",
  "MRI_LSPINE_W_CONTRAST": "RM de columna lumbar con contraste",
  "MRI_LSPINE_W_WO_CONTRAST": "RM de columna lumbar sin contraste(with and)",
  "MRI_PELVIS": "RM de pelvis",
  "MRI_PELVIS_LIMITED": "RM de pelvis(limited)",
  "MRI_SELLA": "RM(sella)",
  "MRI_SPINE": "RM de columna",
  "MRI_TSPINE_WO_CONTRAST": "RM de columna sin contraste(thoracic)",
  "MRI_TSPINE_W_CONTRAST": "RM de columna con contraste(thoracic)",
  "MRI_TSPINE_W_WO_CONTRAST": "RM de columna sin contraste(thoracic with and)",
  "MRI_UPPER_EXTREMITY_LEFT_WO_CONTRAST": "RM izquierda sin contraste(upper extremity)",
  "MRI_UPPER_EXTREMITY_RIGHT_WO_CONTRAST": "RM derecha sin contraste(upper extremity)",
  "MRI_UPPER_EXTREMITY_RIGHT_W_WO_CONTRAST": "RM derecha sin contraste(upper extremity with and)",
  "NM_GB_EMPTYING": "Estudio de vesícula biliar(emptying study)",
  "NM_HIDA": "Estudio(hida scan)",
  "NM_VQ_COMBINED": "Estudio",
  "NM_VQ_PERFUSION": "Estudio(v/q scan — perfusion)",
  "NM_VQ_VENTILATION": "Estudio(v/q scan — ventilation)",
  "US_ABD": "Ecografía abdominal",
  "US_ABDOMEN": "Ecografía abdominal",
  "US_AORTA": "Ecografía(aorta)",
  "US_ARTERIAL_DOPPLER_LE_BILATERAL": "Estudio bilateral",
  "US_ARTERIAL_DOPPLER_LE_LEFT": "Estudio izquierda",
  "US_ARTERIAL_DOPPLER_LE_RIGHT": "Estudio derecha",
  "US_ARTERIAL_DOPPLER_UE_BILATERAL": "Estudio bilateral",
  "US_ARTERIAL_DOPPLER_UE_LEFT": "Estudio izquierda",
  "US_ARTERIAL_DOPPLER_UE_RIGHT": "Estudio derecha",
  "US_BLADDER": "Ecografía(bladder)",
  "US_BREAST_BILATERAL": "Ecografía bilateral(breast)",
  "US_BREAST_LEFT": "Ecografía izquierda(breast)",
  "US_BREAST_RIGHT": "Ecografía derecha(breast)",
  "US_CAROTID_DUPLEX": "Ecografía(carotid duplex)",
  "US_CHEST": "Ecografía de tórax",
  "US_FAST": "Ecografía FAST",
  "US_OB": "Ecografía obstétrica",
  "US_OB_FIRST": "Ecografía obstétrica del primer trimestre",
  "US_OB_GROWTH": "Ecografía obstétrica de crecimiento",
  "US_PELVIS": "Ecografía pélvica",
  "US_RENAL": "Ecografía renal",
  "US_RUQ_GALLBLADDER": "Ecografía de hipocondrio derecho / vesícula",
  "US_SCROTUM_TESTICULAR": "Ecografía escrotal / testicular",
  "US_SOFT": "Ecografía de partes blandas",
  "US_THYROID": "Ecografía(thyroid)",
  "US_VENOUS_DOPPLER_LE": "Doppler venoso de miembro inferior",
  "US_VENOUS_DOPPLER_UE_BILATERAL": "Estudio bilateral",
  "US_VENOUS_DOPPLER_UE_LEFT": "Estudio izquierda",
  "US_VENOUS_DOPPLER_UE_RIGHT": "Estudio derecha",
  "XR_ABDOMEN": "Radiografía de abdomen",
  "XR_ABDOMEN_1V": "Radiografía de abdomen, 1 proyecciones",
  "XR_ABDOMEN_2V": "Radiografía de abdomen, 2 proyecciones",
  "XR_ABDOMEN_3V_ACUTE": "Radiografía de abdomen, 3 proyecciones(acute series)",
  "XR_ABD_AP": "Radiografía de abdomen (AP)",
  "XR_AC_JOINT_BILATERAL_2V": "Radiografía de articulaciones acromioclaviculares bilateral, 2 proyecciones",
  "XR_AC_JOINT_LEFT_2V": "Radiografía de articulación acromioclavicular izquierda, 2 proyecciones",
  "XR_AC_JOINT_RIGHT_2V": "Radiografía de articulación acromioclavicular derecha, 2 proyecciones",
  "XR_ANKLE": "Radiografía de tobillo",
  "XR_ANKLE_LEFT_2V": "Radiografía de tobillo izquierda, 2 proyecciones",
  "XR_ANKLE_LEFT_3V": "Radiografía de tobillo izquierda, 3 proyecciones",
  "XR_ANKLE_RIGHT_2V": "Radiografía de tobillo derecha, 2 proyecciones",
  "XR_ANKLE_RIGHT_3V": "Radiografía de tobillo derecha, 3 proyecciones",
  "XR_CALCANEUS_LEFT_2V": "Radiografía de calcáneo izquierda, 2 proyecciones",
  "XR_CALCANEUS_RIGHT_2V": "Radiografía de calcáneo derecha, 2 proyecciones",
  "XR_CHEST": "Radiografía de tórax",
  "XR_CHEST_2V": "Radiografía de tórax, 2 proyecciones",
  "XR_CLAVICLE_LEFT_2V": "Radiografía de clavícula izquierda, 2 proyecciones",
  "XR_CLAVICLE_RIGHT_2V": "Radiografía de clavícula derecha, 2 proyecciones",
  "XR_CSPINE_1V_LATERAL": "Radiografía de columna, 1 proyecciones(c- lateral)",
  "XR_CSPINE_2_3V": "Radiografía de columna, 3 proyecciones(c- 2–)",
  "XR_CSPINE_3V_UPRIGHT": "Radiografía de columna, 3 proyecciones(c- upright)",
  "XR_CSPINE_COMPLETE": "Radiografía de columna(c- complete)",
  "XR_ELBOW": "Radiografía de codo",
  "XR_ELBOW_LEFT_2V": "Radiografía de codo izquierda, 2 proyecciones",
  "XR_ELBOW_LEFT_3V": "Radiografía de codo izquierda, 3 proyecciones",
  "XR_ELBOW_LEFT_4V": "Radiografía de codo izquierda, 4 proyecciones",
  "XR_ELBOW_RIGHT_2V": "Radiografía de codo derecha, 2 proyecciones",
  "XR_ELBOW_RIGHT_3V": "Radiografía de codo derecha, 3 proyecciones",
  "XR_ELBOW_RIGHT_4V": "Radiografía de codo derecha, 4 proyecciones",
  "XR_FEMUR": "Radiografía de fémur",
  "XR_FEMUR_LEFT_2V": "Radiografía de fémur izquierda, 2 proyecciones",
  "XR_FEMUR_RIGHT_2V": "Radiografía de fémur derecha, 2 proyecciones",
  "XR_FOOT": "Radiografía de pie",
  "XR_FOOT_BILATERAL_2V": "Radiografía de pie bilateral, 2 proyecciones",
  "XR_FOOT_LEFT_2V": "Radiografía de pie izquierda, 2 proyecciones",
  "XR_FOOT_LEFT_3V": "Radiografía de pie izquierda, 3 proyecciones",
  "XR_FOOT_RIGHT_2V": "Radiografía de pie derecha, 2 proyecciones",
  "XR_FOOT_RIGHT_3V": "Radiografía de pie derecha, 3 proyecciones",
  "XR_FOREARM": "Radiografía de antebrazo",
  "XR_FOREARM_LEFT_2V": "Radiografía de antebrazo izquierda, 2 proyecciones",
  "XR_FOREARM_RIGHT_2V": "Radiografía de antebrazo derecha, 2 proyecciones",
  "XR_HAND": "Radiografía de mano",
  "XR_HAND_LEFT_2V": "Radiografía de mano izquierda, 2 proyecciones",
  "XR_HAND_LEFT_3V": "Radiografía de mano izquierda, 3 proyecciones",
  "XR_HAND_RIGHT_2V": "Radiografía de mano derecha, 2 proyecciones",
  "XR_HAND_RIGHT_3V": "Radiografía de mano derecha, 3 proyecciones",
  "XR_HIP": "Radiografía de cadera",
  "XR_HIP_BILATERAL_WITH_PELVIS": "Radiografía de cadera bilateral(with pelvis)",
  "XR_HIP_LEFT_1V": "Radiografía de cadera izquierda, 1 proyecciones",
  "XR_HIP_LEFT_2V": "Radiografía de cadera izquierda, 2 proyecciones",
  "XR_HIP_RIGHT_1V": "Radiografía de cadera derecha, 1 proyecciones",
  "XR_HIP_RIGHT_2V": "Radiografía de cadera derecha, 2 proyecciones",
  "XR_HUMERUS": "Radiografía de húmero",
  "XR_HUMERUS_LEFT_2V": "Radiografía de húmero izquierda, 2 proyecciones",
  "XR_HUMERUS_RIGHT_2V": "Radiografía de húmero derecha, 2 proyecciones",
  "XR_INFANT_FOOT_LEFT_2V": "Radiografía de pie izquierda, 2 proyecciones(infant)",
  "XR_KNEE": "Radiografía de rodilla",
  "XR_KNEE_LEFT_2V": "Radiografía de rodilla izquierda, 2 proyecciones",
  "XR_KNEE_LEFT_3V": "Radiografía de rodilla izquierda, 3 proyecciones",
  "XR_KNEE_LEFT_4V": "Radiografía de rodilla izquierda, 4 proyecciones",
  "XR_KNEE_LEFT_SUNRISE": "Radiografía de rodilla izquierda (sunrise)",
  "XR_KNEE_RIGHT_2V": "Radiografía de rodilla derecha, 2 proyecciones",
  "XR_KNEE_RIGHT_3V": "Radiografía de rodilla derecha, 3 proyecciones",
  "XR_KNEE_RIGHT_4V": "Radiografía de rodilla derecha, 4 proyecciones",
  "XR_KNEE_RIGHT_SUNRISE": "Radiografía de rodilla derecha (sunrise)",
  "XR_LSPINE_2V": "Radiografía de columna lumbar, 2 proyecciones",
  "XR_LSPINE_2V_UPRIGHT": "Radiografía de columna lumbar, 2 proyecciones(upright)",
  "XR_LSPINE_3V": "Radiografía de columna lumbar, 3 proyecciones",
  "XR_LSPINE_3V_UPRIGHT": "Radiografía de columna lumbar, 3 proyecciones(upright)",
  "XR_PELVIS": "Radiografía de pelvis",
  "XR_PELVIS_AP": "Radiografía de pelvis(ap)",
  "XR_PELVIS_COMPLETE": "Radiografía de pelvis(complete)",
  "XR_RIBS_LEFT": "Radiografía de costillas izquierda",
  "XR_RIBS_LEFT_WITH_CXR": "Radiografía de tórax izquierda(ribs with)",
  "XR_RIBS_RIGHT": "Radiografía de costillas derecha",
  "XR_RIBS_RIGHT_WITH_CXR": "Radiografía de tórax derecha(ribs with)",
  "XR_SACRUM_COCCYX_2V": "Radiografía de sacro(and coccyx)",
  "XR_SCAPULA_LEFT": "Radiografía de escápula izquierda",
  "XR_SCAPULA_RIGHT": "Radiografía de escápula derecha",
  "XR_SHOULDER": "Radiografía de hombro",
  "XR_SHOULDER_LEFT_2V": "Radiografía de hombro izquierda, 2 proyecciones",
  "XR_SHOULDER_LEFT_3V": "Radiografía de hombro izquierda, 3 proyecciones",
  "XR_SHOULDER_RIGHT_2V": "Radiografía de hombro derecha, 2 proyecciones",
  "XR_SHOULDER_RIGHT_3V": "Radiografía de hombro derecha, 3 proyecciones",
  "XR_THORACOLUMBAR_2V": "Radiografía de columna lumbar, 2 proyecciones(thoraco)",
  "XR_TIB_FIB": "Radiografía de tibia y peroné",
  "XR_TIB_FIB_LEFT_2V": "Radiografía de tibia izquierda, 2 proyecciones(fibula)",
  "XR_TIB_FIB_RIGHT_2V": "Radiografía de tibia derecha, 2 proyecciones(fibula)",
  "XR_TSPINE_2V": "Radiografía de columna, 2 proyecciones(thoracic)",
  "XR_TSPINE_3V_UPRIGHT": "Radiografía de columna, 3 proyecciones(thoracic upright)",
  "XR_WRIST": "Radiografía de muñeca",
  "XR_WRIST_LEFT_2V": "Radiografía de muñeca izquierda, 2 proyecciones",
  "XR_WRIST_LEFT_3V": "Radiografía de muñeca izquierda, 3 proyecciones",
  "XR_WRIST_RIGHT_2V": "Radiografía de muñeca derecha, 2 proyecciones",
  "XR_WRIST_RIGHT_3V": "Radiografía de muñeca derecha, 3 proyecciones",
};

const IMAGING_BODY_ES: Record<string, string> = {
  HEAD: "cráneo",
  BRAIN: "cerebro",
  CHEST: "tórax",
  ABD: "abdomen",
  ABDOMEN: "abdomen",
  PELVIS: "pelvis",
  HIP: "cadera",
  KNEE: "rodilla",
  FOOT: "pie",
  HAND: "mano",
  WRIST: "muñeca",
  ELBOW: "codo",
  SHOULDER: "hombro",
  ANKLE: "tobillo",
  FEMUR: "fémur",
  FOREARM: "antebrazo",
  HUMERUS: "húmero",
  CLAVICLE: "clavícula",
  SCAPULA: "escápula",
  CALCANEUS: "calcáneo",
  RIBS: "costillas",
  ORBITS: "órbitas",
  SINUSES: "senos paranasales",
  FACIAL: "huesos faciales",
  MAXILLOFACIAL: "maxilofacial",
  SELLA: "silla turca",
  AORTA: "aorta",
  BLADDER: "vejiga",
  BREAST: "mama",
  THYROID: "tiroides",
  RENAL: "renal",
  SCROTUM: "escroto",
  TESTICULAR: "testicular",
  SOFT: "partes blandas",
  SPINE: "columna",
  CSPINE: "columna cervical",
  LSPINE: "columna lumbar",
  TSPINE: "columna torácica",
  CERVICAL: "cervical",
  LUMBAR: "lumbar",
  THORACIC: "torácica",
  THORACOLUMBAR: "columna toracolumbar",
};

const IMAGING_SPECIAL_ES: Record<string, string> = {
  XR_HIP: "Radiografía de cadera",
  XR_FOOT: "Radiografía de pie",
  XR_HAND: "Radiografía de mano",
  XR_KNEE: "Radiografía de rodilla",
  XR_CHEST: "Radiografía de tórax",
  XR_ABDOMEN: "Radiografía de abdomen",
  CT_HEAD: "TC de cráneo",
  CT_CHEST: "TC de tórax",
  CT_ABD: "TC de abdomen",
  US_FAST: "Ecografía FAST",
  US_OB: "Ecografía obstétrica",
  US_ABD: "Ecografía abdominal",
  US_ABDOMEN: "Ecografía abdominal",
  DOPPLER_VEIN: "Doppler venoso",
  CT_CHEST_CTA: "Angio-TC de tórax",
  MRI_CHOLANGIOGRAM: "Colangiografía por RM",
  NM_HIDA: "Gammagrafía HIDA",
  NM_GB_EMPTYING: "Estudio de vaciamiento vesicular",
  NM_VQ_COMBINED: "Gammagrafía V/Q combinada",
  NM_VQ_PERFUSION: "Gammagrafía V/Q — perfusión",
  NM_VQ_VENTILATION: "Gammagrafía V/Q — ventilación",
  FL_ESOPHAGRAM: "Esofagograma",
  FL_LINE_PLACEMENT: "Fluoroscopia para colocación de vía",
  FL_LUMBAR_PUNCTURE: "Fluoroscopia para punción lumbar",
  FL_TUBE_PLACEMENT: "Fluoroscopia para colocación de sonda",
  CT_STN_WO_CONTRAST: "TC de partes blandas de cuello sin contraste",
  CT_STN_W_IV_CONTRAST: "TC de partes blandas de cuello con contraste IV",
  CT_STN_W_WO_CONTRAST: "TC de partes blandas de cuello con y sin contraste",
  CT_BRAIN_PERFUSION: "TC de perfusión cerebral",
  US_RUQ_GALLBLADDER: "Ecografía de hipocondrio derecho / vesícula",
  US_CAROTID_DUPLEX: "Dúplex carotídeo",
  US_SCROTUM_TESTICULAR: "Ecografía escrotal / testicular",
  CT_ABDOMEN_PELVIS_W_IV_CONTRAST: "TC de abdomen y pelvis con contraste IV",
  CT_ABDOMEN_PELVIS_W_WO_CONTRAST: "TC de abdomen y pelvis con y sin contraste",
  XR_SACRUM_COCCYX_2V: "Radiografía de sacro y cóccix, 2 proyecciones",
  XR_KNEE_LEFT_SUNRISE: "Radiografía de rodilla izquierda (axial / sunrise)",
  XR_KNEE_RIGHT_SUNRISE: "Radiografía de rodilla derecha (axial / sunrise)",
  XR_HIP_BILATERAL_WITH_PELVIS: "Radiografía de caderas bilateral con pelvis",
  XR_RIBS_LEFT_WITH_CXR: "Radiografía de costillas izquierdas con tórax",
  XR_RIBS_RIGHT_WITH_CXR: "Radiografía de costillas derechas con tórax",
  XR_ABDOMEN_3V_ACUTE: "Radiografía de abdomen, serie aguda, 3 proyecciones",
  XR_CSPINE_1V_LATERAL: "Radiografía de columna cervical, 1 proyección lateral",
  XR_CSPINE_2_3V: "Radiografía de columna cervical, 2–3 proyecciones",
  XR_CSPINE_3V_UPRIGHT: "Radiografía de columna cervical de pie, 3 proyecciones",
  XR_CSPINE_COMPLETE: "Radiografía de columna cervical completa",
  MRI_SELLA: "RM de silla turca",
  MRI_PELVIS_LIMITED: "RM de pelvis (estudio limitado)",
  US_OB_FIRST: "Ecografía obstétrica del primer trimestre",
  US_OB_GROWTH: "Ecografía obstétrica de crecimiento",
  CTA_HEAD_NECK: "Angio-TC de cabeza y cuello",
  CTA_ABDOMEN_PELVIS: "Angio-TC de abdomen y pelvis",
  CTA_CHEST: "Angio-TC de tórax",
  CT_CHEST_ABDOMEN_PELVIS_TRAUMA: "TC de tórax, abdomen y pelvis (trauma)",
  CT_FACIAL_WO_CONTRAST: "TC de huesos faciales sin contraste",
  MRA_BRAIN: "Angio-RM cerebral",
  MRA_CAROTID_WO_CONTRAST: "Angio-RM carotídea sin contraste",
  MRA_CAROTID_W_CONTRAST: "Angio-RM carotídea con contraste",
};

function applyImagingLateralityEs(body: string, laterality: "LEFT" | "RIGHT" | "BILATERAL"): string {
  if (!body) {
    if (laterality === "LEFT") return "izquierda";
    if (laterality === "RIGHT") return "derecha";
    return "bilateral";
  }
  const feminine = /(?:a|ión|dad|ez)$/i.test(body.split(" ").pop() ?? "");
  if (laterality === "LEFT") return feminine ? `${body} izquierda` : `${body} izquierdo`;
  if (laterality === "RIGHT") return feminine ? `${body} derecha` : `${body} derecho`;
  return `${body} bilateral`;
}

/** Governed Spanish imaging label from canonical code (XR_HIP → Radiografía de cadera). */
export function composeImagingDisplayEs(code: string): string {
  const raw = code.trim();
  if (!raw) return "";
  if (IMAGING_SPECIAL_ES[raw]) return IMAGING_SPECIAL_ES[raw];
  const tokens = raw.split("_");
  let laterality: "LEFT" | "RIGHT" | "BILATERAL" | null = null;
  let views: number | null = null;
  let contrast: string | null = null;
  const extras: string[] = [];
  const rest: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i] ?? "";
    const nxt = tokens[i + 1] ?? "";
    const nxt2 = tokens[i + 2] ?? "";
    if (t === "LEFT" || t === "RIGHT" || t === "BILATERAL") {
      laterality = t;
      continue;
    }
    if (/^\d+V$/.test(t)) {
      views = Number(t.slice(0, -1));
      continue;
    }
    if (t === "W" && nxt === "IV" && nxt2 === "CONTRAST") {
      contrast = "con contraste IV";
      i += 2;
      continue;
    }
    if (t === "W" && nxt === "WO" && nxt2 === "CONTRAST") {
      contrast = "con y sin contraste";
      i += 2;
      continue;
    }
    if (t === "W" && nxt === "CONTRAST") {
      contrast = "con contraste";
      i += 1;
      continue;
    }
    if (t === "WO" && nxt === "CONTRAST") {
      contrast = "sin contraste";
      i += 1;
      continue;
    }
    if (t === "UPRIGHT") {
      extras.push("de pie");
      continue;
    }
    if (t === "COMPLETE") {
      extras.push("completa");
      continue;
    }
    if (t === "LATERAL") {
      extras.push("lateral");
      continue;
    }
    if (t === "AP") {
      extras.push("AP");
      continue;
    }
    if (t === "LIMITED") {
      extras.push("estudio limitado");
      continue;
    }
    if (t === "INFANT") {
      extras.push("infantil");
      continue;
    }
    if (t === "TRAUMA") {
      extras.push("trauma");
      continue;
    }
    rest.push(t);
  }
  const modality = rest[0] ?? "";
  let bodyTokens = rest.slice(1);
  let head = "Estudio";
  if (modality === "CTA") head = "Angio-TC";
  else if (modality === "CT") head = "TC";
  else if (modality === "MRI") head = "RM";
  else if (modality === "MRA") head = "Angio-RM";
  else if (modality === "XR") head = "Radiografía";
  else if (modality === "US") head = "Ecografía";
  else if (modality === "NM") head = "Gammagrafía";
  else if (modality === "FL") head = "Fluoroscopia";
  else bodyTokens = rest;

  const phraseParts: string[] = [];
  for (let idx = 0; idx < bodyTokens.length; idx += 1) {
    const tok = bodyTokens[idx] ?? "";
    const nxt = bodyTokens[idx + 1] ?? "";
    if (tok === "LOWER" && nxt === "EXTREMITY") {
      phraseParts.push("miembro inferior");
      idx += 1;
      continue;
    }
    if (tok === "UPPER" && nxt === "EXTREMITY") {
      phraseParts.push("miembro superior");
      idx += 1;
      continue;
    }
    if (tok === "LE") {
      phraseParts.push("miembro inferior");
      continue;
    }
    if (tok === "UE") {
      phraseParts.push("miembro superior");
      continue;
    }
    if (tok === "ABDOMEN" && nxt === "PELVIS") {
      phraseParts.push("abdomen y pelvis");
      idx += 1;
      continue;
    }
    if (tok === "HEAD" && nxt === "NECK") {
      phraseParts.push("cabeza y cuello");
      idx += 1;
      continue;
    }
    if ((tok === "VENOUS" || tok === "ARTERIAL") && nxt === "DOPPLER") {
      phraseParts.push(tok === "VENOUS" ? "Doppler venoso" : "Doppler arterial");
      idx += 1;
      continue;
    }
    if (tok === "AC" && nxt === "JOINT") {
      phraseParts.push("articulación acromioclavicular");
      idx += 1;
      continue;
    }
    if (tok === "TIB" && nxt === "FIB") {
      phraseParts.push("tibia y peroné");
      idx += 1;
      continue;
    }
    if (tok === "OB") {
      phraseParts.push("obstétrica");
      continue;
    }
    const mapped = IMAGING_BODY_ES[tok];
    if (mapped) phraseParts.push(mapped);
    else if (!["WITH", "CXR", "AND", "C", "2", "3", "SUNRISE"].includes(tok)) {
      phraseParts.push(tok.toLowerCase().replace(/_/g, " "));
    }
  }
  let body = phraseParts.filter(Boolean).join(" y ");
  if (laterality) body = applyImagingLateralityEs(body, laterality);
  let label = head;
  if (body) {
    if (head === "Ecografía" && body.startsWith("obstétrica")) label = `Ecografía ${body}`;
    else if (body.includes("Doppler") && head === "Ecografía") label = body;
    else label = `${head} de ${body}`;
  }
  if (extras.length) label = `${label} (${extras.join(", ")})`;
  if (contrast) label = `${label} ${contrast}`;
  if (views != null) {
    label = `${label}, ${views} ${views === 1 ? "proyección" : "proyecciones"}`;
  }
  return label.replace(/\s+/g, " ").trim();
}

for (const imagingCode of Object.keys(CLINICAL_CATALOG_ES_IMAGING)) {
  CLINICAL_CATALOG_ES_IMAGING[imagingCode] = composeImagingDisplayEs(imagingCode);
}

export const CLINICAL_CATALOG_ES_PROCEDURE: Record<string, string> = {
  "airway_assist": "Asistencia de la vía aérea",
  "ambulation_trial": "Prueba de deambulación",
  "arterial_line_placement": "Colocación de línea arterial",
  "bag_valve_mask_ventilation": "Ventilación con bolsa-válvula-mascarilla",
  "bladder_scan": "Ecografía vesical (bladder scan)",
  "blood_culture_collection": "Toma de hemocultivo",
  "blood_draw_specimen_collection": "Extracción de sangre / toma de muestra",
  "burn_care": "Cuidado de quemadura",
  "cardiac_monitoring": "Monitorización cardíaca",
  "cardioversion_assist": "Asistencia en cardioversión",
  "central_line_placement": "Colocación de vía central",
  "chaperone_specimen_support": "Acompañamiento / apoyo para muestra",
  "chest_tube": "Tubo torácico",
  "continuous_cardiac_monitoring": "Monitorización cardíaca continua",
  "defibrillation_assist": "Asistencia en desfibrilación",
  "discharge_teaching": "Educación al alta",
  "dressing_change": "Cambio de apósito",
  "ekg_ecg": "ECG de 12 derivaciones",
  "ekg_rhythm_strip": "Tira de ritmo (ECG)",
  "endotracheal_intubation": "Intubación endotraqueal",
  "fall_precautions": "Precauciones de caída",
  "foley_catheter": "Sonda de Foley",
  "foreign_body_removal": "Extracción de cuerpo extraño",
  "glucose_check": "Control de glucosa",
  "incision_and_drainage": "Incisión y drenaje",
  "io_access": "Acceso intraóseo",
  "isolation_precautions": "Precauciones de aislamiento",
  "iv_fluids_setup": "Preparación de líquidos IV",
  "laceration_repair": "Reparación de laceración",
  "lumbar_puncture": "Punción lumbar",
  "nebulizer_treatment": "Nebulización",
  "ng_tube_placement": "Colocación de sonda nasogástrica",
  "npo_status": "Ayuno (NPO)",
  "oral_challenge": "Prueba de provocación oral",
  "oxygen_therapy": "Oxigenoterapia",
  "paracentesis": "Paracentesis",
  "patient_monitoring": "Monitoreo del paciente",
  "patient_transport": "Traslado del paciente",
  "peripheral_iv_placement": "Colocación de vía periférica",
  "pregnancy_test": "Prueba de embarazo",
  "procedural_sedation": "Sedación para procedimiento",
  "procedure_assist": "Asistencia en procedimiento",
  "rectal_exam_assist": "Asistencia en examen rectal",
  "reduction": "Reducción",
  "respiratory_treatment": "Tratamiento respiratorio",
  "sedation_monitoring": "Monitoreo de sedación",
  "splint_application": "Aplicación de férula",
  "suctioning": "Aspiración",
  "telemetry_discontinuation": "Suspensión de telemetría",
  "telemetry_initiation": "Inicio de telemetría",
  "thoracentesis": "Toracocentesis",
  "transfer_preparation": "Preparación para traslado",
  "urinary_catheter_insertion": "Colocación de sonda urinaria",
  "urine_collection": "Toma de muestra de orina",
  "wound_care": "Cuidado de herida",
};

export const CLINICAL_CATALOG_ES_MEDICATION: Record<string, string> = {
  "ACETAMINOPHEN_500": "Paracetamol 500 mg, comprimido oral",
  "ACYCLOVIR_200_MG_COMPRIME_ORALE": "Acyclovir 200 mg, comprimido oral",
  "ACYCLOVIR_250MG_IV": "Acyclovir 250 mg, inyectable intravenosa",
  "ACYCLOVIR_400_MG_COMPRIME_ORALE": "Acyclovir 400 mg, comprimido oral",
  "ACYCLOVIR_5_CREME_TOPIQUE": "Acyclovir 5%, crema tópica",
  "ADENOSINE_6MG_2ML_IV": "Adenosine 6 mg/2 mL, inyectable intravenosa",
  "ADRENALINE_1_MG_PER_ML_INJECTABLE_INJECTABLE": "Adrenaline 1 mg/mL, inyectable inyectable",
  "ALBENDAZOLE_200_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Albendazole 200 mg/5 mL, suspensión oral oral",
  "ALBENDAZOLE_400": "Albendazole 400 mg, comprimido oral",
  "AMIODARONE_150MG_3ML_IV": "Amiodarone 150 mg/3 mL, inyectable intravenosa",
  "AMLODIPINE_10_MG_COMPRIME_ORALE": "Amlodipino 10 mg, comprimido oral",
  "AMLODIPINE_5_MG_COMPRIME_ORALE": "Amlodipino 5 mg, comprimido oral",
  "AMOXICILLIN_125_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Amoxicilina 125 mg/5 mL, suspensión oral oral",
  "AMOXICILLIN_250_MG_CAPSULE_ORALE": "Amoxicilina 250 mg, cápsula oral",
  "AMOXICILLIN_250_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Amoxicilina 250 mg/5 mL, suspensión oral oral",
  "AMOXICILLIN_500": "Amoxicilina 500 mg, cápsula oral",
  "AMOXICILLIN_500_MG_COMPRIME_DISPERSIBLE_ORALE": "Amoxicilina 500 mg, comprimido dispersable oral",
  "AMOXICILLIN___CLAVULANIC_ACID_400_PER_57_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Amoxicillin + Clavulanic Acid 400/57 mg/5 mL, suspensión oral oral",
  "AMOXICILLIN___CLAVULANIC_ACID_500_PER_125_MG_COMPRIME_ORALE": "Amoxicillin + Clavulanic Acid 500/125 mg, comprimido oral",
  "AMOXICILLIN___CLAVULANIC_ACID_875_PER_125_MG_COMPRIME_ORALE": "Amoxicillin + Clavulanic Acid 875/125 mg, comprimido oral",
  "AMPICILLIN_1_G_INJECTABLE_INJECTABLE": "Ampicillin 1 g, inyectable inyectable",
  "AMPICILLIN_500_MG_CAPSULE_ORALE": "Ampicillin 500 mg, cápsula oral",
  "ANTACID_MIX_SUSPENSION_SUSPENSION_BUVABLE_ORALE": "Antacid mix suspension, suspensión oral oral",
  "ARTEMETHER_LUMEFANTRINE_20_PER_120_MG_COMPRIME_ORALE": "Artemether Lumefantrine 20/120 mg, comprimido oral",
  "ARTEMETHER___LUMEFANTRINE_20_PER_120_MG_COMPRIME_ORALE": "Artemether + Lumefantrine 20/120 mg, comprimido oral",
  "ARTESUNATE_60_MG_INJECTABLE_INJECTABLE": "Artesunate 60 mg, inyectable inyectable",
  "ARTESUNATE___AMODIAQUINE_100_PER_270_MG_COMPRIME_ORALE": "Artesunate + Amodiaquine 100/270 mg, comprimido oral",
  "ASPIRIN_100_MG_COMPRIME_ORALE": "Ácido acetilsalicílico 100 mg, comprimido oral",
  "ASPIRIN_325_MG_COMPRIME_ORALE": "Ácido acetilsalicílico 325 mg, comprimido oral",
  "ASPIRIN_81": "Ácido acetilsalicílico 81 mg, comprimido oral",
  "ATENOLOL_100_MG_COMPRIME_ORALE": "Atenolol 100 mg, comprimido oral",
  "ATENOLOL_50_MG_COMPRIME_ORALE": "Atenolol 50 mg, comprimido oral",
  "AZITHROMYCIN_200_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Azitromicina 200 mg/5 mL, suspensión oral oral",
  "AZITHROMYCIN_250": "Azitromicina 250 mg, comprimido oral",
  "AZITHROMYCIN_500MG_IV": "Azitromicina 500 mg, inyectable intravenosa",
  "AZITHROMYCIN_500_MG_COMPRIME_ORALE": "Azitromicina 500 mg, comprimido oral",
  "BECLOMETASONE_100_MCG_PER_DOSE_INHALATEUR_INHALEE": "Beclometasone 100 mcg/dose, inhalador inhalada",
  "BENZATHINE_PENICILLIN_G_1.2_M_UI_INJECTABLE_IM": "Benzathine Penicillin G 1.2 M UI, inyectable intramuscular",
  "BENZATHINE_PENICILLIN_G_2.4_M_UI_INJECTABLE_IM": "Benzathine Penicillin G 2.4 M UI, inyectable intramuscular",
  "BENZYL_BENZOATE_25_LOTION_TOPIQUE": "Benzyl Benzoate 25%, loción tópica",
  "BETAMETHASONE_0.1_CREME_TOPIQUE": "Betamethasone 0.1%, crema tópica",
  "BUDESONIDE_200_MCG_PER_DOSE_AROSOL_INHALATION": "Budesonide 200 mcg/dose, aerosol inhalación",
  "BUDESONIDE_200_MCG_PER_DOSE_INHALATEUR_INHALEE": "Budesonide 200 mcg/dose, inhalador inhalada",
  "CALCIUM_GLUCONATE_10_INJECTABLE_IV": "Calcium Gluconate 10%, inyectable intravenosa",
  "CARVEDILOL_12.5_MG_COMPRIME_ORALE": "Carvedilol 12.5 mg, comprimido oral",
  "CARVEDILOL_6.25_MG_COMPRIME_ORALE": "Carvedilol 6.25 mg, comprimido oral",
  "CEFAZOLIN_1G_INJECTABLE": "Cefazolin 1 g, inyectable inyectable",
  "CEFEPIME_1G_INJECTABLE": "Cefepime 1 g, inyectable inyectable",
  "CEFIXIME_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Cefixime 100 mg/5 mL, suspensión oral oral",
  "CEFIXIME_400_MG_COMPRIME_ORALE": "Cefixime 400 mg, comprimido oral",
  "CEFTAZIDIME_1_G_INJECTABLE_INJECTABLE": "Ceftazidime 1 g, inyectable inyectable",
  "CEFTRIAXONE_1_G_INJECTABLE_INJECTABLE": "Ceftriaxona 1 g, inyectable inyectable",
  "CEFTRIAXONE_2_G_INJECTABLE_INJECTABLE": "Ceftriaxona 2 g, inyectable inyectable",
  "CEFUROXIME_500_MG_COMPRIME_ORALE": "Cefuroxime 500 mg, comprimido oral",
  "CELECOXIB_200_MG_CAPSULE_ORALE": "Celecoxib 200 mg, cápsula oral",
  "CEPHALEXIN_250_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Cephalexin 250 mg/5 mL, suspensión oral oral",
  "CEPHALEXIN_500_MG_CAPSULE_ORALE": "Cephalexin 500 mg, cápsula oral",
  "CETIRIZINE_10_MG_COMPRIME_ORALE": "Cetirizine 10 mg, comprimido oral",
  "CETIRIZINE_1_MG_PER_ML_SIROP_ORALE": "Cetirizine 1 mg/mL, jarabe oral",
  "CHLORAMPHENICOL_250_MG_CAPSULE_ORALE": "Chloramphenicol 250 mg, cápsula oral",
  "CHLORAMPHENICOL_EYE_DROPS_0.5_COLLYRE_OPHTALMIQUE": "Chloramphenicol eye drops 0.5%, gotas oftálmicas oftálmica",
  "CHLOROQUINE_250": "Chloroquine 250 mg, comprimido oral",
  "CHLORPHENIRAMINE_4_MG_COMPRIME_ORALE": "Chlorpheniramine 4 mg, comprimido oral",
  "CIPROFLOXACIN_500": "Ciprofloxacino 500 mg, comprimido oral",
  "CIPROFLOXACIN_EAREYE_DROPS_0.3_COLLYRE_OPHTALMIQUE": "Ciprofloxacin ear/eye drops 0.3%, gotas oftálmicas oftálmica",
  "CLARITHROMYCIN_500_MG_COMPRIME_ORALE": "Clarithromycin 500 mg, comprimido oral",
  "CLINDAMYCIN_300_MG_CAPSULE_ORALE": "Clindamycin 300 mg, cápsula oral",
  "CLINDAMYCIN_600_MG_PER_4_ML_INJECTABLE_INJECTABLE": "Clindamycin 600 mg/4 mL, inyectable inyectable",
  "CLONIDINE_0_1_MG_COMPRIME_ORAL": "Clonidine 0.1 mg, comprimido oral",
  "CLONIDINE_0_2_MG_COMPRIME_ORAL": "Clonidine 0.2 mg, comprimido oral",
  "CLOPIDOGREL_75_MG_COMPRIME_ORALE": "Clopidogrel 75 mg, comprimido oral",
  "CLOTRIMAZOLE_1_CREME_TOPIQUE": "Clotrimazole 1%, crema tópica",
  "CLOTRIMAZOLE_500_MG_OVULE_VAGINALE": "Clotrimazole 500 mg, óvulo vaginal vaginal",
  "CLOXACILLIN_500_MG_CAPSULE_ORALE": "Cloxacillin 500 mg, cápsula oral",
  "CLOXACILLIN_500_MG_INJECTABLE_INJECTABLE": "Cloxacillin 500 mg, inyectable inyectable",
  "COMBINED_ORAL_CONTRACEPTIVE_STANDARD_COMPRIME_ORALE": "Combined Oral Contraceptive standard, comprimido oral",
  "COTRIMOXAZOLE_240_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Cotrimoxazole 240 mg/5 mL, suspensión oral oral",
  "COTRIMOXAZOLE_400_PER_80_MG_COMPRIME_ORALE": "Cotrimoxazole 400/80 mg, comprimido oral",
  "COTRIMOXAZOLE_800_PER_160_MG_COMPRIME_ORALE": "Cotrimoxazole 800/160 mg, comprimido oral",
  "DEXAMETHASONE_0.5_MG_COMPRIME_ORALE": "Dexamethasone 0.5 mg, comprimido oral",
  "DEXAMETHASONE_4_MG_COMPRIME_ORALE": "Dexamethasone 4 mg, comprimido oral",
  "DEXAMETHASONE_4_MG_PER_1_ML_INJECTABLE_INJECTABLE": "Dexamethasone 4 mg/1 mL, inyectable inyectable",
  "DEXAMETHASONE_4_MG_PER_ML_INJECTABLE_INJECTABLE": "Dexamethasone 4 mg/mL, inyectable inyectable",
  "DEXTROSE_50_INJECTABLE_IV": "Dextrose 50%, inyectable intravenosa",
  "DEXTROSE_5_500_ML_PERFUSION_IV": "Dextrose 5% 500 mL, perfusión intravenosa",
  "DEXTROSE___SALINE_5_PER_0.9_PERFUSION_IV": "Dextrose + Saline 5%/0.9%, perfusión intravenosa",
  "DIAZEPAM_10_MG_PER_2_ML_INJECTABLE_INJECTABLE": "Diazepam 10 mg/2 mL, inyectable inyectable",
  "DIAZEPAM_5_MG_COMPRIME_ORALE": "Diazepam 5 mg, comprimido oral",
  "DICLOFENAC_50_MG_COMPRIME_ORALE": "Diclofenaco 50 mg, comprimido oral",
  "DICLOFENAC_75_MG_PER_3_ML_INJECTABLE_INJECTABLE": "Diclofenaco 75 mg/3 mL, inyectable inyectable",
  "DIMENHYDRINATE_50_MG_COMPRIME_ORALE": "Dimenhydrinate 50 mg, comprimido oral",
  "DIPHENHYDRAMINE_50MG_ML": "Diphenhydramine 50 mg/mL, inyectable inyectable",
  "DOBUTAMINE_250MG_20ML_IV": "Dobutamine 250 mg/20 mL, perfusión intravenosa",
  "DOPAMINE_400MG_250ML_IV": "Dopamine 400 mg/250 mL, perfusión intravenosa",
  "DOXYCYCLINE_100_MG_CAPSULE_ORALE": "Doxycycline 100 mg, cápsula oral",
  "DOXYCYCLINE_100_MG_COMPRIME_ORALE": "Doxycycline 100 mg, comprimido oral",
  "DROPERIDOL_2_5MG_ML_INJECTABLE": "Droperidol 2.5 mg/mL, inyectable IV / IM",
  "ENALAPRIL_10_MG_COMPRIME_ORALE": "Enalapril 10 mg, comprimido oral",
  "ENALAPRIL_5_MG_COMPRIME_ORALE": "Enalapril 5 mg, comprimido oral",
  "ERYTHROMYCIN_250_MG_COMPRIME_ORALE": "Erythromycin 250 mg, comprimido oral",
  "ETOMIDATE_2MG_ML_IV": "Etomidate 2 mg/mL, inyectable intravenosa",
  "FAMOTIDINE_20MG_IV": "Famotidine 20 mg/2 mL, inyectable inyectable",
  "FENTANYL_50MCG_ML_INJECTABLE": "Fentanyl 50 mcg/mL, inyectable inyectable",
  "FERROUS_SULFATE___FOLIC_ACID_60_MG_PER_0.4_MG_COMPRIME_ORALE": "Ferrous Sulfate + Folic Acid 60 mg/0.4 mg, comprimido oral",
  "FLUCONAZOLE_150_MG_CAPSULE_ORALE": "Fluconazole 150 mg, cápsula oral",
  "FLUCONAZOLE_200_MG_CAPSULE_ORALE": "Fluconazole 200 mg, cápsula oral",
  "FLUCONAZOLE_2_MG_PER_ML_PERFUSION_IV": "Fluconazole 2 mg/mL, perfusión intravenosa",
  "FOLIC_ACID_5_MG_COMPRIME_ORALE": "Folic Acid 5 mg, comprimido oral",
  "FUROSEMIDE_20_MG_PER_2_ML_INJECTABLE_INJECTABLE": "Furosemide 20 mg/2 mL, inyectable inyectable",
  "FUROSEMIDE_40_MG_COMPRIME_ORALE": "Furosemide 40 mg, comprimido oral",
  "FUSIDIC_ACID_2_CREME_TOPIQUE": "Fusidic Acid 2%, crema tópica",
  "GENTAMICIN_80_MG_PER_2_ML_INJECTABLE_INJECTABLE": "Gentamicin 80 mg/2 mL, inyectable inyectable",
  "GENTAMICIN_EYE_DROPS_0.3_COLLYRE_OPHTALMIQUE": "Gentamicin eye drops 0.3%, gotas oftálmicas oftálmica",
  "GLIBENCLAMIDE_5_MG_COMPRIME_ORALE": "Glibenclamide 5 mg, comprimido oral",
  "GLICLAZIDE_80_MG_COMPRIME_ORALE": "Gliclazide 80 mg, comprimido oral",
  "GRISEOFULVIN_500_MG_COMPRIME_ORALE": "Griseofulvin 500 mg, comprimido oral",
  "HALOPERIDOL_5MG_ML_INJECTABLE": "Haloperidol 5 mg/mL, inyectable inyectable",
  "HEPARIN_5000UI_ML_INJECTABLE": "Heparin 5,000 UI/mL, inyectable inyectable",
  "HYDROCHLOROTHIAZIDE_25": "Hidroclorotiazida 25 mg, comprimido oral",
  "HYDROCORTISONE_100_MG_INJECTABLE_INJECTABLE": "Hydrocortisone 100 mg, inyectable inyectable",
  "HYDROCORTISONE_1_CREME_TOPIQUE": "Hydrocortisone 1%, crema tópica",
  "HYDROCORTISONE_20_MG_COMPRIME_ORALE": "Hydrocortisone 20 mg, comprimido oral",
  "HYDROMORPHONE_2MG_ML_INJECTABLE": "Hydromorphone 2 mg/mL, inyectable inyectable",
  "HYOSCINE_BUTYLBROMIDE_10_MG_COMPRIME_ORALE": "Hyoscine Butylbromide 10 mg, comprimido oral",
  "HYOSCINE_BUTYLBROMIDE_20_MG_PER_ML_INJECTABLE_INJECTABLE": "Hyoscine Butylbromide 20 mg/mL, inyectable inyectable",
  "IBUPROFEN_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Ibuprofeno 100 mg/5 mL, suspensión oral oral",
  "IBUPROFEN_200": "Ibuprofeno 200 mg, comprimido oral",
  "IBUPROFEN_400_MG_COMPRIME_ORALE": "Ibuprofeno 400 mg, comprimido oral",
  "INSULIN_7030_100_UI_PER_ML_INJECTABLE_SC": "Insulin 70/30 100 UI/mL, inyectable subcutánea",
  "IPRATROPIUM_20_MCG_PER_DOSE_INHALATEUR_INHALEE": "Ipratropium 20 mcg/dose, inhalador inhalada",
  "KETAMINE_50MG_ML_INJECTABLE": "Ketamine 50 mg/mL, inyectable inyectable",
  "KETOCONAZOLE_200_MG_COMPRIME_ORALE": "Ketoconazole 200 mg, comprimido oral",
  "KETOCONAZOLE_2_SHAMPOOING_TOPIQUE": "Ketoconazole 2%, champú tópica",
  "KETOPROFEN_100_MG_CAPSULE_ORALE": "Ketoprofen 100 mg, cápsula oral",
  "KETOPROFEN_100_MG_PER_2_ML_INJECTABLE_INJECTABLE": "Ketoprofen 100 mg/2 mL, inyectable inyectable",
  "KETOROLAC_30MG_IM": "Ketorolac 30 mg/mL, inyectable inyectable",
  "LABETALOL_5MG_ML_IV": "Labetalol 5 mg/mL, inyectable intravenosa",
  "LACTULOSE_10_G_PER_15_ML_SIROP_ORALE": "Lactulose 10 g/15 mL, jarabe oral",
  "LEVONORGESTREL_1.5_MG_COMPRIME_ORALE": "Levonorgestrel 1.5 mg, comprimido oral",
  "LEVOTHYROXINE_100_MCG_COMPRIME_ORALE": "Levothyroxine 100 mcg, comprimido oral",
  "LEVOTHYROXINE_50_MCG_COMPRIME_ORALE": "Levothyroxine 50 mcg, comprimido oral",
  "LIDOCAINE_2PCT_INJECTABLE": "Lidocaine 2%, inyectable inyectable",
  "LISINOPRIL_10": "Lisinopril 10 mg, comprimido oral",
  "LISINOPRIL_20_MG_TABLET_ORAL": "Lisinopril 20 mg, comprimido oral",
  "LOPERAMIDE_2_MG_CAPSULE_ORALE": "Loperamide 2 mg, cápsula oral",
  "LORATADINE_10_MG_COMPRIME_ORALE": "Loratadine 10 mg, comprimido oral",
  "LORATADINE_5_MG_PER_5_ML_SIROP_ORALE": "Loratadine 5 mg/5 mL, jarabe oral",
  "LORAZEPAM_2MG_ML_INJECTABLE": "Lorazepam 2 mg/mL, inyectable inyectable",
  "LORAZEPAM_2_MG_COMPRIME_ORALE": "Lorazepam 2 mg, comprimido oral",
  "LOSARTAN_100_MG_COMPRIME_ORALE": "Losartán 100 mg, comprimido oral",
  "LOSARTAN_50": "Losartán 50 mg, comprimido oral",
  "MAGNESIUM_SULFATE_2_G_PER_50_ML_PERFUSION_INTRAVENOUS": "Magnesium Sulfate 2 g/50 mL, perfusión intravenosa",
  "MAGNESIUM_SULFATE_500_MG_PER_ML_INJECTABLE_INJECTABLE": "Magnesium Sulfate 500 mg/mL, inyectable inyectable",
  "MEBENDAZOLE_100_MG_COMPRIME_ORALE": "Mebendazole 100 mg, comprimido oral",
  "MEBENDAZOLE_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Mebendazole 100 mg/5 mL, suspensión oral oral",
  "MEDROXYPROGESTERONE_150_MG_PER_ML_INJECTABLE_IM": "Medroxyprogesterone 150 mg/mL, inyectable intramuscular",
  "MELOXICAM_15_MG_COMPRIME_ORALE": "Meloxicam 15 mg, comprimido oral",
  "MELOXICAM_7.5_MG_COMPRIME_ORALE": "Meloxicam 7.5 mg, comprimido oral",
  "MEROPENEM_1_G_INJECTABLE_IV": "Meropenem 1 g, inyectable intravenosa",
  "METAMIZOLE_1_G_PER_2_ML_INJECTABLE_INJECTABLE": "Metamizole 1 g/2 mL, inyectable inyectable",
  "METAMIZOLE_500_MG_COMPRIME_ORALE": "Metamizole 500 mg, comprimido oral",
  "METFORMIN_1000_MG_COMPRIME_ORALE": "Metformina 1000 mg, comprimido oral",
  "METFORMIN_500": "Metformina 500 mg, comprimido oral",
  "METFORMIN_850_MG_COMPRIME_ORALE": "Metformina 850 mg, comprimido oral",
  "METHYLDOPA_250_MG_COMPRIME_ORALE": "Methyldopa 250 mg, comprimido oral",
  "METHYLERGOMETRINE_0.2_MG_PER_ML_INJECTABLE_INJECTABLE": "Methylergometrine 0.2 mg/mL, inyectable inyectable",
  "METHYLPREDNISOLONE_125MG": "Methylprednisolone 125 mg/2 mL, inyectable inyectable",
  "METOCLOPRAMIDE_10_MG_COMPRIME_ORALE": "Metoclopramide 10 mg, comprimido oral",
  "METOCLOPRAMIDE_10_MG_PER_2_ML_INJECTABLE_INJECTABLE": "Metoclopramide 10 mg/2 mL, inyectable inyectable",
  "METOPROLOL_5MG_5ML_IV": "Metoprolol 5 mg/5 mL, inyectable intravenosa",
  "METRONIDAZOLE_125_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Metronidazole 125 mg/5 mL, suspensión oral oral",
  "METRONIDAZOLE_250_MG_COMPRIME_ORALE": "Metronidazole 250 mg, comprimido oral",
  "METRONIDAZOLE_500_MG_COMPRIME_ORALE": "Metronidazole 500 mg, comprimido oral",
  "METRONIDAZOLE_500_MG_PER_100_ML_PERFUSION_IV": "Metronidazole 500 mg/100 mL, perfusión intravenosa",
  "MICONAZOLE_2_CREME_TOPIQUE": "Miconazole 2%, crema tópica",
  "MIDAZOLAM_5MG_ML_INJECTABLE": "Midazolam 5 mg/mL, inyectable inyectable",
  "MISOPROSTOL_200_MCG_COMPRIME_ORALE": "Misoprostol 200 mcg, comprimido oral",
  "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTABLE": "Morphine 10 mg/mL, inyectable inyectable",
  "MULTIVITAMIN_SYRUP_SIROP_SIROP_ORALE": "Multivitamin syrup sirop, jarabe oral",
  "MUPIROCIN_2_POMMADE_TOPIQUE": "Mupirocin 2%, ungüento tópica",
  "NALOXONE_0.4MG_ML": "Naloxone 0.4 mg/mL, inyectable inyectable",
  "NAPROXEN_250_MG_COMPRIME_ORALE": "Naproxen 250 mg, comprimido oral",
  "NAPROXEN_500_MG_COMPRIME_ORALE": "Naproxen 500 mg, comprimido oral",
  "NIFEDIPINE_20_MG_CAPSULE_ORALE": "Nifedipine 20 mg, cápsula oral",
  "NITAZOXANIDE_100_MG_PER_5_ML_SUSPENSION_BUVABLE_ORALE": "Nitazoxanide 100 mg/5 mL, suspensión oral oral",
  "NITAZOXANIDE_500_MG_COMPRIME_ORALE": "Nitazoxanide 500 mg, comprimido oral",
  "NITROFURANTOIN_100_MG_CAPSULE_ORALE": "Nitrofurantoin 100 mg, cápsula oral",
  "NOREPINEPHRINE_4MG_4ML_IV": "Norepinephrine 4 mg/4 mL, inyectable intravenosa",
  "NORMAL_SALINE_0.9_1_L_PERFUSION_IV": "Normal Saline 0.9% 1 L, perfusión intravenosa",
  "NORMAL_SALINE_0.9_500_ML_PERFUSION_IV": "Normal Saline 0.9% 500 mL, perfusión intravenosa",
  "NPH_INSULIN_100_UI_PER_ML_INJECTABLE_SC": "NPH Insulin 100 UI/mL, inyectable subcutánea",
  "NYSTATIN_100000_UI_PER_G_CREME_TOPIQUE": "Nystatin 100,000 UI/g, crema tópica",
  "NYSTATIN_100000_UI_PER_ML_SUSPENSION_BUVABLE_ORALE": "Nystatin 100,000 UI/mL, suspensión oral oral",
  "OMEPRAZOLE_20": "Omeprazol 20 mg, cápsula oral",
  "OMEPRAZOLE_40_MG_CAPSULE_ORALE": "Omeprazol 40 mg, cápsula oral",
  "ONDANSETRON_4_MG_COMPRIME_ORALE": "Ondansetron 4 mg, comprimido oral",
  "ONDANSETRON_4_MG_PER_2_ML_INJECTABLE_INJECTABLE": "Ondansetron 4 mg/2 mL, inyectable inyectable",
  "ONDANSETRON_8_MG_COMPRIME_ORALE": "Ondansetron 8 mg, comprimido oral",
  "ORAL_REHYDRATION": "Oral Rehydration Salts sachet, polvo para solución oral oral",
  "ORAL_REHYDRATION_SALTS_SACHET_PDIATRIQUE_POUDRE_SOLUTION_ORALE": "Oral Rehydration Salts sachet pédiatrique, polvo para solución oral oral",
  "OXYTOCIN_10_UI_PER_ML_INJECTABLE_INJECTABLE": "Oxytocin 10 UI/mL, inyectable inyectable",
  "PANTOPRAZOLE_40MG_IV": "Pantoprazole 40 mg, inyectable intravenosa",
  "PANTOPRAZOLE_40_MG_COMPRIME_ORALE": "Pantoprazole 40 mg, comprimido oral",
  "PARACETAMOL_120_MG_PER_5_ML_SIROP_ORALE": "Paracetamol 120 mg/5 mL, jarabe oral",
  "PARACETAMOL_1G_100ML_IV": "Paracetamol 1 g/100 mL, perfusión intravenosa",
  "PARACETAMOL_1_G_COMPRIME_ORALE": "Paracetamol 1 g, comprimido oral",
  "PARACETAMOL_250_MG_SUPPOSITOIRE_SUPPOSITOIRE_RECTALE": "Paracetamol 250 mg suppositoire, supositorio rectal",
  "PENICILLIN_V_250_MG_COMPRIME_ORALE": "Penicillin V 250 mg, comprimido oral",
  "PENICILLIN_V_500_MG_COMPRIME_ORALE": "Penicillin V 500 mg, comprimido oral",
  "PERMETHRIN_5_LOTION_TOPIQUE": "Permethrin 5%, loción tópica",
  "PHENYLEPHRINE_10MG_ML_IV": "Phenylephrine 10 mg/mL, inyectable intravenosa",
  "PIPERACILLIN_TAZOBACTAM_3_375_G_INJECTABLE_INJECTABLE": "Piperacillin-tazobactam 3.375 g, inyectable intravenosa",
  "PIPERACILLIN_TAZOBACTAM_4_5G_IV": "Piperacillin-tazobactam 4.5 g, inyectable intravenosa",
  "PIROXICAM_20_MG_CAPSULE_ORALE": "Piroxicam 20 mg, cápsula oral",
  "POTASSIUM_CHLORIDE_20_MEQ_COMPRIME_ORALE": "Potassium Chloride 20 mEq, comprimido oral",
  "POTASSIUM_CHLORIDE_20_MEQ_PER_10_ML_INJECTABLE_INTRAVENOUS": "Potassium Chloride 20 mEq/10 mL, inyectable intravenosa",
  "POTASSIUM_CHLORIDE_40_MEQ_COMPRIME_ORALE": "Potassium Chloride 40 mEq, comprimido oral",
  "PREDNISOLONE_15_MG_PER_5_ML_SIROP_ORALE": "Prednisolone 15 mg/5 mL, jarabe oral",
  "PREDNISOLONE_5_MG_COMPRIME_ORALE": "Prednisolone 5 mg, comprimido oral",
  "PREDNISONE_20_MG_COMPRIME_ORALE": "Prednisona 20 mg, comprimido oral",
  "PREDNISONE_5": "Prednisona 5 mg, comprimido oral",
  "PRIMAQUINE_15_MG_COMPRIME_ORALE": "Primaquine 15 mg, comprimido oral",
  "PROGESTINONLY_PILL_STANDARD_COMPRIME_ORALE": "Progestin-only pill standard, comprimido oral",
  "PROMETHAZINE_25_MG_COMPRIME_ORALE": "Promethazine 25 mg, comprimido oral",
  "PROPOFOL_10MG_ML_IV": "Propofol 10 mg/mL, inyectable intravenosa",
  "QUININE_300_MG_COMPRIME_ORALE": "Quinine 300 mg, comprimido oral",
  "REGULAR_INSULIN_100_UI_PER_ML_INJECTABLE_SC": "Regular Insulin 100 UI/mL, inyectable subcutánea",
  "RINGER_LACTATE_1_L_PERFUSION_IV": "Ringer Lactate 1 L, perfusión intravenosa",
  "RINGER_LACTATE_500_ML_PERFUSION_IV": "Ringer Lactate 500 mL, perfusión intravenosa",
  "ROCURONIUM_10MG_ML_IV": "Rocuronium 10 mg/mL, inyectable intravenosa",
  "SALBUTAMOL_100_MCG_PER_DOSE_AEROSOL_DOSEUR_INHALATION": "Salbutamol 100 mcg/dose, inhalador de dosis medida inhalación",
  "SALBUTAMOL_100_MCG_PER_DOSE_INHALATEUR_INHALEE": "Salbutamol 100 mcg/dose, inhalador inhalada",
  "SALBUTAMOL_2.5_MG_PER_2.5_ML_NEBULISATION_INHALATION": "Salbutamol 2.5 mg/2.5 mL, nebulización inhalación",
  "SALBUTAMOL_2.5_MG_PER_2.5_ML_SOLUTION_NEBULISATION_INHALEE": "Salbutamol 2.5 mg/2.5 mL, solución para nebulización inhalada",
  "SALBUTAMOL_2_MG_PER_5_ML_SIROP_ORALE": "Salbutamol 2 mg/5 mL, jarabe oral",
  "SIMVASTATIN_20_MG_COMPRIME_ORALE": "Simvastatin 20 mg, comprimido oral",
  "SODIUM_BICARBONATE_8_4PCT_IV": "Sodium bicarbonate 8.4%, inyectable intravenosa",
  "SPIRONOLACTONE_25_MG_COMPRIME_ORALE": "Spironolactone 25 mg, comprimido oral",
  "SUCCINYLCHOLINE_20MG_ML_IV": "Succinylcholine 20 mg/mL, inyectable intravenosa",
  "TETRACYCLINE_250_MG_CAPSULE_ORALE": "Tetracycline 250 mg, cápsula oral",
  "TETRACYCLINE_EYE_OINTMENT_1_POMMADE_OPHTALMIQUE_OPHTALMIQUE": "Tetracycline eye ointment 1%, ungüento oftálmico oftálmica",
  "TINIDAZOLE_500_MG_COMPRIME_ORALE": "Tinidazole 500 mg, comprimido oral",
  "TRAMADOL_100_MG_PER_2_ML_INJECTABLE_INJECTABLE": "Tramadol 100 mg/2 mL, inyectable inyectable",
  "TRAMADOL_50_MG_CAPSULE_ORALE": "Tramadol 50 mg, cápsula oral",
  "TRANEXAMIC_ACID_500_MG_PER_5_ML_INJECTABLE_INJECTABLE": "Tranexamic Acid 500 mg/5 mL, inyectable inyectable",
  "VALACYCLOVIR_500_MG_COMPRIME_ORALE": "Valacyclovir 500 mg, comprimido oral",
  "VANCOMYCIN_1_G_INJECTABLE_IV": "Vancomycin 1 g, inyectable intravenosa",
  "VASOPRESSIN_20UI_ML_IV": "Vasopressin 20 UI/mL, inyectable intravenosa",
  "VITAMIN_A_100000_UI_CAPSULE_ORALE": "Vitamin A 100,000 UI, cápsula oral",
  "VITAMIN_A_200000_UI_CAPSULE_ORALE": "Vitamin A 200,000 UI, cápsula oral",
  "VITAMIN_K_10_MG_PER_1_ML_INJECTABLE_INJECTABLE": "Vitamin K 10 mg/1 mL, inyectable inyectable",
  "XYLOMETAZOLINE_0.1_SPRAY_NASAL_NASALE": "Xylometazoline 0.1%, aerosol nasal nasal",
  "ZINC_SULFATE_10_MG_PER_5_ML_SIROP_ORALE": "Zinc Sulfate 10 mg/5 mL, jarabe oral",
  "ZINC_SULFATE_20_MG_COMPRIME_DISPERSIBLE_ORALE": "Zinc Sulfate 20 mg, comprimido dispersable oral",
};

export const CLINICAL_CATALOG_ES_ORDER_SET: Record<string, string> = {
  "ed_abdominal_pain_v1": "Dolor abdominal — Urgencias",
  "ed_abdominal_trauma_v1": "Trauma abdominal — Urgencias",
  "ed_alcohol_withdrawal_v1": "Abstinencia alcohólica — Urgencias",
  "ed_altered_mental_status_v1": "Alteración del estado mental — Urgencias",
  "ed_animal_bite_v1": "Mordedura de animal — Urgencias",
  "ed_ankle_injury_v1": "Lesión de tobillo — Urgencias",
  "ed_asthma_v1": "Exacerbación de asma — Urgencias",
  "ed_back_pain_v1": "Dolor de espalda — Urgencias",
  "ed_behavioral_health_safety_v1": "Salud conductual / seguridad — Urgencias",
  "ed_burn_v1": "Quemadura — Urgencias",
  "ed_cellulitis_v1": "Celulitis — Urgencias",
  "ed_chest_pain_v1": "Dolor torácico — Urgencias",
  "ed_chest_trauma_v1": "Trauma torácico — Urgencias",
  "ed_chf_v1": "Insuficiencia cardíaca — Urgencias",
  "ed_copd_v1": "Exacerbación de EPOC — Urgencias",
  "ed_dvt_evaluation_v1": "Evaluación de TVP — Urgencias",
  "ed_eye_complaint_v1": "Motivo oftalmológico — Urgencias",
  "ed_facial_trauma_v1": "Trauma facial — Urgencias",
  "ed_fever_adult_v1": "Fiebre — adulto — Urgencias",
  "ed_fever_pediatric_v1": "Fiebre — pediátrica — Urgencias",
  "ed_flank_pain_v1": "Dolor en flanco — Urgencias",
  "ed_foot_injury_v1": "Lesión de pie — Urgencias",
  "ed_hand_injury_v1": "Lesión de mano — Urgencias",
  "ed_headache_v1": "Cefalea — Urgencias",
  "ed_hip_pain_v1": "Dolor de cadera — Urgencias",
  "ed_human_bite_v1": "Mordedura humana — Urgencias",
  "ed_hyperglycemia_v1": "Hiperglucemia — Urgencias",
  "ed_hypertensive_emergency_v1": "Emergencia hipertensiva — Urgencias",
  "ed_hypoglycemia_v1": "Hipoglucemia — Urgencias",
  "ed_laceration_v1": "Laceración — Urgencias",
  "ed_lower_extremity_injury_v1": "Lesión de miembro inferior — Urgencias",
  "ed_lower_gi_bleeding_v1": "Hemorragia digestiva baja — Urgencias",
  "ed_near_syncope_v1": "Presíncope — Urgencias",
  "ed_neck_pain_v1": "Dolor de cuello — Urgencias",
  "ed_needlestick_v1": "Pinchazo / exposición a líquidos corporales — Urgencias",
  "ed_overdose_v1": "Sobredosis / ingestión tóxica — Urgencias",
  "ed_pe_evaluation_v1": "Evaluación de EP — Urgencias",
  "ed_pregnancy_evaluation_v1": "Evaluación del embarazo — Urgencias",
  "ed_procedural_sedation_v1": "Sedación para procedimiento — Urgencias",
  "ed_psychiatric_clearance_v1": "Autorización psiquiátrica — Urgencias",
  "ed_renal_colic_v1": "Cólico renal — Urgencias",
  "ed_respiratory_distress_v1": "Dificultad respiratoria — Urgencias",
  "ed_rn_allergic_reaction_v1": "Reacción alérgica (protocolo de enfermería)",
  "ed_rn_back_flank_pain_v1": "Dolor de espalda / flanco (protocolo de enfermería)",
  "ed_rn_chest_pain_v1": "Dolor torácico (protocolo de enfermería)",
  "ed_rn_eye_complaint_v1": "Motivo oftalmológico (protocolo de enfermería)",
  "ed_rn_fever_pediatric_v1": "Fiebre pediátrica (protocolo de enfermería)",
  "ed_rn_general_injury_v1": "Lesión general (protocolo de enfermería)",
  "ed_rn_lower_extremity_injury_v1": "Lesión de miembro inferior (protocolo de enfermería)",
  "ed_rn_nausea_vomiting_diarrhea_v1": "Náuseas / vómitos / diarrea (protocolo de enfermería)",
  "ed_rn_neuro_complaint_v1": "Motivo neurológico (protocolo de enfermería)",
  "ed_rn_respiratory_distress_v1": "Dificultad respiratoria (protocolo de enfermería)",
  "ed_rn_syncope_v1": "Síncope / presíncope (protocolo de enfermería)",
  "ed_rn_upper_extremity_injury_v1": "Lesión de miembro superior (protocolo de enfermería)",
  "ed_seizure_v1": "Convulsión — Urgencias",
  "ed_sepsis_v1": "Sepsis — Urgencias",
  "ed_shoulder_injury_v1": "Lesión de hombro — Urgencias",
  "ed_sore_throat_v1": "Dolor de garganta — Urgencias",
  "ed_stroke_alert_v1": "Alerta de ACV — Urgencias",
  "ed_suicidal_ideation_v1": "Ideación suicida — Urgencias",
  "ed_syncope_v1": "Síncope — Urgencias",
  "ed_tia_v1": "AIT — Urgencias",
  "ed_trauma_activation_v1": "Activación de trauma — Urgencias",
  "ed_upper_extremity_injury_v1": "Lesión de miembro superior — Urgencias",
  "ed_upper_gi_bleeding_v1": "Hemorragia digestiva alta — Urgencias",
  "ed_vaginal_bleeding_v1": "Sangrado vaginal — Urgencias",
};

export const CLINICAL_CATALOG_ES_ORDER_SET_ITEM: Record<string, string> = {
  "ABG": "Gasometría arterial",
  "Ankle X-ray": "Radiografía de tobillo",
  "BNP": "BNP",
  "Back board": "Tabla espinal",
  "Behavioral health consult": "Interconsulta de salud conductual",
  "Beta hCG": "β-hCG sérica",
  "BiPAP RT request": "Solicitud de BiPAP (terapia respiratoria)",
  "Blood culture": "Hemocultivo",
  "Blood culture before antibiotics": "Hemocultivo antes de antibióticos",
  "Burn care": "Cuidado de quemadura",
  "Burn center consult": "Interconsulta a centro de quemados",
  "CBC": "Hemograma completo",
  "CMP": "Panel metabólico completo",
  "CPAP RT request": "Solicitud de CPAP (terapia respiratoria)",
  "CRP": "Proteína C reactiva",
  "CT abdomen/pelvis": "TC de abdomen y pelvis",
  "CT cervical spine": "TC de columna cervical",
  "CT chest": "TC de tórax",
  "CT head": "TC de cráneo",
  "CT lumbar spine": "TC de columna lumbar",
  "CTA chest": "Angio-TC de tórax",
  "CTA head/neck": "Angio-TC de cabeza y cuello",
  "Cardiology consult": "Interconsulta de cardiología",
  "Cervical collar": "Collar cervical",
  "Chest X-ray": "Radiografía de tórax",
  "Constant observation": "Observación continua",
  "Contact MD when bolus complete": "Avisar al médico al completar el bolo",
  "Continuous cardiac monitoring": "Monitorización cardíaca continua",
  "Crutches": "Muletas",
  "D-dimer": "Dímero D",
  "EKG 12-Lead": "ECG de 12 derivaciones",
  "Elbow X-ray": "Radiografía de codo",
  "Elopement precautions": "Precauciones de fuga",
  "EtCO2 monitoring": "Monitorización de EtCO2",
  "Ethanol level": "Etanol",
  "Eye irrigation": "Irrigación ocular",
  "Eye pH": "pH ocular",
  "Eye tray": "Bandeja oftalmológica",
  "FAST ultrasound": "Ecografía FAST",
  "Fall precautions": "Precauciones de caída",
  "Femur X-ray": "Radiografía de fémur",
  "Foot X-ray": "Radiografía de pie",
  "Forearm X-ray": "Radiografía de antebrazo",
  "Glucose": "Glucosa",
  "Glucose check": "Control de glucosa",
  "HIV test": "VIH",
  "Hand X-ray": "Radiografía de mano",
  "HbA1c": "Hemoglobina glucosilada (HbA1c)",
  "Head of bed 30° and neck neutral": "Cabecera a 30° y cuello neutro",
  "Hepatitis B rapid": "Hepatitis B (prueba rápida)",
  "Hepatitis C antibody": "Hepatitis C (anticuerpos)",
  "Hip X-ray": "Radiografía de cadera",
  "Humerus X-ray": "Radiografía de húmero",
  "INR": "INR",
  "IV fluids setup": "Preparación de líquidos IV",
  "Ice pack": "Bolsa de hielo",
  "Laceration repair": "Reparación de laceración",
  "Lactate": "Lactato",
  "Lipase": "Lipasa",
  "Log roll": "Volteo en bloque",
  "Massive transfusion protocol": "Protocolo de transfusión masiva",
  "NG tube placement": "Colocación de sonda nasogástrica",
  "NPO status": "Ayuno (NPO)",
  "Nebulizer treatment": "Nebulización",
  "Neuro checks": "Controles neurológicos",
  "Neurology consult": "Interconsulta de neurología",
  "Obstetric ultrasound": "Ecografía obstétrica",
  "Obtain consent for sedation": "Obtener consentimiento para sedación",
  "Orthopedics consult": "Interconsulta de ortopedia",
  "Orthostatic vital signs": "Signos vitales ortostáticos",
  "Oxygen therapy": "Oxigenoterapia",
  "POC strep screen": "Prueba rápida de estreptococo",
  "Peak flow RT request": "Solicitud de flujo máximo (terapia respiratoria)",
  "Pelvic exam setup": "Preparación para examen pélvico",
  "Pelvic ultrasound": "Ecografía pélvica",
  "Pelvis X-ray": "Radiografía de pelvis",
  "Peripheral IV placement": "Colocación de vía periférica",
  "Poison control consult": "Consulta a toxicología / centro de envenenamiento",
  "Portable chest X-ray": "Radiografía de tórax portátil",
  "Pregnancy test": "Prueba de embarazo",
  "Psychiatry consult": "Interconsulta de psiquiatría",
  "Pulse oximetry": "Oximetría de pulso",
  "Rapid strep": "Estreptococo rápido",
  "Rectal exam assist": "Asistencia en examen rectal",
  "Renal ultrasound": "Ecografía renal",
  "Respiratory therapy request": "Solicitud de terapia respiratoria",
  "Restraints (per protocol)": "Sujeciones (según protocolo)",
  "Sedation monitoring": "Monitoreo de sedación",
  "Seizure precautions": "Precauciones de convulsión",
  "Septic team": "Equipo de sepsis",
  "Set up procedural sedation": "Preparación para sedación de procedimiento",
  "Set up suction": "Preparar aspiración",
  "Shoulder X-ray": "Radiografía de hombro",
  "Sitter at bedside": "Vigilancia a pie de cama",
  "Sling": "Cabestrillo",
  "Social work consult": "Interconsulta de trabajo social",
  "Splint application": "Aplicación de férula",
  "Stroke alert activation": "Activación de alerta de ACV",
  "Suicide precautions": "Precauciones de suicidio",
  "Swallow screen before first PO": "Cribado de deglución antes de la primera toma oral",
  "Telemetry initiation": "Inicio de telemetría",
  "Tibia/fibula X-ray": "Radiografía de tibia y peroné",
  "Trauma activation": "Activación de trauma",
  "Troponin": "Troponina",
  "Type and screen": "Grupo y pesquisa de anticuerpos",
  "Ultrasound abdomen": "Ecografía abdominal",
  "Urinalysis": "Análisis de orina",
  "Urine drug screen": "Toxicológico en orina",
  "VBG": "Gasometría venosa",
  "Venous duplex ultrasound": "Doppler venoso de miembro inferior",
  "Visual acuity": "Agudeza visual",
  "Vital signs q15": "Signos vitales cada 15 min",
  "Wound care": "Cuidado de herida",
  "Wound culture": "Cultivo de herida",
  "Wound irrigation": "Irrigación de herida",
  "Wound setup": "Preparación de herida",
  "Wrist X-ray": "Radiografía de muñeca",
};


export type ClinicalCatalogKind =
  | "MEDICATION"
  | "LAB_TEST"
  | "IMAGING_STUDY"
  | "CARE_PROCEDURE"
  | "ORDER_SET";

const CODE_OWNERSHIP: Partial<Record<string, ClinicalCatalogKind>> = {};

function remember(kind: ClinicalCatalogKind, map: Record<string, string>): void {
  for (const code of Object.keys(map)) {
    const prev = CODE_OWNERSHIP[code];
    if (prev && prev !== kind) {
      delete CODE_OWNERSHIP[code];
    } else if (!prev) {
      CODE_OWNERSHIP[code] = kind;
    }
  }
}

remember("LAB_TEST", CLINICAL_CATALOG_ES_LAB);
remember("IMAGING_STUDY", CLINICAL_CATALOG_ES_IMAGING);
remember("CARE_PROCEDURE", CLINICAL_CATALOG_ES_PROCEDURE);
remember("MEDICATION", CLINICAL_CATALOG_ES_MEDICATION);
remember("ORDER_SET", CLINICAL_CATALOG_ES_ORDER_SET);

export function lookupGovernedCatalogEsLabel(
  kind: ClinicalCatalogKind | null | undefined,
  code: string | null | undefined
): string {
  const c = code?.trim() ?? "";
  if (!c) return "";
  if (kind === "LAB_TEST") return CLINICAL_CATALOG_ES_LAB[c] ?? "";
  if (kind === "IMAGING_STUDY") return CLINICAL_CATALOG_ES_IMAGING[c] || composeImagingDisplayEs(c);
  if (kind === "CARE_PROCEDURE") return CLINICAL_CATALOG_ES_PROCEDURE[c] ?? "";
  if (kind === "MEDICATION") return CLINICAL_CATALOG_ES_MEDICATION[c] ?? "";
  if (kind === "ORDER_SET") return CLINICAL_CATALOG_ES_ORDER_SET[c] ?? "";
  const owner = CODE_OWNERSHIP[c];
  if (owner === "LAB_TEST") return CLINICAL_CATALOG_ES_LAB[c] ?? "";
  if (owner === "IMAGING_STUDY") return CLINICAL_CATALOG_ES_IMAGING[c] ?? "";
  if (owner === "CARE_PROCEDURE") return CLINICAL_CATALOG_ES_PROCEDURE[c] ?? "";
  if (owner === "MEDICATION") return CLINICAL_CATALOG_ES_MEDICATION[c] ?? "";
  if (owner === "ORDER_SET") return CLINICAL_CATALOG_ES_ORDER_SET[c] ?? "";
  return (
    CLINICAL_CATALOG_ES_LAB[c] ||
    CLINICAL_CATALOG_ES_IMAGING[c] ||
    CLINICAL_CATALOG_ES_PROCEDURE[c] ||
    CLINICAL_CATALOG_ES_MEDICATION[c] ||
    CLINICAL_CATALOG_ES_ORDER_SET[c] ||
    ""
  );
}

export function lookupOrderSetItemDisplayEs(englishLabel: string | null | undefined, catalogCode?: string | null): string {
  const code = catalogCode?.trim() ?? "";
  if (code && CLINICAL_CATALOG_ES_LAB[code]) return CLINICAL_CATALOG_ES_LAB[code];
  if (code && CLINICAL_CATALOG_ES_IMAGING[code]) return CLINICAL_CATALOG_ES_IMAGING[code];
  if (code && CLINICAL_CATALOG_ES_PROCEDURE[code]) return CLINICAL_CATALOG_ES_PROCEDURE[code];
  const en = englishLabel?.trim() ?? "";
  return CLINICAL_CATALOG_ES_ORDER_SET_ITEM[en] ?? "";
}

export const CLINICAL_CATALOG_ES_ORDER_SET_WARNING: Record<string, string> = {
  "Complete structured oxygen parameters on the Care tab if oxygen is clinically indicated.":
    "Complete los parámetros estructurados de oxígeno en la pestaña Cuidados si el oxígeno está indicado.",
  "Oxygen therapy requires structured parameters when selected.":
    "La oxigenoterapia requiere parámetros estructurados cuando se selecciona.",
  "Oxygen therapy requires structured parameters — add from the Care tab after apply if selected.":
    "La oxigenoterapia requiere parámetros estructurados: agréguelos en la pestaña Cuidados después de aplicar, si se selecciona.",
  "Restraints require institutional protocol and governance review before placement.":
    "Las sujeciones requieren protocolo institucional y revisión de gobernanza antes de colocarse.",
};

const DOSAGE_FORM_TO_ES: Record<string, string> = {
  "aérosol doseur": "inhalador de dosis medida",
  aérosol: "aerosol",
  capsule: "cápsula",
  collyre: "gotas oftálmicas",
  "comprimé dispersible": "comprimido dispersable",
  comprimé: "comprimido",
  comprime: "comprimido",
  crème: "crema",
  gélule: "cápsula",
  gelule: "cápsula",
  inhalateur: "inhalador",
  injectable: "inyectable",
  lotion: "loción",
  nébulisation: "nebulización",
  ovule: "óvulo vaginal",
  perfusion: "perfusión",
  "pommade ophtalmique": "ungüento oftálmico",
  pommade: "ungüento",
  "poudre pour solution buvable": "polvo para solución oral",
  shampooing: "champú",
  sirop: "jarabe",
  "solution de nébulisation": "solución para nebulización",
  "spray nasal": "aerosol nasal",
  suppositoire: "supositorio",
  "suspension buvable": "suspensión oral",
  tablet: "comprimido",
  solution: "solución",
  syrup: "jarabe",
  cream: "crema",
  ointment: "ungüento",
  injection: "inyección",
};

const ROUTE_TO_ES: Record<string, string> = {
  inhalation: "inhalación",
  inhalée: "inhalada",
  inhaled: "inhalada",
  injectable: "inyectable",
  intramusculaire: "intramuscular",
  intramuscular: "intramuscular",
  "intraveineuse / intramusculaire": "IV / IM",
  intraveineuse: "intravenosa",
  intravenous: "intravenosa",
  nasale: "nasal",
  nasal: "nasal",
  ophtalmique: "oftálmica",
  ophthalmic: "oftálmica",
  orale: "oral",
  oral: "oral",
  rectale: "rectal",
  rectal: "rectal",
  "sous-cutanée": "subcutánea",
  subcutaneous: "subcutánea",
  topique: "tópica",
  topical: "tópica",
  vaginale: "vaginal",
  vaginal: "vaginal",
};

function mapClinicalTermToEs(value: string | null | undefined, table: Record<string, string>): string {
  const raw = value?.trim() ?? "";
  if (!raw) return "";
  if (table[raw]) return table[raw];
  const lower = raw.toLowerCase();
  for (const [from, to] of Object.entries(table)) {
    if (from.toLowerCase() === lower) return to;
  }
  return "";
}

const INN_TO_ES: Record<string, string> = {
  amlodipine: "Amlodipino",
  metformin: "Metformina",
  ceftriaxone: "Ceftriaxona",
  ibuprofen: "Ibuprofeno",
  paracetamol: "Paracetamol",
  acetaminophen: "Paracetamol",
  aspirin: "Ácido acetilsalicílico",
  amoxicillin: "Amoxicilina",
  ciprofloxacin: "Ciprofloxacino",
  azithromycin: "Azitromicina",
  omeprazole: "Omeprazol",
  lisinopril: "Lisinopril",
};

export function medicationInnIdentityCandidate(value: string | null | undefined): string {
  const v = value?.trim() ?? "";
  if (!v || /\s/.test(v)) return "";
  return v;
}

export function composeMedicationDisplayEs(input: {
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  route?: string | null;
  code?: string | null;
}): string {
  const byCode = lookupGovernedCatalogEsLabel("MEDICATION", input.code);
  if (byCode) return byCode;
  const generic = input.genericName?.trim() ?? "";
  const inn = generic ? INN_TO_ES[generic.toLowerCase()] ?? generic : "";
  const strength = input.strength?.trim() ?? "";
  const form = mapClinicalTermToEs(input.dosageForm, DOSAGE_FORM_TO_ES);
  const route = mapClinicalTermToEs(input.route, ROUTE_TO_ES);
  if (!inn) return "";
  const head = [inn, strength].filter(Boolean).join(" ");
  const tail = [form, route].filter(Boolean).join(" ");
  return [head, tail].filter(Boolean).join(", ");
}

export function resolveMedicationClinicalDisplayEs(
  value: string | null | undefined,
  field: "dosageForm" | "route"
): string {
  return mapClinicalTermToEs(value, field === "dosageForm" ? DOSAGE_FORM_TO_ES : ROUTE_TO_ES);
}

export function resolveClinicalCatalogDisplayLabel(
  locale: string | null | undefined,
  fields: CatalogDisplayLabelFields & { catalogKind?: ClinicalCatalogKind | null }
): string {
  const fromOverlay = lookupGovernedCatalogEsLabel(fields.catalogKind, fields.code);
  return pickCatalogDisplayLabelForProductUi(locale, {
    ...fields,
    displayNameEs: fields.displayNameEs?.trim() || fromOverlay || null,
  });
}

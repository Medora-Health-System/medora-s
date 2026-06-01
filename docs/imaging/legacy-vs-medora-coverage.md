# Legacy vs Medora Coverage

**Phase:** 3A (audit-only)
**Medora catalog source:** `apps/api/prisma/data/haiti-imaging-studies.ts` (44 seed rows; 43 active excluding retired `CT_HEAD`)

**Coverage definitions:**
- **FULL** — Legacy study maps to an active Medora code with matching clinical intent (contrast/laterality/view gaps acceptable only if absent from legacy name).
- **PARTIAL** — Related Medora code exists but missing laterality, view count, contrast phase, protocol, or body-region specificity encoded as separate legacy orderables.
- **MISSING** — No reasonable Medora catalog row.

| Legacy Study | Modality Family | Matching Medora Code | Coverage | Notes |
|---|---|---|---|---|
| Abdomen 1V | X-Ray | `XR_ABDOMEN` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Abdomen 2V | X-Ray | `XR_ABDOMEN` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Abdomen 3V Acute Series | X-Ray | `XR_ABDOMEN` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Abdomen KUB | X-Ray | `XR_ABD_AP` | FULL | Exact Medora orderable match |
| AC Joint Bilat 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| AC Joint Left 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| AC Joint Right 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Ankle Left 2V | X-Ray | `XR_ANKLE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Ankle Left 3V | X-Ray | `XR_ANKLE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Ankle Right 2V | X-Ray | `XR_ANKLE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Ankle Right 3V | X-Ray | `XR_ANKLE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Babygram (Infant Whole Body) | X-Ray | `none` | MISSING | No Medora XR for this study |
| Calcaneus Left 2V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Calcaneus Right 2V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Chest 1V Decub | X-Ray | `XR_CHEST` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Chest X-Ray 1 View (CXR) | X-Ray | `XR_CHEST` | FULL | Exact Medora orderable match |
| Chest X-Ray 2 View (CXR) | X-Ray | `XR_CHEST_2V` | FULL | Exact Medora orderable match |
| Chest Post Intubation | X-Ray | `XR_CHEST` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Clavicle Left 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Clavicle Right 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Coccyx and Sacrum | X-Ray | `none` | MISSING | No Medora XR for this study |
| Sacrum and Coccyx | X-Ray | `none` | MISSING | No Medora XR for this study |
| C-Spine 1V Lateral | X-Ray | `none` | MISSING | No Medora XR for this study |
| C-Spine 2-3V | X-Ray | `none` | MISSING | No Medora XR for this study |
| C-Spine 3V Upright | X-Ray | `none` | MISSING | No Medora XR for this study |
| C-Spine Complete | X-Ray | `none` | MISSING | No Medora XR for this study |
| Elbow Left 2V | X-Ray | `XR_ELBOW` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Elbow Left 3V | X-Ray | `XR_ELBOW` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Elbow Left 4V | X-Ray | `XR_ELBOW` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Elbow Right 2V | X-Ray | `XR_ELBOW` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Elbow Right 3V | X-Ray | `XR_ELBOW` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Elbow Right 4V | X-Ray | `XR_ELBOW` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Facial Bones Complete | X-Ray | `none` | MISSING | No Medora XR for this study |
| Facial Bones <3V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Femur Left 2V | X-Ray | `XR_FEMUR` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Femur Right 2V | X-Ray | `XR_FEMUR` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Finger Left 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Finger Left 3V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Finger Right 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Finger Right 3V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Foot Bilateral 2V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Foot Left 2V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Foot Left 3V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Foot Right 2V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Foot Right 3V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Forearm Left 2V | X-Ray | `XR_FOREARM` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Forearm Right 2V | X-Ray | `XR_FOREARM` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hand Left 2V | X-Ray | `XR_HAND` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hand Left 3V | X-Ray | `XR_HAND` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hand Right 2V | X-Ray | `XR_HAND` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hand Right 3V | X-Ray | `XR_HAND` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hip Bilateral w Pelvis | X-Ray | `XR_HIP` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hip Left 1V | X-Ray | `XR_HIP` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hip Left 2V | X-Ray | `XR_HIP` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hip Right 1V | X-Ray | `XR_HIP` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Hip Right 2V | X-Ray | `XR_HIP` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Humerus Left 2V | X-Ray | `XR_HUMERUS` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Humerus Right 2V | X-Ray | `XR_HUMERUS` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Infant Foot Left 2V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Infant Lower Extremity Left 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Infant Lower Extremity Right 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Infant Upper Extremity Left 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Infant Upper Extremity Right 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Knee Left 1V Sunrise | X-Ray | `XR_KNEE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Knee Left 2V | X-Ray | `XR_KNEE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Knee Left 3V | X-Ray | `XR_KNEE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Knee Left 4V | X-Ray | `XR_KNEE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Knee Right 1V Sunrise | X-Ray | `XR_KNEE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Knee Right 2V | X-Ray | `XR_KNEE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Knee Right 3V | X-Ray | `XR_KNEE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Knee Right 4V | X-Ray | `XR_KNEE` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| L-Spine 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| L-Spine 2V Upright | X-Ray | `none` | MISSING | No Medora XR for this study |
| L-Spine 3V | X-Ray | `none` | MISSING | No Medora XR for this study |
| L-Spine 3V Upright | X-Ray | `none` | MISSING | No Medora XR for this study |
| Mandible 4V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Mandible Trauma | X-Ray | `none` | MISSING | No Medora XR for this study |
| Nasal Bones 3V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Neck Soft Tissue 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Orbit Left 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Orbit Left 4V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Orbit Right 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Orbit Right 4V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Os Calcis Left 2V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Os Calcis Right 2V | X-Ray | `XR_FOOT` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Panorex Series | X-Ray | `none` | MISSING | No Medora XR for this study |
| Pediagram 1V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Pelvis AP | X-Ray | `XR_PELVIS` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Pelvis Complete | X-Ray | `XR_PELVIS` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Ribs Left | X-Ray | `none` | MISSING | No Medora XR for this study |
| Ribs Left with CXR | X-Ray | `XR_CHEST` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Ribs Right | X-Ray | `none` | MISSING | No Medora XR for this study |
| Ribs Right with CXR | X-Ray | `XR_CHEST` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Scapula Left | X-Ray | `none` | MISSING | No Medora XR for this study |
| Scapula Right | X-Ray | `none` | MISSING | No Medora XR for this study |
| Shoulder Left 2V | X-Ray | `XR_SHOULDER` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Shoulder Left 3V | X-Ray | `XR_SHOULDER` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Shoulder Right 2V | X-Ray | `XR_SHOULDER` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Shoulder Right 3V | X-Ray | `XR_SHOULDER` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Sinus 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Sinus Complete | X-Ray | `none` | MISSING | No Medora XR for this study |
| Skull 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Skull 4V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Sternum 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| T-Spine 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| T-Spine 3V Upright | X-Ray | `none` | MISSING | No Medora XR for this study |
| Thoracolumbar Spine 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Tibia/Fibula Left 2V | X-Ray | `XR_TIB_FIB` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Tibia/Fibula Right 2V | X-Ray | `XR_TIB_FIB` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| TMJ Bilateral | X-Ray | `none` | MISSING | No Medora XR for this study |
| Toe Left 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Toe Left 3V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Toe Right 2V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Toe Right 3V | X-Ray | `none` | MISSING | No Medora XR for this study |
| Wrist Left 2V | X-Ray | `XR_WRIST` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Wrist Left 3V | X-Ray | `XR_WRIST` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Wrist Right 2V | X-Ray | `XR_WRIST` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| Wrist Right 3V | X-Ray | `XR_WRIST` | PARTIAL | Generic body-region XR without laterality/view/protocol split |
| CT Abdomen w IV Contrast | CT | `CT_ABD` | PARTIAL | Legacy abdomen-only CT; Medora CT_ABD/CT_ABDOMEN_PELVIS pair lacks contrast split |
| CT Abdomen wo IV Contrast | CT | `CT_ABD` | PARTIAL | Legacy abdomen-only CT; Medora CT_ABD/CT_ABDOMEN_PELVIS pair lacks contrast split |
| CT Abdomen w&wo IV Contrast | CT | `CT_ABD` | PARTIAL | Legacy abdomen-only CT; Medora CT_ABD/CT_ABDOMEN_PELVIS pair lacks contrast split |
| CT Abdomen/Pelvis w IV Contrast | CT | `CT_ABDOMEN_PELVIS` | PARTIAL | Abdomen/pelvis CT present; contrast variant not modeled as separate code |
| CT Abdomen/Pelvis wo IV Contrast | CT | `CT_ABDOMEN_PELVIS` | PARTIAL | Abdomen/pelvis CT present; contrast variant not modeled as separate code |
| CT Abdomen/Pelvis w&wo IV Contrast | CT | `CT_ABDOMEN_PELVIS` | PARTIAL | Abdomen/pelvis CT present; contrast variant not modeled as separate code |
| CT Angiogram Abdomen | CT | `CTA_ABDOMEN_PELVIS` | PARTIAL | Abdominal angio mapped to CTA abdomen/pelvis |
| CT Brain Perfusion | CT | `none` | MISSING | No CT perfusion in Medora |
| CT C-Spine wo IV Contrast | CT | `CT_CERVICAL_SPINE` | FULL | Exact Medora orderable match |
| CT Chest HR | CT | `CT_CHEST` | PARTIAL | Chest CT present; HR/contrast variants not separate |
| CT Chest w IV Contrast | CT | `CT_CHEST` | PARTIAL | Chest CT present; HR/contrast variants not separate |
| CT Chest wo IV Contrast | CT | `CT_CHEST` | FULL | Exact Medora orderable match |
| CT Chest w&wo IV Contrast | CT | `CT_CHEST` | PARTIAL | Chest CT present; HR/contrast variants not separate |
| CT Facial wo IV Contrast | CT | `none` | MISSING | No facial/maxillofacial/sinus/orbit CT in Medora |
| CT Foot Left wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Foot Right wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Head w IV Contrast | CT | `CT_HEAD_WO_CONTRAST` | PARTIAL | Head CT present; w or w&wo contrast variant missing |
| CT Head wo IV Contrast | CT | `CT_HEAD_WO_CONTRAST` | FULL | Exact Medora orderable match |
| CT Head w&wo IV Contrast | CT | `CT_HEAD_WO_CONTRAST` | FULL | Exact wo-contrast head CT |
| CT Hip Left wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Hip Right wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Knee Left wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Knee Right wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT L-Spine wo IV Contrast | CT | `CT_SPINE_LUMBAR` | FULL | Exact Medora orderable match |
| CT Lower Extremity Left w IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Lower Extremity Left wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Lower Extremity Right w IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Lower Extremity Right wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Maxillofacial w IV Contrast | CT | `none` | MISSING | No facial/maxillofacial/sinus/orbit CT in Medora |
| CT Maxillofacial wo IV Contrast | CT | `none` | MISSING | No facial/maxillofacial/sinus/orbit CT in Medora |
| CT Orbits wo IV Contrast | CT | `none` | MISSING | No facial/maxillofacial/sinus/orbit CT in Medora |
| CT Pelvis wo IV Contrast | CT | `CT_ABDOMEN_PELVIS` | PARTIAL | Pelvis CT via abdomen/pelvis row; contrast not split |
| CT Pelvis w&wo IV Contrast | CT | `CT_ABDOMEN_PELVIS` | PARTIAL | Pelvis CT via abdomen/pelvis row; contrast not split |
| CT Sinuses wo IV Contrast | CT | `none` | MISSING | No facial/maxillofacial/sinus/orbit CT in Medora |
| CT Soft Tissue Neck | CT | `none` | MISSING | No soft-tissue neck CT in Medora |
| CT STN w IV Contrast | CT | `none` | MISSING | No soft-tissue neck CT in Medora |
| CT STN wo IV Contrast | CT | `none` | MISSING | No soft-tissue neck CT in Medora |
| CT STN w&wo IV Contrast | CT | `none` | MISSING | No soft-tissue neck CT in Medora |
| CT T-Spine wo IV Contrast | CT | `none` | MISSING | No thoracic spine CT in Medora |
| CT Upper Extremity Left w IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Upper Extremity Left wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Upper Extremity Right w IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CT Upper Extremity Right wo IV Contrast | CT | `none` | MISSING | No MSK/extremity CT in Medora |
| CTA Abdominal Aorta w Reconstructions | CTA | `CTA_ABDOMEN_PELVIS` | PARTIAL | Abdominal CTA present; aorta/runoff/reconstruction not separate |
| CTA Abdominal Aorta w Runoff | CTA | `CTA_ABDOMEN_PELVIS` | PARTIAL | Abdominal CTA present; aorta/runoff/reconstruction not separate |
| CTA Chest w Reconstruction | CTA | `CTA_CHEST` | FULL | Exact Medora orderable match |
| CTA Chest Triple Rule Out | CTA | `CTA_CHEST` | FULL | Exact Medora orderable match |
| CTA COW / Carotids w Reconstructions | CTA | `CTA_HEAD_NECK` | PARTIAL | Carotid/COW bundled in CTA head/neck row |
| CTA Head | CTA | `CTA_HEAD_NECK` | PARTIAL | Head/neck CTA present; Willis/COW specificity not separate |
| CTA Head and Neck | CTA | `CTA_HEAD_NECK` | FULL | Exact Medora orderable match |
| CTA Head Circle of Willis w Reconstructions | CTA | `CTA_HEAD_NECK` | PARTIAL | Circle of Willis not separate from CTA head/neck |
| CTA Lower Extremity Left | CTA | `none` | MISSING | No extremity CTA in Medora catalog |
| CTA Lower Extremity Right | CTA | `none` | MISSING | No extremity CTA in Medora catalog |
| CTA Upper Extremity Left | CTA | `none` | MISSING | No extremity CTA in Medora catalog |
| CTA Upper Extremity Right | CTA | `none` | MISSING | No extremity CTA in Medora catalog |
| MRI C-Spine w Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI C-Spine wo Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI C-Spine w&wo Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI Cholangiogram | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Head w Contrast | MRI | `MRI_BRAIN` | PARTIAL | Brain MRI present; contrast/limited variants not separate |
| MRI Head wo Contrast | MRI | `MRI_BRAIN` | FULL | Exact Medora orderable match |
| MRI Head w&wo Contrast | MRI | `MRI_BRAIN` | PARTIAL | Brain MRI present; contrast/limited variants not separate |
| MRI Head/Brain Limited | MRI | `MRI_BRAIN` | PARTIAL | Brain MRI present; contrast/limited variants not separate |
| MRI Hip Bilateral wo Contrast | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Hip Left wo Contrast | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Hip Right wo Contrast | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Knee Left | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Knee Right | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI L-Spine w Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI L-Spine wo Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI L-Spine w&wo Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI Lower Extremity Left w&wo Contrast | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Lower Extremity Right w&wo Contrast | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Pelvis | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Pelvis Limited | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Sella | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI T-Spine w Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI T-Spine wo Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI T-Spine w&wo Contrast | MRI | `MRI_SPINE` | PARTIAL | Generic spine MRI; region/contrast not split |
| MRI Upper Extremity Left wo Contrast | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Upper Extremity Right wo Contrast | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRI Upper Extremity Right w&wo Contrast | MRI | `none` | MISSING | No Medora MRI for this body region/protocol |
| MRA Brain | MRA | `none` | MISSING | No MRA modality rows in Medora catalog |
| MRA Carotid w Contrast | MRA | `none` | MISSING | No MRA modality rows in Medora catalog |
| MRA Carotid wo Contrast | MRA | `none` | MISSING | No MRA modality rows in Medora catalog |
| MRA Lower Extremity Left w Contrast | MRA | `none` | MISSING | No MRA modality rows in Medora catalog |
| MRA Lower Extremity Right w Contrast | MRA | `none` | MISSING | No MRA modality rows in Medora catalog |
| US Abdomen Complete | Ultrasound | `US_ABDOMEN` | FULL | Exact Medora orderable match |
| US Abdomen Limited | Ultrasound | `US_ABDOMEN` | PARTIAL | Abdominal US present; complete vs limited not separate |
| US Aorta | Ultrasound | `none` | MISSING | No aorta US |
| US Axilla | Ultrasound | `none` | MISSING | No dedicated Medora US for this region |
| US Bladder | Ultrasound | `none` | MISSING | No dedicated Medora US for this region |
| US Breast Bilateral | Ultrasound | `none` | MISSING | No breast US |
| US Breast Left | Ultrasound | `none` | MISSING | No breast US |
| US Breast Right | Ultrasound | `none` | MISSING | No breast US |
| US Buttocks | Ultrasound | `none` | MISSING | No dedicated Medora US for this region |
| US Carotid Duplex | Ultrasound | `none` | MISSING | No carotid duplex US |
| US Chest | Ultrasound | `none` | MISSING | No dedicated Medora US for this region |
| US Duplex Limited Abdomen/Pelvis/Scrotal | Ultrasound | `US_PELVIS` | PARTIAL | Pelvic US present; trans/endovaginal/Doppler variants not separate |
| US Gallbladder | Ultrasound | `US_RUQ_GALLBLADDER` | FULL | Exact Medora orderable match |
| US Groin | Ultrasound | `none` | MISSING | No dedicated Medora US for this region |
| US Groin Left PSA | Ultrasound | `none` | MISSING | No dedicated Medora US for this region |
| US Groin Right PSA | Ultrasound | `none` | MISSING | No dedicated Medora US for this region |
| US Groin Bilateral PSA | Ultrasound | `none` | MISSING | No dedicated Medora US for this region |
| US Liver | Ultrasound | `US_RUQ_GALLBLADDER` | PARTIAL | RUQ/gallbladder US present |
| US Lower Back | Ultrasound | `none` | MISSING | No back US |
| US Lower Extremity Bilateral Arterial Doppler | Ultrasound | `none` | MISSING | No LE arterial Doppler in Medora |
| US Lower Extremity Bilateral Venous Doppler | Ultrasound | `US_VENOUS_DOPPLER_LE` | FULL | Exact Medora orderable match |
| US Lower Extremity Left Arterial Doppler | Ultrasound | `none` | MISSING | No LE arterial Doppler in Medora |
| US Lower Extremity Left Venous Doppler | Ultrasound | `US_VENOUS_DOPPLER_LE` | FULL | Exact Medora orderable match |
| US Lower Extremity Right Arterial Doppler | Ultrasound | `none` | MISSING | No LE arterial Doppler in Medora |
| US Lower Extremity Right Venous Doppler | Ultrasound | `US_VENOUS_DOPPLER_LE` | FULL | Exact Medora orderable match |
| US Lower Extremity Unilateral Venous Doppler | Ultrasound | `US_VENOUS_DOPPLER_LE` | FULL | Exact Medora orderable match |
| US Neck / Head Soft Tissue | Ultrasound | `US_SOFT` | PARTIAL | Soft tissue US present; neck/thyroid specificity partial |
| US OB <14 Weeks Limited | Ultrasound | `US_OB_FIRST` | PARTIAL | First-trimester OB proxy; transvaginal/limited variants not separate |
| US OB <14 Weeks Single Gestation | Ultrasound | `US_OB_FIRST` | PARTIAL | First-trimester OB proxy; transvaginal/limited variants not separate |
| US OB <14 Weeks Transvaginal | Ultrasound | `US_OB_FIRST` | PARTIAL | First-trimester OB proxy; transvaginal/limited variants not separate |
| US OB >14 Weeks Limited | Ultrasound | `US_OB_GROWTH` | PARTIAL | Later OB/growth proxy; portable/limited variants not separate |
| US OB >14 Weeks Limited Portable | Ultrasound | `US_OB_GROWTH` | PARTIAL | Later OB/growth proxy; portable/limited variants not separate |
| US OB >14 Weeks Single Gestation | Ultrasound | `US_OB_GROWTH` | PARTIAL | Later OB/growth proxy; portable/limited variants not separate |
| US OB >14 Weeks Transvaginal | Ultrasound | `US_OB_GROWTH` | PARTIAL | Later OB/growth proxy; portable/limited variants not separate |
| US OB Biophysical Profile without NST | Ultrasound | `US_OB_GROWTH` | PARTIAL | Later OB/growth proxy; portable/limited variants not separate |
| US Pelvic Doppler | Ultrasound | `US_PELVIS` | PARTIAL | Pelvic US present; trans/endovaginal/Doppler variants not separate |
| US Pelvis | Ultrasound | `US_PELVIS` | FULL | Exact Medora orderable match |
| US Pelvis Limited | Ultrasound | `US_PELVIS` | PARTIAL | Pelvic US present; trans/endovaginal/Doppler variants not separate |
| US Pelvis with Trans/Endo | Ultrasound | `US_PELVIS` | PARTIAL | Pelvic US present; trans/endovaginal/Doppler variants not separate |
| US Renal Complete | Ultrasound | `US_RENAL` | FULL | Exact Medora orderable match |
| US RUQ | Ultrasound | `US_RUQ_GALLBLADDER` | FULL | Exact Medora orderable match |
| US Scrotum/Contents | Ultrasound | `US_SCROTUM_TESTICULAR` | FULL | Exact Medora orderable match |
| US Soft Tissue | Ultrasound | `US_SOFT` | FULL | Exact Medora orderable match |
| US Thyroid / Neck | Ultrasound | `none` | MISSING | No dedicated thyroid US |
| US Trans/Endo | Ultrasound | `none` | MISSING | Unmapped legacy study |
| US Upper Back | Ultrasound | `none` | MISSING | No back US |
| US Upper Extremity Bilateral Arterial Doppler | Ultrasound | `none` | MISSING | No upper extremity Doppler in Medora |
| US Upper Extremity Bilateral Venous Doppler | Ultrasound | `none` | MISSING | No upper extremity Doppler in Medora |
| US Upper Extremity Left Arterial Doppler | Ultrasound | `none` | MISSING | No upper extremity Doppler in Medora |
| US Upper Extremity Left Venous Doppler | Ultrasound | `none` | MISSING | No upper extremity Doppler in Medora |
| US Upper Extremity Right Arterial Doppler | Ultrasound | `none` | MISSING | No upper extremity Doppler in Medora |
| US Upper Extremity Right Venous Doppler | Ultrasound | `none` | MISSING | No upper extremity Doppler in Medora |
| US Upper Extremity Unilateral Venous Doppler | Ultrasound | `none` | MISSING | No upper extremity Doppler in Medora |
| Gallbladder Emptying Study RP | Nuclear Medicine | `none` | MISSING | No Nuclear Medicine studies in Medora catalog |
| HIDA Scan | Nuclear Medicine | `none` | MISSING | No Nuclear Medicine studies in Medora catalog |
| Lung Scan Perfusion/Ventilation RP | Nuclear Medicine | `none` | MISSING | No Nuclear Medicine studies in Medora catalog |
| VQ Scan Perfusion | Nuclear Medicine | `none` | MISSING | No Nuclear Medicine studies in Medora catalog |
| VQ Scan Ventilation | Nuclear Medicine | `none` | MISSING | No Nuclear Medicine studies in Medora catalog |
| Line Placement Fluoro | Fluoroscopy | `none` | MISSING | No Fluoroscopy studies in Medora catalog |
| Lumbar Puncture wo Fluoro | Fluoroscopy | `none` | MISSING | No Fluoroscopy studies in Medora catalog |
| Swallow Esophagram | Fluoroscopy | `none` | MISSING | No Fluoroscopy studies in Medora catalog |
| Tube Placement Fluoroscopy | Fluoroscopy | `none` | MISSING | No Fluoroscopy studies in Medora catalog |
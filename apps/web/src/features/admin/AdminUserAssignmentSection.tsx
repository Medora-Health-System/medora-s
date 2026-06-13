"use client";

import React from "react";
import {
  ADMIN_PROFESSION_CODES,
  TECHNICIAN_TYPE_CODES,
  type AdminProfessionCode,
  type TechnicianTypeCode,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import type { UserFacilityOption } from "@/hooks/useFacilityAndRoles";
import {
  createEmptyAssignmentRow,
  resolveRowRoleCode,
  workspacePreviewKeyForRow,
  type AssignmentDraftRow,
  type FacilityDepartmentOption,
} from "./adminUserAssignmentForm";

type Props = {
  facilities: UserFacilityOption[];
  rows: AssignmentDraftRow[];
  onChangeRows: (rows: AssignmentDraftRow[]) => void;
  departmentsByFacility: Record<string, FacilityDepartmentOption[]>;
  departmentsLoading?: boolean;
  /** When false, facility column is hidden (single-facility create flow). */
  showFacilityColumn?: boolean;
  disabled?: boolean;
};

function professionLabel(profession: AdminProfessionCode, t: (key: string) => string): string {
  const key = `adminUsers.professionLabels.${profession}`;
  const label = t(key);
  return label === key ? profession : label;
}

function technicianTypeLabel(type: TechnicianTypeCode, t: (key: string) => string): string {
  const key = `adminUsers.technicianTypeLabels.${type}`;
  const label = t(key);
  return label === key ? type : label;
}

function departmentDisplayLabel(dept: FacilityDepartmentOption, t: (key: string) => string): string {
  if (dept.name.trim()) return dept.name.trim();
  const key = `adminUsers.departmentLabels.${dept.code}`;
  const label = t(key);
  return label === key ? dept.code : label;
}

export function AdminUserAssignmentSection({
  facilities,
  rows,
  onChangeRows,
  departmentsByFacility,
  departmentsLoading = false,
  showFacilityColumn = true,
  disabled = false,
}: Props) {
  const { t } = useI18n();

  const updateRow = (clientId: string, patch: Partial<AssignmentDraftRow>) => {
    onChangeRows(
      rows.map((row) => (row.clientId === clientId ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (clientId: string) => {
    if (rows.length <= 1) return;
    onChangeRows(rows.filter((row) => row.clientId !== clientId));
  };

  const addRow = () => {
    const facilityId = rows[0]?.facilityId ?? facilities[0]?.id ?? "";
    onChangeRows([...rows, createEmptyAssignmentRow(facilityId)]);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
        {t("adminUsers.assignmentsSectionLabel")}
      </div>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px 0" }}>
        {t("adminUsers.assignmentsSectionHint")}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((row) => {
          const departments = departmentsByFacility[row.facilityId] ?? [];
          const { roleCode } = resolveRowRoleCode(row);
          const workspaceKey = workspacePreviewKeyForRow(row, departments);
          const workspaceLabel = t(workspaceKey);
          const showTechnicianType = row.profession === "TECHNICIAN";

          return (
            <div
              key={row.clientId}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 12,
                background: "#fafafa",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: showFacilityColumn
                    ? "1fr 1fr"
                    : "1fr 1fr",
                  gap: 10,
                }}
              >
                {showFacilityColumn ? (
                  <label style={{ display: "block", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{t("adminUsers.labelFacility")}</span>
                    <select
                      value={row.facilityId}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRow(row.clientId, {
                          facilityId: e.target.value,
                          departmentId: null,
                        })
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 4,
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    >
                      {facilities.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label style={{ display: "block", fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{t("adminUsers.labelProfession")}</span>
                  <select
                    value={row.profession}
                    disabled={disabled}
                    onChange={(e) =>
                      updateRow(row.clientId, {
                        profession: e.target.value as AdminProfessionCode | "",
                        technicianType: "",
                      })
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: 8,
                      border: "1px solid #ccc",
                      borderRadius: 4,
                    }}
                  >
                    <option value="">{t("adminUsers.selectProfession")}</option>
                    {ADMIN_PROFESSION_CODES.map((code) => (
                      <option key={code} value={code}>
                        {professionLabel(code, t)}
                      </option>
                    ))}
                  </select>
                </label>

                {showTechnicianType ? (
                  <label style={{ display: "block", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{t("adminUsers.labelTechnicianType")}</span>
                    <select
                      value={row.technicianType}
                      disabled={disabled}
                      onChange={(e) =>
                        updateRow(row.clientId, {
                          technicianType: e.target.value as TechnicianTypeCode | "",
                        })
                      }
                      style={{
                        display: "block",
                        width: "100%",
                        marginTop: 4,
                        padding: 8,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                      }}
                    >
                      <option value="">{t("adminUsers.selectTechnicianType")}</option>
                      {TECHNICIAN_TYPE_CODES.map((code) => (
                        <option key={code} value={code}>
                          {technicianTypeLabel(code, t)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label style={{ display: "block", fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{t("adminUsers.labelDepartment")}</span>
                  <select
                    value={row.departmentId ?? ""}
                    disabled={disabled || departmentsLoading}
                    onChange={(e) =>
                      updateRow(row.clientId, {
                        departmentId: e.target.value ? e.target.value : null,
                      })
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: 8,
                      border: "1px solid #ccc",
                      borderRadius: 4,
                    }}
                  >
                    <option value="">{t("adminUsers.noDepartmentOption")}</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {departmentDisplayLabel(dept, t)}
                      </option>
                    ))}
                  </select>
                  {!departmentsLoading && departments.length === 0 ? (
                    <p style={{ fontSize: 11, color: "#856404", margin: "6px 0 0 0" }}>
                      {t("adminUsers.departmentsNotConfiguredHint")}
                    </p>
                  ) : null}
                </label>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "#334155" }}>
                <div>
                  <strong>{t("adminUsers.resolvedRoleCodeLabel")}</strong>{" "}
                  {roleCode ? roleCode : t("adminUsers.resolvedRoleCodePending")}
                </div>
                <div style={{ marginTop: 4 }}>
                  <strong>{t("adminUsers.workspacePreviewLabel")}</strong> {workspaceLabel}
                </div>
              </div>

              {rows.length > 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeRow(row.clientId)}
                  style={{
                    marginTop: 10,
                    padding: "4px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 4,
                    background: "#fff",
                    fontSize: 12,
                    cursor: disabled ? "default" : "pointer",
                  }}
                >
                  {t("adminUsers.removeAssignmentRow")}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={addRow}
        style={{
          marginTop: 10,
          padding: "6px 12px",
          border: "1px dashed #94a3b8",
          borderRadius: 4,
          background: "#fff",
          fontSize: 13,
          cursor: disabled ? "default" : "pointer",
        }}
      >
        {t("adminUsers.addAssignmentRow")}
      </button>
    </div>
  );
}

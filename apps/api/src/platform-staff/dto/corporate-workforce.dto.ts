import { z } from "zod";
import { CORPORATE_DEPARTMENTS, EMPLOYEE_TYPES, EMPLOYMENT_STATUSES } from "../corporate-workforce.service";

export const workforceProfileSchema=z.object({
  department:z.enum(CORPORATE_DEPARTMENTS),
  jobTitle:z.string().trim().min(2).max(150),
  managerUserId:z.string().uuid().nullable().optional(),
  employeeType:z.enum(EMPLOYEE_TYPES).default("FULL_TIME"),
  employmentStatus:z.enum(EMPLOYMENT_STATUSES).default("ACTIVE"),
  startDate:z.string().min(8).max(40),
  endDate:z.string().min(8).max(40).nullable().optional(),
  reason:z.string().trim().min(3).max(500),
  ticketReference:z.string().trim().min(1).max(100).optional(),
}).strict();

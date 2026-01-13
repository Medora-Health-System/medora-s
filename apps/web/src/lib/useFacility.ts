"use client";

import { useState, useEffect } from "react";

const FACILITY_COOKIE_NAME = "medora_facility_id";

export function useFacility() {
  const [facilityId, setFacilityId] = useState<string>("");

  useEffect(() => {
    // Get from cookie
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${FACILITY_COOKIE_NAME}=`))
      ?.split("=")[1];
    
    if (cookieValue) {
      setFacilityId(cookieValue);
    }
  }, []);

  const setFacility = (id: string) => {
    setFacilityId(id);
    // Set cookie
    document.cookie = `${FACILITY_COOKIE_NAME}=${id}; path=/; max-age=${365 * 24 * 60 * 60}`;
  };

  return { facilityId, setFacility };
}


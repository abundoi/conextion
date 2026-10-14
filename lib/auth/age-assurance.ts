export interface AgeVerificationResult {
  isEligible: boolean;
  computedAge: number;
  reason?: string;
}

/**
 * Calculates exact calendar age given a birth date.
 * Rejects any applicant under 18 years of age.
 */
export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = referenceDate.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function verifyAgeEligibility(birthDateInput: string | Date): AgeVerificationResult {
  const birthDate = typeof birthDateInput === "string" ? new Date(birthDateInput) : birthDateInput;

  if (isNaN(birthDate.getTime())) {
    return {
      isEligible: false,
      computedAge: 0,
      reason: "Invalid date format provided.",
    };
  }

  const now = new Date();
  if (birthDate > now) {
    return {
      isEligible: false,
      computedAge: 0,
      reason: "Birthdate cannot be in the future.",
    };
  }

  const computedAge = calculateAge(birthDate, now);

  if (computedAge < 18) {
    return {
      isEligible: false,
      computedAge,
      reason: "Access restricted: Platform requires all members to be 18 years of age or older.",
    };
  }

  if (computedAge > 120) {
    return {
      isEligible: false,
      computedAge,
      reason: "Invalid birthdate: Exceeds reasonable human lifespan.",
    };
  }

  return {
    isEligible: true,
    computedAge,
  };
}

export const DEFAULT_UNLOCKED_UNIT_LIMIT = 10;
export const DEFAULT_OPEN_ASSESSMENTS = Object.freeze(['a1', 'a2', 'a3']);

function _unitNumber(unit = {}) {
  const match = String(unit?.id || '').match(/^u(\d+)$/i);
  return match ? Number(match[1]) : null;
}

export function isOpenByDefault(units = [], index = 0) {
  const safeIndex = Number(index);
  if (!Number.isInteger(safeIndex) || safeIndex < 0) return false;
  const unit = units[safeIndex];
  const ownNumber = _unitNumber(unit);
  if (ownNumber != null) return ownNumber <= DEFAULT_UNLOCKED_UNIT_LIMIT;

  if (unit?.isAssessment === true) {
    for (let i = safeIndex - 1; i >= 0; i -= 1) {
      const previousNumber = _unitNumber(units[i]);
      if (previousNumber != null) return previousNumber <= DEFAULT_UNLOCKED_UNIT_LIMIT;
    }
  }

  return false;
}

export function isAssessmentOpenByDefault(assessmentId = '') {
  return DEFAULT_OPEN_ASSESSMENTS.includes(String(assessmentId || '').trim().toLowerCase());
}

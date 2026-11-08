// Keep Oye's original keys so existing notes and best scores survive this upgrade.
function validId(campusId: string): string {
  if (!/^[a-z][a-z0-9-]{0,39}$/.test(campusId)) throw new Error('Invalid campus ID.');
  return campusId;
}
export function reviewNotesKey(campusId: string): string {
  return `fuoye-${validId(campusId)}-review-v1`;
}
export function courierScoreKey(campusId: string): string {
  return validId(campusId) === 'oye' ? 'fuoye-courier-best' : `fuoye-${campusId}-courier-best`;
}

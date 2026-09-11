export type Portal = 'assessment' | 'grader' | 'employer';
export function canAccessPortal(role: string, portal: Portal) {
  if (role === 'EMPLOYER_ADMIN' || role === 'SYSTEM_ADMIN') return true;
  return portal === 'assessment' ? role === 'APPLICANT' : portal === 'grader' && role === 'GRADER';
}
export function homeForRole(role: string) {
  return role === 'GRADER' ? '/grader' : role === 'EMPLOYER_ADMIN' || role === 'SYSTEM_ADMIN' ? '/employer' : '/assessment';
}

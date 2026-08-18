import { authService, canEditQuizLibrary } from './auth';
import { poemsService } from './poems';
import { idiomsService } from './idioms';
import { rosterService } from './roster';
import { assignmentsService } from './assignments';
import { historyService, clearHistoryFetchThrottle, calculateTotalPoints, getGemsHistorySync, getGemsSync, exchangePointsForGems } from './history';
import { progressService } from './progress';

export * from './types';
export * from './config';
export { canEditQuizLibrary, clearHistoryFetchThrottle, calculateTotalPoints, getGemsHistorySync, getGemsSync, exchangePointsForGems, idiomsService };

export const apiService = {
  // Auth
  login: authService.login.bind(authService),
  localLoginFallback: authService.localLoginFallback.bind(authService),
  provisionTeacher: authService.provisionTeacher.bind(authService),
  provisionStudent: authService.provisionStudent.bind(authService),
  getSession: authService.getSession.bind(authService),
  logout: authService.logout.bind(authService),

  // Poems
  getPoems: poemsService.getPoems.bind(poemsService),
  getCachedPoems: poemsService.getCachedPoems.bind(poemsService),
  seedQuizLibrary: poemsService.seedQuizLibrary.bind(poemsService),
  getQuizLibrary: poemsService.getQuizLibrary.bind(poemsService),
  saveQuizLibrary: poemsService.saveQuizLibrary.bind(poemsService),
  savePoemQuestions: poemsService.savePoemQuestions.bind(poemsService),
  getPoemQuestions: poemsService.getPoemQuestions.bind(poemsService),
  checkRemotePoemChanges: poemsService.checkRemotePoemChanges.bind(poemsService),
  applyRemotePoems: poemsService.applyRemotePoems.bind(poemsService),

  // Idioms
  getIdiomGroups: idiomsService.getIdiomGroups.bind(idiomsService),
  getCachedIdiomGroups: idiomsService.getCachedIdiomGroups.bind(idiomsService),
  getLocalIdiomGroups: idiomsService.getLocalIdiomGroups.bind(idiomsService),
  saveLocalIdiomGroups: idiomsService.saveLocalIdiomGroups.bind(idiomsService),
  saveIdiomQuestions: idiomsService.saveIdiomQuestions.bind(idiomsService),
  getIdiomGroupQuestions: idiomsService.getIdiomGroupQuestions.bind(idiomsService),
  checkRemoteIdiomChanges: idiomsService.checkRemoteIdiomChanges.bind(idiomsService),
  applyRemoteIdiomGroups: idiomsService.applyRemoteIdiomGroups.bind(idiomsService),

  // Roster (Classes, Teachers, Students)
  getClasses: rosterService.getClasses.bind(rosterService),
  getClassesSync: rosterService.getClassesSync.bind(rosterService),
  saveClasses: rosterService.saveClasses.bind(rosterService),
  addClass: rosterService.addClass.bind(rosterService),
  getTeachers: rosterService.getTeachers.bind(rosterService),
  saveTeachers: rosterService.saveTeachers.bind(rosterService),
  getStudents: rosterService.getStudents.bind(rosterService),
  saveStudents: rosterService.saveStudents.bind(rosterService),

  // Assignments
  getAssignments: assignmentsService.getAssignments.bind(assignmentsService),
  createAssignment: assignmentsService.createAssignment.bind(assignmentsService),
  markAssignmentCompletedBackend: assignmentsService.markAssignmentCompletedBackend.bind(assignmentsService),
  markAssignmentCompleted: assignmentsService.markAssignmentCompleted.bind(assignmentsService),

  // History & Quiz Results
  recordQuizResultBackend: historyService.recordQuizResultBackend.bind(historyService),
  clearHistoryFetchThrottle,
  getQuizHistory: historyService.getQuizHistory.bind(historyService),
  getQuizHistoryDetail: historyService.getQuizHistoryDetail.bind(historyService),
  calculateTotalPoints,
  getGemsHistorySync,
  getGemsSync,
  exchangePointsForGems,
  getQuizHistorySync: historyService.getQuizHistorySync.bind(historyService),
  recordQuizResult: historyService.recordQuizResult.bind(historyService),

  // Progress
  getLearntPoemIdsSync: progressService.getLearntPoemIdsSync.bind(progressService),
  getLearntPoemIds: progressService.getLearntPoemIds.bind(progressService),
  saveLearntPoemIdsToDB: progressService.saveLearntPoemIdsToDB.bind(progressService),
  togglePoemLearntStatus: progressService.togglePoemLearntStatus.bind(progressService)
};

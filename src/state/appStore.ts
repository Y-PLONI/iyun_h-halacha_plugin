import { createStore } from './createStore';
import { getDefaultWeek } from '../data/localData';
import { updateSettings } from './settingsStore';

export type ScreenName = 'schedule' | 'questions' | 'workspace';

interface AppStoreState {
  booted: boolean;
  screen: ScreenName;
  /** השבוע הפעיל בכל המסכים */
  activeWeekId: string | null;
  /** השאלה הנבחרת בתוך סביבת הכתיבה */
  activeQuestionId: string | null;
  settingsOpen: boolean;
  /** רוחב חלון נוכחי — לקביעת layout צר/רחב */
  isNarrow: boolean;
}

const initialWeek = getDefaultWeek();

export const appStore = createStore<AppStoreState>({
  booted: false,
  screen: 'schedule',
  activeWeekId: initialWeek?.weekId ?? null,
  activeQuestionId: null,
  settingsOpen: false,
  isNarrow: false,
});

export function setBooted(): void {
  appStore.set({ booted: true });
}

export function goToScreen(screen: ScreenName): void {
  appStore.set({ screen });
}

export function selectWeek(weekId: string): void {
  appStore.set({ activeWeekId: weekId, activeQuestionId: null });
  updateSettings({ lastOpenWeekId: weekId });
}

/** מעבר לסביבת כתיבה על שבוע (ואופציונלית שאלה). */
export function openWorkspace(weekId: string, questionId?: string): void {
  appStore.set({
    screen: 'workspace',
    activeWeekId: weekId,
    activeQuestionId: questionId ?? null,
  });
  updateSettings({ lastOpenWeekId: weekId });
}

export function openQuestionsScreen(weekId: string): void {
  appStore.set({ screen: 'questions', activeWeekId: weekId });
  updateSettings({ lastOpenWeekId: weekId });
}

export function selectQuestion(questionId: string): void {
  appStore.set({ activeQuestionId: questionId });
}

export function setSettingsOpen(open: boolean): void {
  appStore.set({ settingsOpen: open });
}

export function setIsNarrow(isNarrow: boolean): void {
  if (appStore.get().isNarrow !== isNarrow) appStore.set({ isNarrow });
}

export function useApp(): AppStoreState {
  return appStore.use((s) => s);
}

import { createStore } from './createStore';
import { getDefaultIssueId, getDefaultWeekForIssue } from '../data/localData';
import { updateSettings } from './settingsStore';

export type ScreenName = 'schedule' | 'questions' | 'workspace';

interface AppStoreState {
  booted: boolean;
  screen: ScreenName;
  /** הגליון הפעיל */
  activeIssueId: string;
  /** השבוע הפעיל בכל המסכים */
  activeWeekId: string | null;
  settingsOpen: boolean;
  /** רוחב חלון נוכחי — לקביעת layout צר/רחב */
  isNarrow: boolean;
}

const initialIssueId = getDefaultIssueId();
const initialWeek = getDefaultWeekForIssue(initialIssueId);

export const appStore = createStore<AppStoreState>({
  booted: false,
  screen: 'schedule',
  activeIssueId: initialIssueId,
  activeWeekId: initialWeek?.weekId ?? null,
  settingsOpen: false,
  isNarrow: false,
});

export function setBooted(): void {
  appStore.set({ booted: true });
}

export function goToScreen(screen: ScreenName): void {
  appStore.set({ screen });
}

/** מעבר לגליון אחר: מאפס לשבוע הראשון של הגליון ומציג את מסך ההספקים. */
export function setActiveIssue(issueId: string): void {
  const week = getDefaultWeekForIssue(issueId);
  appStore.set({ activeIssueId: issueId, activeWeekId: week?.weekId ?? null, screen: 'schedule' });
  updateSettings({ lastOpenIssueId: issueId, lastOpenWeekId: week?.weekId ?? '' });
}

export function selectWeek(weekId: string): void {
  appStore.set({ activeWeekId: weekId });
  updateSettings({ lastOpenWeekId: weekId });
}

/** מעבר לסביבת כתיבה על שבוע. */
export function openWorkspace(weekId: string): void {
  appStore.set({ screen: 'workspace', activeWeekId: weekId });
  updateSettings({ lastOpenWeekId: weekId });
}

export function openQuestionsScreen(weekId: string): void {
  appStore.set({ screen: 'questions', activeWeekId: weekId });
  updateSettings({ lastOpenWeekId: weekId });
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

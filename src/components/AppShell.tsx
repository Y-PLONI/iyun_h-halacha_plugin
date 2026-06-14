import { useApp, goToScreen, type ScreenName } from '../state/appStore';
import { TopBar } from './TopBar';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { QuestionsScreen } from '../screens/QuestionsScreen';
import { WorkspaceScreen } from '../screens/WorkspaceScreen';
import { SettingsDialog } from '../screens/SettingsDialog';

const NAV: { id: ScreenName; label: string }[] = [
  { id: 'schedule', label: 'הספקים' },
  { id: 'questions', label: 'שאלות' },
  { id: 'workspace', label: 'כתיבת תשובות' },
];

export function AppShell() {
  const app = useApp();

  return (
    <div className="app-shell">
      <TopBar />
      <nav className="nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-btn${app.screen === n.id ? ' active' : ''}`}
            onClick={() => goToScreen(n.id)}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <div className={`content${app.screen === 'workspace' ? ' no-scroll' : ''}`}>
        {app.screen === 'schedule' && <ScheduleScreen />}
        {app.screen === 'questions' && <QuestionsScreen />}
        {app.screen === 'workspace' && <WorkspaceScreen />}
      </div>
      {app.settingsOpen && <SettingsDialog />}
    </div>
  );
}

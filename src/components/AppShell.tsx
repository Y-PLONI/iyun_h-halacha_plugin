import { useApp } from '../state/appStore';
import { TopBar } from './TopBar';
import { ScheduleScreen } from '../screens/ScheduleScreen';
import { QuestionsScreen } from '../screens/QuestionsScreen';
import { WorkspaceScreen } from '../screens/WorkspaceScreen';
import { SettingsDialog } from '../screens/SettingsDialog';

export function AppShell() {
  const app = useApp();

  return (
    <div className="app-shell">
      <TopBar />
      <div className={`content${app.screen === 'workspace' ? ' no-scroll' : ''}`}>
        {app.screen === 'schedule' && <ScheduleScreen />}
        {app.screen === 'questions' && <QuestionsScreen />}
        {app.screen === 'workspace' && <WorkspaceScreen />}
      </div>
      {app.settingsOpen && <SettingsDialog />}
    </div>
  );
}

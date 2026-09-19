import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Alerts } from './pages/Alerts';
import { Incidents } from './pages/Incidents';
import { IncidentDetails } from './pages/IncidentDetails';
import { ThreatIntelligence } from './pages/ThreatIntelligence';
import { Mitre } from './pages/Mitre';
import { AIInvestigation } from './pages/AIInvestigation';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<IncidentDetails />} />
        <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
        <Route path="/mitre" element={<Mitre />} />
        <Route path="/ai-investigation/:incidentId" element={<AIInvestigation />} />
        <Route path="/ai-investigation" element={<AIInvestigation />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        {/* Default route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Alerts } from './pages/Alerts';
import { Incidents } from './pages/Incidents';
import { IncidentDetails } from './pages/IncidentDetails';
import { ThreatIntelligence } from './pages/ThreatIntelligence';
import { Mitre } from './pages/Mitre';
import { BobInvestigation } from './pages/BobInvestigation';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { ThreatProvider } from './store/ThreatStore';

export function App() {
  return (
    <ThreatProvider>
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/incidents/:id" element={<IncidentDetails />} />
        <Route path="/threat-intelligence" element={<ThreatIntelligence />} />
        <Route path="/mitre" element={<Mitre />} />
        <Route path="/bob-investigation/:incidentId" element={<BobInvestigation />} />
        <Route path="/bob-investigation" element={<Navigate to="/bob-investigation/INC-042" replace />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        {/* Default route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
    </ThreatProvider>
  );
}

export default App;

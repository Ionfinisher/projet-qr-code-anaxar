// Fonctionnalité « guérite » : application des agents (application distincte de la plateforme).
export { ControlePage } from './pages/ControlePage.jsx';
export { ArriveesPage } from './pages/ArriveesPage.jsx';
export { SupervisionPage } from './pages/SupervisionPage.jsx';
export { GateLoginPage } from './pages/GateLoginPage.jsx';
export { PostPickerPage } from './pages/PostPickerPage.jsx';
export { GateSessionProvider, useGateSession } from './GateSession.jsx';
export { gateApi, useGateApi } from './api.js';
export { gateArrivals, countAtGate } from './selectors.js';
export { ScanPanel } from './components/ScanPanel.jsx';
export { ScanResult } from './components/ScanResult.jsx';
export { LiveScanner } from './components/LiveScanner.jsx';
export { PostGrid } from './components/PostGrid.jsx';
export { PostBadge } from './components/PostBadge.jsx';
export { Clock } from './components/Clock.jsx';
export { showGateOverlay } from './components/gateOverlay.js';

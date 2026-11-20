import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { CommandCenter } from './pages/CommandCenter';
import { SatelliteExplorer } from './pages/SatelliteExplorer';
import { EnvironmentalAnalytics } from './pages/EnvironmentalAnalytics';
import { AnomalyDetection } from './pages/AnomalyDetection';
import { ForecastingEngine } from './pages/ForecastingEngine';
import { LandCoverSegmentation } from './pages/LandCoverSegmentation';
import { ActionPlan } from './pages/ActionPlan';

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<CommandCenter />} />
              <Route path="/satellite" element={<SatelliteExplorer />} />
              <Route path="/analytics" element={<EnvironmentalAnalytics />} />
              <Route path="/anomalies" element={<AnomalyDetection />} />
              <Route path="/forecasting" element={<ForecastingEngine />} />
              <Route path="/segmentation" element={<LandCoverSegmentation />} />
              <Route path="/action-plan" element={<ActionPlan />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

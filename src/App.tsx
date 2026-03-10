import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LearningPage } from './pages/LearningPage';
import { Daily10Page } from './pages/Daily10Page';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/learn/:episodeId" element={<LearningPage />} />
        <Route path="/daily10" element={<Daily10Page />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

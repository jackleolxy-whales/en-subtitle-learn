import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LearningPage } from './pages/LearningPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/learn/:episodeId" element={<LearningPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

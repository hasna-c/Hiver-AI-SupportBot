import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import PartA from './components/PartA';
import PartB from './components/PartB';
import PartC from './components/PartC';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/part-a" element={<PartA />} />
          <Route path="/part-b" element={<PartB />} />
          <Route path="/part-c" element={<PartC />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;

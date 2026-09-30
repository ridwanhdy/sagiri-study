import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProgressProvider } from './context/ProgressContext.jsx';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Hiragana from './pages/Hiragana.jsx';
import Learn from './pages/Learn.jsx';
import Quiz from './pages/Quiz.jsx';
import Results from './pages/Results.jsx';
import Difficult from './pages/Difficult.jsx';
import Progress from './pages/Progress.jsx';
import Settings from './pages/Settings.jsx';
import Writing from './pages/Writing.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><HashRouter><ProgressProvider><Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="hiragana" element={<Hiragana/>}/><Route path="belajar/:groupId" element={<Learn/>}/><Route path="menulis" element={<Writing/>}/><Route path="kuis/:mode" element={<Quiz/>}/><Route path="hasil/:id" element={<Results/>}/><Route path="huruf-sulit" element={<Difficult/>}/><Route path="progres" element={<Progress/>}/><Route path="pengaturan" element={<Settings/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></ProgressProvider></HashRouter></React.StrictMode>);

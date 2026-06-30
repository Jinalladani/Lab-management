import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SampleList from './SampleList';
import SampleEntry from './SampleEntry';
import SampleView from './SampleView';

const Samples = () => {
  return (
    <Routes>
      <Route path="/" element={<SampleList />} />
      <Route path="/entry" element={<SampleEntry />} />
      <Route path="/edit/:id" element={<SampleEntry />} />
      <Route path="/view/:id" element={<SampleView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Samples;

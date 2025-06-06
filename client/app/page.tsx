'use client'; 

import { useEffect, useState } from 'react';

export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/test')
      .then((res) => res.json())
      .then((data) => setData(data))
      .catch((err) => console.error(err));
  }, []);

  return (
    <div>
      <h1>Adhyayan AI</h1>
      <p>Welcome to the Adhyayan AI!</p>
      {data ? (
        <p>Backend Response: {data.message} at {data.time}</p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
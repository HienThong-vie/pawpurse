import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState<string>(""); // this line store API message
  const [loading, setLoading] = useState<boolean>(true); //loading state

  useEffect(() => {
    const fetchData = async () => {
      const reponse = await fetch("http://localhost:8000/");
      const data = await reponse.json();
      setMessage(data.message);
      setLoading(false);
    };
    fetchData();
  }, []);
  return (
    <>
      {loading ? (
        /*if true*/ <p>Loading...</p>
      ) : (
        /* if false */ <p>{message}</p>
      )}
    </>
  );
}

export default App;

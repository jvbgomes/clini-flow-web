import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const { logout } = useAuth();

  useEffect(() => {
    api.get('/patients').then((response) => {
      setPatients(response.data);
    });
  }, []);

  return (
    <div>
      <h1>Patients</h1>
      <button onClick={logout}>Log out</button>
      <ul>
        {patients.map((patient) => (
          <li key={patient.id}>
            {patient.name} — {patient.cpf}
          </li>
        ))}
      </ul>
    </div>
  );
}
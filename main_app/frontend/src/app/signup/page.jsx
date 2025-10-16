'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiBaseUrl } from '../../utils/apiConfig';

const colleges = [
  "Amrita Vishwa Vidyapeetham",
  "Anna University",
  "Ashoka University",
  "Banaras Hindu University (BHU)",
  "BITS Pilani",
  "Christ University (Bangalore)",
  "Delhi University (DU)",
  "FMS Delhi",
  "IIM Ahmedabad",
  "IIM Bangalore",
  "IIM Calcutta",
  "IIM Lucknow",
  "IIIT Allahabad",
  "IIIT Bangalore",
  "IIIT Delhi",
  "IIIT Hyderabad",
  "IIIT Pune",
  "IIT Bombay",
  "IIT Delhi",
  "IIT Hyderabad",
  "IIT Kanpur",
  "IIT Kharagpur",
  "IIT Madras",
  "IIT Roorkee",
  "Indian School of Business (ISB Hyderabad)",
  "Jamia Millia Islamia",
  "Jawaharlal Nehru University (JNU)",
  "Jain University",
  "Manipal University",
  "NIT Calicut",
  "NIT Rourkela",
  "NIT Surathkal",
  "NIT Trichy",
  "NIT Warangal",
  "Osmania University",
  "Shiv Nadar University",
  "SRM Institute of Science and Technology",
  "Symbiosis International University (Pune)",
  "University of Calcutta",
  "University of Hyderabad",
  "University of Mumbai",
  "VIT Vellore",
  "XLRI Jamshedpur"
];

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [conpassword, setConpassword] = useState('');
  const [role] = useState('STUDENT');
  const [dropdown, setDropdown] = useState(false);
  const passref = useRef(null);

  const filtered = colleges.filter(col =>
    col.toLowerCase().includes(college.toLowerCase())
  );

const handleSubmit = async (e) => {
  e.preventDefault();

  if (password !== conpassword) {
    alert('Passwords must match');
    return;
  }

  const role = 'STUDENT';

  try {
    const res = await axios.post(`${getApiBaseUrl()}/api/auth/register/student/`, {
      email,
      password,
      first_name: email.split('@')[0],
      last_name: '',
      student_id: 'TEMP123',
      contact_email: email,
      branch: 'CSE',
      gpa: '8.5',
      college: 1, // Replace with actual ID if dynamic
    });

    // 💾 Save to localStorage
    localStorage.setItem('userEmail', email);
    localStorage.setItem('collegeName', college);
    localStorage.setItem('role', role);

    // 🍪 Save to cookie
    document.cookie = `role=${role}; path=/; max-age=86400`;

    alert('Signup successful');
    router.push('/login');
  } catch (err) {
    alert(err.response?.data?.message || 'Signup failed');
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-r from-[#242734] to-[#241F2A] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-xl shadow-2xl p-10 flex flex-col gap-6"
      >
        <h1 className="text-center text-2xl text-gray-800 font-bold mb-2">SIGNUP</h1>

        <div className="flex flex-col">
          <label className="mb-2 font-semibold text-gray-800">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg border border-gray-300 text-gray-800 text-base outline-none"
            required
          />
        </div>

        <div className="flex flex-col relative">
          <label className="mb-2 font-semibold text-gray-800">College Name</label>
          <input
            type="text"
            value={college}
            onChange={(e) => {
              setCollege(e.target.value);
              setDropdown(e.target.value.trim() !== '');
            }}
            className="p-3 rounded-lg border border-gray-300 text-gray-800 text-base outline-none"
            required
          />
          {dropdown && filtered.length > 0 && (
            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
              {filtered.map((element, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setCollege(element);
                    setDropdown(false);
                  }}
                  className="cursor-pointer px-4 py-2 hover:bg-blue-100 text-gray-700 border-b border-gray-100"
                >
                  {element}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <label className="mb-2 font-semibold text-gray-800">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 rounded-lg border border-gray-300 text-gray-800 text-base outline-none"
            required
          />
        </div>

        <div className="flex flex-col">
          <label className="mb-2 font-semibold text-gray-800">Confirm Password</label>
          <input
            type="password"
            value={conpassword}
            ref={passref}
            onChange={(e) => setConpassword(e.target.value)}
            className="p-3 rounded-lg border border-gray-300 text-gray-800 text-base outline-none"
            required
          />
        </div>

        {conpassword && password !== conpassword && (
          <div className="text-red-400 text-sm -mt-3">
            Passwords must match.
          </div>
        )}

        <button
          type="submit"
          disabled={!password || password !== conpassword}
          className="p-3 rounded-lg bg-indigo-500 text-white text-base font-medium hover:bg-indigo-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Signup
        </button>
      </form>
    </div>
  );
}

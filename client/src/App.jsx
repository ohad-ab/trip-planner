import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/login';
import { useEffect } from 'react';
import axios from 'axios';
import {port} from '../config';
import Register from './pages/Register';
import TripPage from './pages/TripPage';

function App() {

  const navigate = useNavigate();
  const location = useLocation();
  useEffect(()=>{
    axios.get(port,{withCredentials:true}).then((response)=>{
      if(response.data.user){
        if(location.pathname === '/login' || location.pathname === '/register')
          navigate('/');
        else{
          ;
        }

      }
      else if(location.pathname !== '/register'){
        navigate('/login');
      }
      
    })
  },[]);

  function handleLogout(e){
    e.preventDefault();
   
      axios.post(port+'/logout',{}, {withCredentials: true}).then((response)=>{
      if(response.data.success)
        {
          console.log("logout")
          navigate('/login')
        }
      else{
        alert(response.data.message)
      }
      }).catch((error)=>{
        alert(error);
      })
  }

  return (
    <>
    {!(location.pathname === '/login' || location.pathname === '/register')?<button onClick={handleLogout}>Logout</button>:""}
    
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/trips/:id" element={<TripPage />} />
      <Route path="/login" element={<Login />}/>
      <Route path="/register" element={<Register />}/>
    </Routes>
    </>
    
  );
}

export default App;

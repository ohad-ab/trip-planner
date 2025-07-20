import { useEffect, useState } from "react";
import { port } from "../../config";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login(){
  const[isAuth, setIsAuth] = useState(true)
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  useEffect(()=>{
    axios(port,{withCredentials:true}).then((response)=>{
      if(response.data.user){
        navigate('/');
      }
      else{
        setIsAuth(false)
      }
    })
  },[]);

  function handleLogin(e){
    e.preventDefault();
   
      axios.post(port+'/login', {username: email, password: password}, {withCredentials: true}).then((response)=>{
      if(response.data.success)
        {
          // props.onLogin(response.data.user.name)
          navigate('/')
        }
      else{
        alert(response.data.message)
      }
      }).catch((error)=>{
        alert(error);
      })
    }

  return !isAuth && (
    <>
      <h2>LOGIN</h2>
      <form>
        <input value={email} placeholder="Email" onChange={(e)=>setEmail(e.target.value)}/>
        <input value={password} placeholder="Password" onChange={(e)=>setPassword(e.target.value)}/>
        <button onClick={handleLogin}>Login</button>
      </form>
      <button onClick={()=>navigate('/register')}>Resgister</button>

    </>
  )
}

export default Login;
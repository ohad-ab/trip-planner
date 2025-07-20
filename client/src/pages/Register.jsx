import { useEffect, useState } from "react";
import { port } from "../../config";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register(){
  const[isAuth, setIsAuth] = useState(true)
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [email, setEmail] = useState('');
  useEffect(()=>{
    axios(port,{withCredentials:true}).then((response)=>{
      if(response.data.user){
        navigate('/');
      }
      else{
        setIsAuth(false)
      }
    })
  },[])

  function handleSubmit(e){
    e.preventDefault();
    if(password !== repeatPassword)
      alert("Please repeat the password correctly");
    else{
      axios.post(port+'/register', {username: username, password: password, repeatedPassword: repeatPassword ,email:email}, {withCredentials: true}).then((response)=>{
      if(response.data.success){
        // props.onLogin(response.data.user.name);
        navigate('/')
      }
      else{
        alert(response.data.message)
      }
      }).catch((error)=>{
        alert(error);
      })
    }
  }

  return !isAuth && (
    <>
      <h2>REGISTER</h2>
      <form>
        <input onChange={(e)=>setUsername(e.target.value)} value={username} placeholder="User Name"/>
        <input onChange={(e)=>setEmail(e.target.value)} value={email} placeholder="Email"/>
        <input onChange={(e)=>setPassword(e.target.value)} value={password} placeholder="Password"/>
        <input onChange={(e)=>setRepeatPassword(e.target.value)} value={repeatPassword} placeholder="Repeat Password"/>
        <button onClick={handleSubmit}>Submit</button>
      </form>
    </>
  )
}

export default Register;